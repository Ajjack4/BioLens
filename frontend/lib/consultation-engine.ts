/**
 * Consultation Engine for BioLens Application
 * Central orchestrator for the Gemini consultation process
 * Handles input validation, data processing, and consultation generation
 */

import { AnalysisResult, DetectedCondition } from './api-client'
import { GeminiAPIClient, GeminiRequest, GeminiResponse } from './gemini-client'
import { getMedicalPromptBuilder } from './medical-prompt-builder'
import { getResponseProcessor, processGeminiResponse } from './response-processor'
import { getOfflineConsultationEngine, generateOfflineConsultation } from './offline-consultation'

export interface ConsultationInput {
  analysisResult: AnalysisResult
  symptoms: string
  sessionId: string
  timestamp: Date
  userAgent?: string
}

export interface ConsultationResponse {
  consultation: {
    conditionAssessment: string
    symptomCorrelation: string
    recommendations: string[]
    urgencyLevel: 'immediate' | 'within_week' | 'routine' | 'monitor'
    educationalInfo: string
    medicalDisclaimer: string
  }
  metadata: {
    modelUsed: string
    processingTime: number
    confidenceScore: number
    fallbackUsed: boolean
    safetyValidated: boolean
  }
  emergencyContacts?: EmergencyContact[]
}

export interface EmergencyContact {
  type: 'emergency' | 'urgent_care' | 'dermatologist'
  name: string
  phone: string
  description: string
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface RiskLevel {
  level: 'low' | 'moderate' | 'high'
  factors: string[]
  requiresUrgentCare: boolean
}

/**
 * Circuit breaker for API failure management
 */
class CircuitBreaker {
  private failureCount: number = 0
  private lastFailureTime: number = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  
  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'half-open'
      } else {
        throw new Error('Circuit breaker is open - service temporarily unavailable')
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    this.failureCount = 0
    this.state = 'closed'
  }

  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open'
    }
  }

  getState(): string {
    return this.state
  }

  reset(): void {
    this.failureCount = 0
    this.state = 'closed'
    this.lastFailureTime = 0
  }
}

/**
 * Central orchestrator for the consultation process
 * Validates input, processes data, and generates consultation responses
 */
export class ConsultationEngine {
  private geminiClient: GeminiAPIClient
  private maxRetries: number = 3
  private retryDelay: number = 1000 // Base delay in milliseconds
  private circuitBreaker: CircuitBreaker
  private errorHistory: Array<{ timestamp: number; error: string; category: string }> = []
  private maxErrorHistory: number = 100
  private promptBuilder: ReturnType<typeof getMedicalPromptBuilder>

  constructor(geminiClient: GeminiAPIClient) {
    this.geminiClient = geminiClient
    this.circuitBreaker = new CircuitBreaker(5, 60000) // 5 failures, 1 minute recovery
    this.promptBuilder = getMedicalPromptBuilder()
  }

  /**
   * Main entry point for consultation generation
   * Orchestrates the entire consultation process from input to response
   */
  async generateConsultation(
    analysisResult: AnalysisResult,
    symptoms: string,
    sessionId: string
  ): Promise<ConsultationResponse> {
    const startTime = Date.now()
    
    try {
      // Step 1: Validate and sanitize input
      const consultationInput: ConsultationInput = {
        analysisResult,
        symptoms: this.sanitizeSymptoms(symptoms),
        sessionId,
        timestamp: new Date(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
      }

      const validation = this.validateInput(consultationInput)
      if (!validation.valid) {
        throw new Error(`Input validation failed: ${validation.errors.join(', ')}`)
      }

      // Step 2: Extract and structure data for processing
      const structuredData = this.extractStructuredData(consultationInput)
      
      // Step 3: Assess risk level
      const riskLevel = this.assessRiskLevel(consultationInput.analysisResult)

      // Step 4: Attempt to generate consultation with Gemini using circuit breaker
      let consultationResult: ConsultationResponse
      let fallbackUsed = false

      try {
        consultationResult = await this.circuitBreaker.execute(async () => {
          return await this.generateGeminiConsultation(structuredData, riskLevel, consultationInput)
        })
        console.log('✅ Gemini consultation generated successfully')
      } catch (error) {
        console.warn('⚠️ Gemini consultation failed, using fallback:', error)
        this.recordError(error as Error)
        consultationResult = this.handleFallback(error as Error, consultationInput)
        fallbackUsed = true
      }

      // Step 5: Update metadata
      const processingTime = Date.now() - startTime
      consultationResult.metadata = {
        ...consultationResult.metadata,
        processingTime,
        fallbackUsed
      }

      return consultationResult

    } catch (error) {
      console.error('Consultation generation failed:', error)
      
      // Return error consultation response
      return this.createErrorConsultation(
        error as Error,
        Date.now() - startTime,
        sessionId
      )
    }
  }

  /**
   * Validates input data for safety and format requirements
   */
  validateInput(data: ConsultationInput): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate analysis result
    if (!data.analysisResult) {
      errors.push('Analysis result is required')
    } else {
      if (!data.analysisResult.predictions || data.analysisResult.predictions.length === 0) {
        errors.push('Analysis result must contain predictions')
      }
      
      if (!data.analysisResult.topPrediction) {
        warnings.push('No top prediction available')
      }
      
      if (data.analysisResult.overallConfidence < 0 || data.analysisResult.overallConfidence > 1) {
        errors.push('Invalid confidence score')
      }
    }

    // Validate session ID
    if (!data.sessionId || data.sessionId.trim().length === 0) {
      errors.push('Session ID is required')
    }

    // Validate symptoms (optional but should be sanitized if provided)
    if (data.symptoms && data.symptoms.length > 5000) {
      warnings.push('Symptom description is very long and may be truncated')
    }

    // Validate timestamp
    if (!data.timestamp || isNaN(data.timestamp.getTime())) {
      errors.push('Valid timestamp is required')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Sanitizes user-provided symptom descriptions
   * Removes potentially harmful content while preserving medical relevance
   */
  private sanitizeSymptoms(symptoms: string): string {
    if (!symptoms || typeof symptoms !== 'string') {
      return ''
    }

    // Trim and normalize whitespace
    let sanitized = symptoms.trim().replace(/\s+/g, ' ')

    // Remove potentially harmful patterns
    const harmfulPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
      /<[^>]*>/g, // HTML tags
      /javascript:/gi, // JavaScript protocols
      /data:/gi, // Data URLs
      /vbscript:/gi, // VBScript
      /on\w+\s*=/gi, // Event handlers
    ]

    harmfulPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '')
    })

    // Limit length
    if (sanitized.length > 2000) {
      sanitized = sanitized.substring(0, 2000) + '...'
    }

    return sanitized
  }

  /**
   * Extracts and structures data for processing pipeline
   */
  private extractStructuredData(input: ConsultationInput): any {
    const { analysisResult, symptoms } = input

    return {
      predictions: analysisResult.predictions.map(pred => ({
        condition: pred.condition,
        confidence: pred.confidence,
        severity: pred.severity,
        category: pred.category,
        requiresAttention: pred.requiresAttention,
        description: pred.description
      })),
      topPrediction: {
        name: analysisResult.topPrediction,
        confidence: analysisResult.overallConfidence,
        riskLevel: analysisResult.riskLevel
      },
      symptoms: {
        raw: symptoms,
        processed: this.processSymptoms(symptoms),
        isEmpty: !symptoms || symptoms.trim().length === 0
      },
      context: {
        modelUsed: analysisResult.processingInfo.modelUsed,
        imageProcessed: analysisResult.processingInfo.imageProcessed,
        symptomsIncluded: analysisResult.processingInfo.symptomsIncluded
      }
    }
  }

  /**
   * Processes symptoms for better analysis
   */
  private processSymptoms(symptoms: string): any {
    if (!symptoms || symptoms.trim().length === 0) {
      return {
        keywords: [],
        severity: 'unknown',
        duration: 'unknown',
        location: 'unknown'
      }
    }

    const symptomsLower = symptoms.toLowerCase()
    
    // Extract keywords
    const keywords: string[] = []
    const symptomKeywords = [
      'itch', 'itchy', 'scratch', 'scratching',
      'pain', 'painful', 'hurt', 'hurts',
      'burn', 'burning', 'sting', 'stinging',
      'red', 'redness', 'inflamed', 'swollen',
      'dry', 'flaky', 'scaly', 'peeling',
      'bump', 'bumps', 'lump', 'lumps',
      'rash', 'spots', 'patches', 'lesion'
    ]

    symptomKeywords.forEach(keyword => {
      if (symptomsLower.includes(keyword)) {
        keywords.push(keyword)
      }
    })

    // Assess severity indicators
    let severity = 'mild'
    const severeIndicators = ['severe', 'intense', 'unbearable', 'extreme', 'very']
    const moderateIndicators = ['moderate', 'noticeable', 'bothersome']
    
    if (severeIndicators.some(indicator => symptomsLower.includes(indicator))) {
      severity = 'severe'
    } else if (moderateIndicators.some(indicator => symptomsLower.includes(indicator))) {
      severity = 'moderate'
    }

    // Extract duration if mentioned
    let duration = 'unknown'
    if (symptomsLower.includes('day') || symptomsLower.includes('today')) {
      duration = 'days'
    } else if (symptomsLower.includes('week')) {
      duration = 'weeks'
    } else if (symptomsLower.includes('month')) {
      duration = 'months'
    } else if (symptomsLower.includes('year')) {
      duration = 'years'
    }

    return {
      keywords,
      severity,
      duration,
      location: 'skin' // Default for skin analysis
    }
  }

  /**
   * Assesses risk level based on analysis results
   */
  private assessRiskLevel(analysisResult: AnalysisResult): RiskLevel {
    const factors: string[] = []
    let requiresUrgentCare = false

    // Check for high-risk conditions
    const highRiskConditions = ['melanoma', 'carcinoma', 'cancer']
    const topCondition = analysisResult.topPrediction.toLowerCase()
    
    if (highRiskConditions.some(condition => topCondition.includes(condition))) {
      factors.push('Potential malignant condition detected')
      requiresUrgentCare = true
    }

    // Check confidence and severity
    if (analysisResult.overallConfidence > 0.8) {
      factors.push('High confidence prediction')
    }

    // Check for conditions requiring attention
    const attentionRequired = analysisResult.predictions.some(pred => pred.requiresAttention)
    if (attentionRequired) {
      factors.push('Condition requires medical attention')
    }

    // Determine overall risk level
    let level: 'low' | 'moderate' | 'high' = analysisResult.riskLevel

    // Override based on specific factors
    if (requiresUrgentCare) {
      level = 'high'
    }

    return {
      level,
      factors,
      requiresUrgentCare
    }
  }

  /**
   * Generates consultation using Gemini API with retry logic
   */
  private async generateGeminiConsultation(
    structuredData: any,
    riskLevel: RiskLevel,
    input: ConsultationInput
  ): Promise<ConsultationResponse> {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Initialize Gemini client if not ready
        if (!this.geminiClient.isReady()) {
          const initialized = await this.geminiClient.initialize()
          if (!initialized) {
            throw new Error('Failed to initialize Gemini client')
          }
        }

        // Create consultation request (will be enhanced with prompt builder)
        const request = this.createConsultationRequest(structuredData, riskLevel, input)
        
        // Send request to Gemini
        const response = await this.geminiClient.sendConsultationRequest(request)
        
        if (!response.success) {
          throw new Error(response.error || 'Gemini API request failed')
        }

        // Process and validate response
        return this.processGeminiResponse(response, input)

      } catch (error) {
        lastError = error as Error
        console.warn(`Gemini consultation attempt ${attempt} failed:`, error)

        // Handle specific error types
        if (this.isRateLimitError(error)) {
          await this.handleRateLimit(error)
          continue // Retry after rate limit handling
        }

        if (this.isAuthenticationError(error)) {
          throw error // Don't retry auth errors
        }

        // Exponential backoff for other errors
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1)
          console.log(`Retrying in ${delay}ms...`)
          await this.sleep(delay)
        }
      }
    }

    // All retries failed, throw the last error
    throw lastError || new Error('All Gemini consultation attempts failed')
  }

  /**
   * Creates a consultation request for Gemini API using MedicalPromptBuilder
   */
  private createConsultationRequest(
    structuredData: any,
    riskLevel: RiskLevel,
    input: ConsultationInput
  ): any {
    // Use the medical prompt builder to create a proper medical consultation prompt
    const promptResult = this.promptBuilder.buildConsultationPromptWithRiskAssessment(
      structuredData.predictions,
      input.symptoms,
      riskLevel,
      input.analysisResult
    )
    
    // Validate the prompt for safety and completeness
    const validation = this.promptBuilder.validatePrompt(promptResult)
    if (!validation.valid) {
      console.warn('Prompt validation issues:', validation.issues)
    }
    
    return {
      prompt: promptResult.userPrompt,
      systemInstruction: promptResult.systemInstruction,
      context: {
        sessionId: input.sessionId,
        timestamp: input.timestamp,
        riskLevel: riskLevel.level,
        highRiskAssessment: promptResult.highRiskAssessment,
        safetyInstructions: promptResult.safetyInstructions
      }
    }
  }

  /**
   * Creates a basic medical consultation prompt
   */
  private createBasicPrompt(structuredData: any, riskLevel: RiskLevel, input: ConsultationInput): string {
    const { predictions, symptoms } = structuredData
    const topPrediction = predictions[0]
    
    let prompt = `Medical Consultation Request:\n\n`
    
    prompt += `**Analysis Results:**\n`
    prompt += `- Primary condition: ${topPrediction.condition} (${(topPrediction.confidence * 100).toFixed(1)}% confidence)\n`
    prompt += `- Severity: ${topPrediction.severity}\n`
    prompt += `- Category: ${topPrediction.category}\n`
    prompt += `- Risk level: ${riskLevel.level}\n\n`
    
    if (symptoms.raw && !symptoms.isEmpty) {
      prompt += `**Patient-reported symptoms:**\n${symptoms.raw}\n\n`
    }
    
    if (predictions.length > 1) {
      prompt += `**Alternative possibilities:**\n`
      predictions.slice(1, 3).forEach((pred: any, index: number) => {
        prompt += `${index + 2}. ${pred.condition} (${(pred.confidence * 100).toFixed(1)}%)\n`
      })
      prompt += `\n`
    }
    
    prompt += `Please provide a structured medical consultation response including:\n`
    prompt += `1. Condition Assessment\n`
    prompt += `2. Symptom Correlation\n`
    prompt += `3. Personalized Recommendations\n`
    prompt += `4. Urgency Level\n`
    prompt += `5. Educational Information\n`
    
    return prompt
  }

  /**
   * Gets system instruction for medical consultation
   */
  private getSystemInstruction(): string {
    return `You are a medical AI assistant providing supplementary health information. 
    You must NOT provide definitive diagnoses or replace professional medical care.
    Always emphasize that this is supplementary information only and encourage users to consult healthcare professionals.
    For high-risk conditions, emphasize immediate medical attention.
    Include appropriate medical disclaimers in your response.`
  }

  /**
   * Processes Gemini API response into consultation format using ResponseProcessor
   */
  private async processGeminiResponse(response: GeminiResponse, input: ConsultationInput): Promise<ConsultationResponse> {
    try {
      // Use the dedicated ResponseProcessor for safety validation and formatting
      const processedResponse = await processGeminiResponse(response, input)
      console.log('✅ Response processed successfully with safety validation')
      return processedResponse
    } catch (error) {
      console.error('⚠️ Response processing failed, using basic processing:', error)
      
      // Fallback to basic processing if ResponseProcessor fails
      return this.processGeminiResponseBasic(response, input)
    }
  }

  /**
   * Basic response processing as fallback
   */
  private processGeminiResponseBasic(response: any, input: ConsultationInput): ConsultationResponse {
    const content = response.content || ''
    
    // Parse structured response (basic implementation)
    const consultation = this.parseConsultationContent(content, input)
    
    return {
      consultation,
      metadata: {
        modelUsed: response.metadata?.modelUsed || 'gemini-1.5-pro',
        processingTime: response.metadata?.processingTime || 0,
        confidenceScore: input.analysisResult.overallConfidence,
        fallbackUsed: false,
        safetyValidated: this.validateSafety(consultation)
      },
      emergencyContacts: this.getEmergencyContacts(input.analysisResult.riskLevel)
    }
  }

  /**
   * Parses consultation content from Gemini response
   */
  private parseConsultationContent(content: string, input: ConsultationInput): any {
    // Basic parsing - will be enhanced with proper response processor
    return {
      conditionAssessment: this.extractSection(content, 'assessment') || 
        this.generateFallbackAssessment(input.analysisResult),
      symptomCorrelation: this.extractSection(content, 'symptom') || 
        this.generateSymptomCorrelation(input.symptoms, input.analysisResult),
      recommendations: this.extractRecommendations(content) || 
        this.generateFallbackRecommendations(input.analysisResult, input.symptoms),
      urgencyLevel: this.extractUrgencyLevel(content) || 
        this.determineUrgencyLevel(input.analysisResult),
      educationalInfo: this.extractSection(content, 'educational') || 
        this.generateEducationalInfo(input.analysisResult.predictions[0]),
      medicalDisclaimer: this.getMedicalDisclaimer()
    }
  }

  /**
   * Extracts a section from consultation content
   */
  private extractSection(content: string, sectionType: string): string | null {
    // Simple extraction - will be enhanced with proper parsing
    const lines = content.split('\n')
    const sectionStart = lines.findIndex(line => 
      line.toLowerCase().includes(sectionType) && line.includes(':')
    )
    
    if (sectionStart === -1) return null
    
    let sectionContent = ''
    for (let i = sectionStart + 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line.startsWith('**') || line.startsWith('#')) break
      if (line) sectionContent += line + ' '
    }
    
    return sectionContent.trim() || null
  }

  /**
   * Extracts recommendations from content
   */
  private extractRecommendations(content: string): string[] | null {
    const lines = content.split('\n')
    const recommendations: string[] = []
    
    let inRecommendations = false
    for (const line of lines) {
      const trimmed = line.trim()
      
      if (trimmed.toLowerCase().includes('recommendation')) {
        inRecommendations = true
        continue
      }
      
      if (inRecommendations) {
        if (trimmed.startsWith('**') || trimmed.startsWith('#')) break
        if (trimmed.startsWith('-') || trimmed.startsWith('•') || /^\d+\./.test(trimmed)) {
          recommendations.push(trimmed.replace(/^[-•\d.]\s*/, ''))
        }
      }
    }
    
    return recommendations.length > 0 ? recommendations : null
  }

  /**
   * Extracts urgency level from content
   */
  private extractUrgencyLevel(content: string): 'immediate' | 'within_week' | 'routine' | 'monitor' | null {
    const contentLower = content.toLowerCase()
    
    if (contentLower.includes('immediate') || contentLower.includes('urgent') || contentLower.includes('emergency')) {
      return 'immediate'
    }
    if (contentLower.includes('within') && contentLower.includes('week')) {
      return 'within_week'
    }
    if (contentLower.includes('routine')) {
      return 'routine'
    }
    if (contentLower.includes('monitor')) {
      return 'monitor'
    }
    
    return null
  }

  /**
   * Validates safety of consultation response
   */
  private validateSafety(consultation: any): boolean {
    const content = JSON.stringify(consultation).toLowerCase()
    
    // Check for prohibited content
    const prohibitedTerms = [
      'i diagnose', 'you have', 'definitely', 'certainly is',
      'prescription', 'take this medication', 'stop taking'
    ]
    
    const hasProhibitedContent = prohibitedTerms.some(term => content.includes(term))
    
    // Check for required disclaimers
    const hasDisclaimer = consultation.medicalDisclaimer && 
      consultation.medicalDisclaimer.toLowerCase().includes('not a substitute')
    
    return !hasProhibitedContent && hasDisclaimer
  }

  /**
   * Checks if error is a rate limit error
   */
  private isRateLimitError(error: any): boolean {
    const errorMessage = error.message?.toLowerCase() || ''
    return errorMessage.includes('rate limit') || 
           errorMessage.includes('quota') || 
           errorMessage.includes('too many requests') ||
           error.status === 429
  }

  /**
   * Checks if error is an authentication error
   */
  private isAuthenticationError(error: any): boolean {
    const errorMessage = error.message?.toLowerCase() || ''
    return errorMessage.includes('authentication') || 
           errorMessage.includes('api key') || 
           errorMessage.includes('unauthorized') ||
           error.status === 401 || 
           error.status === 403
  }

  /**
   * Handles rate limiting with exponential backoff
   */
  private async handleRateLimit(error: any): Promise<void> {
    // Extract retry delay from error if available
    const retryAfter = error.retryAfter || this.retryDelay
    
    console.log(`Rate limited, waiting ${retryAfter}ms before retry...`)
    await this.sleep(retryAfter)
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Records error for analysis and recovery strategies
   */
  private recordError(error: Error): void {
    const errorRecord = {
      timestamp: Date.now(),
      error: error.message,
      category: this.categorizeError(error)
    }

    this.errorHistory.push(errorRecord)

    // Maintain error history size
    if (this.errorHistory.length > this.maxErrorHistory) {
      this.errorHistory.shift()
    }

    // Log error patterns for debugging
    this.analyzeErrorPatterns()
  }

  /**
   * Analyzes error patterns for proactive recovery
   */
  private analyzeErrorPatterns(): void {
    const recentErrors = this.errorHistory.filter(
      record => Date.now() - record.timestamp < 300000 // Last 5 minutes
    )

    if (recentErrors.length >= 3) {
      const categories = recentErrors.map(r => r.category)
      const mostCommon = this.getMostCommonCategory(categories)
      
      console.warn(`High error rate detected. Most common: ${mostCommon}. Circuit breaker state: ${this.circuitBreaker.getState()}`)
      
      // Suggest recovery actions based on error patterns
      if (mostCommon === 'rate_limit') {
        console.log('Suggestion: Implement request queuing or increase retry delays')
      } else if (mostCommon === 'network') {
        console.log('Suggestion: Check network connectivity and consider offline mode')
      } else if (mostCommon === 'authentication') {
        console.log('Suggestion: Verify API key configuration')
      }
    }
  }

  /**
   * Gets the most common error category
   */
  private getMostCommonCategory(categories: string[]): string {
    const counts = categories.reduce((acc, category) => {
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(counts).reduce((a, b) => counts[a[0]] > counts[b[0]] ? a : b)[0]
  }

  /**
   * Gets error statistics for monitoring
   */
  getErrorStatistics(): {
    totalErrors: number
    recentErrors: number
    circuitBreakerState: string
    errorsByCategory: Record<string, number>
    lastError?: { timestamp: number; error: string; category: string }
  } {
    const recentErrors = this.errorHistory.filter(
      record => Date.now() - record.timestamp < 300000 // Last 5 minutes
    )

    const errorsByCategory = this.errorHistory.reduce((acc, record) => {
      acc[record.category] = (acc[record.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalErrors: this.errorHistory.length,
      recentErrors: recentErrors.length,
      circuitBreakerState: this.circuitBreaker.getState(),
      errorsByCategory,
      lastError: this.errorHistory[this.errorHistory.length - 1]
    }
  }

  /**
   * Resets error tracking and circuit breaker
   */
  resetErrorTracking(): void {
    this.errorHistory = []
    this.circuitBreaker.reset()
    console.log('Error tracking and circuit breaker reset')
  }

  /**
   * Checks if the service is healthy for consultation requests
   */
  isHealthy(): boolean {
    const recentErrors = this.errorHistory.filter(
      record => Date.now() - record.timestamp < 60000 // Last minute
    )

    return recentErrors.length < 3 && this.circuitBreaker.getState() !== 'open'
  }

  /**
   * Gets service health status
   */
  getHealthStatus(): {
    healthy: boolean
    circuitBreakerState: string
    recentErrorCount: number
    recommendedAction: string
  } {
    const recentErrors = this.errorHistory.filter(
      record => Date.now() - record.timestamp < 60000
    )

    const healthy = this.isHealthy()
    const circuitBreakerState = this.circuitBreaker.getState()

    let recommendedAction = 'Service operating normally'
    
    if (!healthy) {
      if (circuitBreakerState === 'open') {
        recommendedAction = 'Service temporarily unavailable - using fallback mode'
      } else if (recentErrors.length >= 3) {
        recommendedAction = 'High error rate - monitor service closely'
      }
    }

    return {
      healthy,
      circuitBreakerState,
      recentErrorCount: recentErrors.length,
      recommendedAction
    }
  }

  /**
   * Provides enhanced consultation using existing analysis data when Gemini API is unavailable
   * Implements comprehensive fallback with error categorization and recovery strategies
   * Now includes seamless offline consultation capabilities
   */
  handleFallback(error: Error, input: ConsultationInput): ConsultationResponse {
    const { analysisResult, symptoms } = input
    
    console.log('Executing fallback consultation due to:', error.message)
    
    // Categorize the error for better fallback handling
    const errorCategory = this.categorizeError(error)
    
    // For network/service issues, use comprehensive offline consultation
    if (errorCategory === 'network' || errorCategory === 'service_unavailable') {
      console.log('Using comprehensive offline consultation system')
      try {
        return generateOfflineConsultation(analysisResult, symptoms, input.sessionId, {
          includeDetailedRecommendations: true,
          includeEducationalContent: true,
          includeEmergencyContacts: true,
          maxRecommendations: 8
        })
      } catch (offlineError) {
        console.warn('Offline consultation failed, using enhanced fallback:', offlineError)
      }
    }
    
    // For other errors (auth, rate limit), use enhanced fallback
    const topPrediction = analysisResult.predictions[0]
    const conditionAssessment = this.generateEnhancedFallbackAssessment(analysisResult, errorCategory)
    const symptomCorrelation = this.generateSymptomCorrelation(symptoms, analysisResult)
    const recommendations = this.generateEnhancedFallbackRecommendations(analysisResult, symptoms, errorCategory)
    const urgencyLevel = this.determineUrgencyLevel(analysisResult)
    const educationalInfo = this.generateEnhancedEducationalInfo(topPrediction, analysisResult)
    const medicalDisclaimer = this.getEnhancedMedicalDisclaimer(errorCategory)

    return {
      consultation: {
        conditionAssessment,
        symptomCorrelation,
        recommendations,
        urgencyLevel,
        educationalInfo,
        medicalDisclaimer
      },
      metadata: {
        modelUsed: 'Enhanced Fallback Analysis Engine',
        processingTime: 0, // Will be updated by caller
        confidenceScore: analysisResult.overallConfidence,
        fallbackUsed: true,
        safetyValidated: true
      },
      emergencyContacts: this.getEmergencyContacts(analysisResult.riskLevel)
    }
  }

  /**
   * Generates offline consultation using the dedicated offline system
   * Provides seamless fallback experience with comprehensive analysis
   */
  generateOfflineConsultation(
    analysisResult: AnalysisResult,
    symptoms: string,
    sessionId: string
  ): ConsultationResponse {
    console.log('Generating offline consultation for seamless fallback experience')
    
    try {
      return generateOfflineConsultation(analysisResult, symptoms, sessionId, {
        includeDetailedRecommendations: true,
        includeEducationalContent: true,
        includeEmergencyContacts: true,
        maxRecommendations: 10
      })
    } catch (error) {
      console.error('Offline consultation failed:', error)
      
      // Ultimate fallback to basic consultation
      return this.createErrorConsultation(
        error instanceof Error ? error : new Error('Offline consultation failed'),
        0,
        sessionId
      )
    }
  }

  /**
   * Checks if offline consultation is available
   */
  isOfflineConsultationAvailable(): boolean {
    try {
      const offlineEngine = getOfflineConsultationEngine()
      return !!offlineEngine
    } catch (error) {
      return false
    }
  }

  /**
   * Categorizes errors for appropriate fallback handling
   */
  private categorizeError(error: Error): 'network' | 'authentication' | 'rate_limit' | 'service_unavailable' | 'unknown' {
    const errorMessage = error.message.toLowerCase()
    
    if (this.isAuthenticationError(error)) {
      return 'authentication'
    }
    if (this.isRateLimitError(error)) {
      return 'rate_limit'
    }
    if (errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return 'network'
    }
    if (errorMessage.includes('service') || errorMessage.includes('unavailable') || errorMessage.includes('server')) {
      return 'service_unavailable'
    }
    
    return 'unknown'
  }

  /**
   * Generates enhanced fallback assessment with error context
   */
  private generateEnhancedFallbackAssessment(analysisResult: AnalysisResult, errorCategory: string): string {
    const topPrediction = analysisResult.predictions[0]
    const confidence = (analysisResult.overallConfidence * 100).toFixed(1)
    
    let assessment = `**Enhanced Analysis Results** (AI consultation temporarily unavailable)\n\n`
    
    assessment += `Based on the BiomedCLIP analysis, the most likely condition is **${topPrediction.condition}** with ${confidence}% confidence. `
    
    assessment += `This condition is classified as ${topPrediction.severity} severity in the ${topPrediction.category} category. `
    
    if (topPrediction.requiresAttention) {
      assessment += 'This condition typically requires medical attention for proper evaluation and treatment. '
    }
    
    // Add confidence context
    if (analysisResult.overallConfidence > 0.8) {
      assessment += 'The high confidence level suggests a strong match with the visual patterns. '
    } else if (analysisResult.overallConfidence < 0.5) {
      assessment += 'The moderate confidence level indicates some uncertainty - professional evaluation is recommended. '
    }
    
    if (analysisResult.predictions.length > 1) {
      const alternatives = analysisResult.predictions.slice(1, 3)
        .map(pred => `${pred.condition} (${(pred.confidence * 100).toFixed(1)}%)`)
        .join(', ')
      assessment += `Alternative possibilities to consider include: ${alternatives}. `
    }
    
    // Add error-specific context
    if (errorCategory === 'network' || errorCategory === 'service_unavailable') {
      assessment += '\n\n*Note: Advanced AI consultation is temporarily unavailable due to connectivity issues. This analysis is based on our enhanced local processing.*'
    } else if (errorCategory === 'rate_limit') {
      assessment += '\n\n*Note: AI consultation service is experiencing high demand. This enhanced analysis provides comprehensive information based on visual patterns.*'
    }
    
    return assessment
  }

  /**
   * Generates enhanced fallback recommendations with error-aware suggestions
   */
  private generateEnhancedFallbackRecommendations(
    analysisResult: AnalysisResult, 
    symptoms: string, 
    errorCategory: string
  ): string[] {
    const recommendations: string[] = []
    const topCondition = analysisResult.predictions[0]
    const riskLevel = analysisResult.riskLevel
    
    // Priority recommendations based on risk level
    if (riskLevel === 'high') {
      recommendations.push('🚨 URGENT: Seek immediate medical attention from a dermatologist or healthcare provider')
      recommendations.push('Do not delay - high-risk conditions require prompt professional evaluation')
      recommendations.push('Consider emergency care if symptoms worsen rapidly or if you experience systemic symptoms')
    } else if (riskLevel === 'moderate') {
      recommendations.push('Schedule an appointment with a healthcare provider within 1-2 weeks')
      recommendations.push('Monitor the condition closely and seek immediate care if it worsens')
      recommendations.push('Document changes with photos and symptom tracking')
    } else {
      recommendations.push('Consider consulting a healthcare provider if symptoms persist or worsen over 2-3 weeks')
      recommendations.push('Continue monitoring and maintain good skin care practices')
    }
    
    // Condition-specific recommendations with enhanced detail
    const conditionLower = topCondition.condition.toLowerCase()
    if (conditionLower.includes('eczema')) {
      recommendations.push('Apply fragrance-free, hypoallergenic moisturizer 2-3 times daily')
      recommendations.push('Identify and avoid triggers (harsh soaps, certain fabrics, stress, allergens)')
      recommendations.push('Consider cool compresses for acute itching and inflammation')
      recommendations.push('Use mild, pH-balanced cleansers and lukewarm water for washing')
    } else if (conditionLower.includes('psoriasis')) {
      recommendations.push('Keep skin well-moisturized with thick creams or ointments')
      recommendations.push('Consider medicated shampoos if scalp is affected')
      recommendations.push('Limited sun exposure may help, but always use sunscreen to prevent burns')
      recommendations.push('Manage stress levels as psychological stress can trigger flare-ups')
    } else if (conditionLower.includes('fungal')) {
      recommendations.push('Keep the affected area clean, dry, and well-ventilated')
      recommendations.push('Consider over-the-counter antifungal creams or powders')
      recommendations.push('Wash clothing and bedding in hot water (140°F+) and dry thoroughly')
      recommendations.push('Avoid sharing personal items like towels, shoes, or clothing')
    } else if (conditionLower.includes('acne')) {
      recommendations.push('Use gentle, non-comedogenic skincare products')
      recommendations.push('Avoid over-washing or harsh scrubbing which can worsen inflammation')
      recommendations.push('Consider over-the-counter treatments with salicylic acid or benzoyl peroxide')
      recommendations.push('Maintain a consistent skincare routine and avoid picking lesions')
    } else if (conditionLower.includes('melanoma') || conditionLower.includes('carcinoma')) {
      recommendations.push('🚨 CRITICAL: Contact a dermatologist immediately for urgent evaluation')
      recommendations.push('Protect the area from sun exposure while awaiting medical care')
      recommendations.push('Document the lesion with high-quality photos including a ruler for scale')
      recommendations.push('Prepare a list of any changes you\'ve noticed in size, color, or texture')
    }
    
    // General skin health recommendations
    recommendations.push('Take clear, well-lit photos weekly to track any changes')
    recommendations.push('Maintain good overall skin hygiene and avoid known irritants')
    recommendations.push('Use broad-spectrum sunscreen (SPF 30+) daily to prevent further damage')
    
    // Error-specific recommendations
    if (errorCategory === 'network' || errorCategory === 'service_unavailable') {
      recommendations.push('💡 Try the AI consultation again later when connectivity is restored')
    } else if (errorCategory === 'rate_limit') {
      recommendations.push('💡 AI consultation may be available again in a few minutes - you can retry')
    }
    
    // Symptom-specific additions
    if (symptoms && symptoms.toLowerCase().includes('pain')) {
      recommendations.push('For pain management, consider cool compresses and over-the-counter pain relief as appropriate')
    }
    if (symptoms && symptoms.toLowerCase().includes('itch')) {
      recommendations.push('For itching, avoid scratching and consider antihistamines or cool compresses')
    }
    
    return recommendations.slice(0, 8) // Limit to 8 most relevant recommendations
  }

  /**
   * Generates enhanced educational information
   */
  private generateEnhancedEducationalInfo(condition: DetectedCondition, analysisResult: AnalysisResult): string {
    let info = condition.description || 'No specific educational information available for this condition.'
    
    // Add general information based on category
    if (condition.category === 'Dermatological') {
      info += '\n\nDermatological conditions often benefit from consistent skincare routines and professional medical guidance for optimal management.'
    } else if (condition.category === 'Infectious') {
      info += '\n\nInfectious skin conditions typically respond well to appropriate treatment when diagnosed and managed properly by healthcare providers.'
    } else if (condition.category === 'Autoimmune') {
      info += '\n\nAutoimmune skin conditions are chronic conditions that can be effectively managed with proper medical care and lifestyle modifications.'
    } else if (condition.category === 'Oncological') {
      info += '\n\n⚠️ Oncological conditions require immediate professional evaluation. Early detection and treatment significantly improve outcomes.'
    }
    
    // Add confidence-based context
    if (analysisResult.overallConfidence > 0.8) {
      info += '\n\nThe high confidence in this analysis suggests strong visual pattern matching, but professional confirmation is still recommended.'
    } else if (analysisResult.overallConfidence < 0.5) {
      info += '\n\nThe moderate confidence level indicates some uncertainty in the analysis. Professional evaluation can provide definitive diagnosis.'
    }
    
    return info
  }

  /**
   * Gets enhanced medical disclaimer with error context
   */
  private getEnhancedMedicalDisclaimer(errorCategory: string): string {
    let disclaimer = '⚠️ **IMPORTANT MEDICAL DISCLAIMER**: This AI-powered analysis is for informational purposes only and is NOT a substitute for professional medical advice, diagnosis, or treatment. '
    
    disclaimer += 'The analysis is based on visual patterns and should not be used for self-diagnosis. Always consult a qualified healthcare provider for any health concerns or before making medical decisions. '
    
    if (errorCategory !== 'unknown') {
      disclaimer += 'This analysis was generated using enhanced fallback processing due to temporary service limitations. '
    }
    
    disclaimer += 'If you have a medical emergency, call emergency services immediately. '
    disclaimer += 'For skin conditions showing rapid changes, unusual symptoms, or causing significant concern, seek prompt medical attention.'
    
    return disclaimer
  }

  /**
   * Generates fallback assessment based on analysis results
   */
  private generateFallbackAssessment(analysisResult: AnalysisResult): string {
    const topPrediction = analysisResult.predictions[0]
    const confidence = (analysisResult.overallConfidence * 100).toFixed(1)
    
    let assessment = `Based on the BiomedCLIP analysis, the most likely condition is **${topPrediction.condition}** with ${confidence}% confidence. `
    
    assessment += `This condition is classified as ${topPrediction.severity} severity in the ${topPrediction.category} category. `
    
    if (topPrediction.requiresAttention) {
      assessment += 'This condition typically requires medical attention for proper evaluation and treatment. '
    }
    
    if (analysisResult.predictions.length > 1) {
      const alternatives = analysisResult.predictions.slice(1, 3)
        .map(pred => `${pred.condition} (${(pred.confidence * 100).toFixed(1)}%)`)
        .join(', ')
      assessment += `Alternative possibilities include: ${alternatives}. `
    }
    
    return assessment
  }

  /**
   * Generates symptom correlation analysis
   */
  private generateSymptomCorrelation(symptoms: string, analysisResult: AnalysisResult): string {
    if (!symptoms || symptoms.trim().length === 0) {
      return 'No symptoms were provided for correlation analysis. Visual analysis was performed based solely on the image.'
    }
    
    const processedSymptoms = this.processSymptoms(symptoms)
    const topCondition = analysisResult.predictions[0]
    
    let correlation = `Your reported symptoms have been analyzed in relation to the detected condition (${topCondition.condition}). `
    
    if (processedSymptoms.keywords.length > 0) {
      correlation += `Key symptoms mentioned include: ${processedSymptoms.keywords.join(', ')}. `
    }
    
    // Add condition-specific correlations
    const conditionLower = topCondition.condition.toLowerCase()
    if (conditionLower.includes('eczema') && processedSymptoms.keywords.includes('itch')) {
      correlation += 'The itching you described is consistent with eczema, which commonly causes intense itching. '
    } else if (conditionLower.includes('psoriasis') && processedSymptoms.keywords.includes('scaly')) {
      correlation += 'The scaling you mentioned aligns with psoriasis characteristics. '
    } else if (conditionLower.includes('fungal') && processedSymptoms.keywords.includes('itch')) {
      correlation += 'Itching is a common symptom of fungal infections. '
    }
    
    correlation += 'This symptom information helps provide context for the visual analysis results.'
    
    return correlation
  }

  /**
   * Generates fallback recommendations
   */
  private generateFallbackRecommendations(analysisResult: AnalysisResult, symptoms: string): string[] {
    const recommendations: string[] = []
    const topCondition = analysisResult.predictions[0]
    const riskLevel = analysisResult.riskLevel
    
    // Risk-based recommendations
    if (riskLevel === 'high') {
      recommendations.push('🚨 URGENT: Seek immediate medical attention from a dermatologist or healthcare provider')
      recommendations.push('Consider emergency care if symptoms worsen rapidly')
    } else if (riskLevel === 'moderate') {
      recommendations.push('Schedule an appointment with a healthcare provider within 1-2 weeks')
      recommendations.push('Monitor the condition and seek immediate care if it worsens')
    } else {
      recommendations.push('Consider consulting a healthcare provider if symptoms persist or worsen')
    }
    
    // Condition-specific recommendations
    const conditionLower = topCondition.condition.toLowerCase()
    if (conditionLower.includes('eczema')) {
      recommendations.push('Apply fragrance-free moisturizer regularly')
      recommendations.push('Avoid known triggers and use gentle, hypoallergenic products')
    } else if (conditionLower.includes('psoriasis')) {
      recommendations.push('Keep skin moisturized and avoid harsh soaps')
      recommendations.push('Consider stress management as it can trigger flare-ups')
    } else if (conditionLower.includes('fungal')) {
      recommendations.push('Keep the affected area clean and dry')
      recommendations.push('Consider over-the-counter antifungal treatments')
    } else if (conditionLower.includes('acne')) {
      recommendations.push('Use gentle, non-comedogenic skincare products')
      recommendations.push('Avoid picking or squeezing lesions')
    }
    
    // General recommendations
    recommendations.push('Take photos to monitor changes over time')
    recommendations.push('Maintain good skin hygiene and avoid irritants')
    
    return recommendations.slice(0, 6) // Limit to 6 recommendations
  }

  /**
   * Determines urgency level based on analysis
   */
  private determineUrgencyLevel(analysisResult: AnalysisResult): 'immediate' | 'within_week' | 'routine' | 'monitor' {
    const topCondition = analysisResult.predictions[0]
    const riskLevel = analysisResult.riskLevel
    
    // High-risk conditions need immediate attention
    if (riskLevel === 'high' || topCondition.condition.toLowerCase().includes('melanoma') || 
        topCondition.condition.toLowerCase().includes('carcinoma')) {
      return 'immediate'
    }
    
    // Conditions requiring attention
    if (topCondition.requiresAttention || riskLevel === 'moderate') {
      return 'within_week'
    }
    
    // Low-risk conditions
    if (riskLevel === 'low' && !topCondition.requiresAttention) {
      return 'monitor'
    }
    
    return 'routine'
  }

  /**
   * Generates educational information about the condition
   */
  private generateEducationalInfo(condition: DetectedCondition): string {
    return condition.description || 'No additional educational information available for this condition.'
  }

  /**
   * Returns standard medical disclaimer
   */
  private getMedicalDisclaimer(): string {
    return '⚠️ **IMPORTANT MEDICAL DISCLAIMER**: This AI-powered analysis is for informational purposes only and is NOT a substitute for professional medical advice, diagnosis, or treatment. The analysis is based on visual patterns and should not be used for self-diagnosis. Always consult a qualified healthcare provider for any health concerns or before making medical decisions. If you have a medical emergency, call emergency services immediately.'
  }

  /**
   * Gets emergency contacts based on risk level
   */
  private getEmergencyContacts(riskLevel: 'low' | 'moderate' | 'high'): EmergencyContact[] {
    const contacts: EmergencyContact[] = []
    
    if (riskLevel === 'high') {
      contacts.push({
        type: 'emergency',
        name: 'Emergency Services',
        phone: '911',
        description: 'For immediate medical emergencies'
      })
    }
    
    contacts.push({
      type: 'dermatologist',
      name: 'Dermatologist',
      phone: 'Contact your healthcare provider',
      description: 'Specialized skin condition care'
    })
    
    if (riskLevel !== 'low') {
      contacts.push({
        type: 'urgent_care',
        name: 'Urgent Care',
        phone: 'Find local urgent care',
        description: 'For non-emergency but urgent medical needs'
      })
    }
    
    return contacts
  }

  /**
   * Creates error consultation response
   */
  private createErrorConsultation(error: Error, processingTime: number, sessionId: string): ConsultationResponse {
    return {
      consultation: {
        conditionAssessment: 'Unable to generate consultation due to a technical error.',
        symptomCorrelation: 'Symptom analysis could not be completed.',
        recommendations: [
          'Please try again in a few moments',
          'Ensure you have a stable internet connection',
          'Consider consulting a healthcare provider directly',
          'Save your analysis results for reference'
        ],
        urgencyLevel: 'routine',
        educationalInfo: 'Technical error prevented educational information retrieval.',
        medicalDisclaimer: this.getMedicalDisclaimer()
      },
      metadata: {
        modelUsed: 'Error Handler',
        processingTime,
        confidenceScore: 0,
        fallbackUsed: true,
        safetyValidated: true
      }
    }
  }
}

/**
 * Create a singleton instance of the consultation engine
 */
let consultationEngineInstance: ConsultationEngine | null = null

/**
 * Get the singleton consultation engine instance
 */
export function getConsultationEngine(): ConsultationEngine {
  if (!consultationEngineInstance) {
    // Import and create Gemini client
    const { getGeminiClient } = require('./gemini-client')
    const geminiClient = getGeminiClient()
    consultationEngineInstance = new ConsultationEngine(geminiClient)
  }
  return consultationEngineInstance
}

/**
 * Initialize the consultation engine
 */
export async function initializeConsultationEngine(): Promise<boolean> {
  try {
    const engine = getConsultationEngine()
    // Additional initialization if needed
    return true
  } catch (error) {
    console.error('Failed to initialize consultation engine:', error)
    return false
  }
}