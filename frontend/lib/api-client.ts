/**
 * API Client for BioLens Next.js Application
 * Handles all API communication with the Next.js API routes
 */

interface VisualFeatures {
  colorAnalysis: {
    meanRgb: number[]
    stdRgb: number[]
    dominantColorChannel: number
  }
  textureFeatures: {
    textureVariance: number
    textureMean: number
    textureContrast: number
  }
  shapeFeatures: {
    largestArea: number
    perimeter: number
    circularity: number
  }
  symmetryAnalysis: {
    verticalSymmetryScore: number
  }
}

export interface UploadResponse {
  success: boolean
  imageUrl?: string
  publicId?: string
  metadata?: {
    width: number
    height: number
    format: string
    bytes: number
    uploadedAt: string
  }
  error?: string
}

export interface AnalysisResponse {
  success: boolean
  analysis?: AnalysisResult
  sessionId?: string
  error?: string
}

export interface FeatureExtractionResponse {
  success: boolean
  features?: VisualFeatures
  sessionId?: string
  error?: string
  processingTime?: number
}

export interface DetectedCondition {
  condition: string
  confidence: number
  severity: 'mild' | 'moderate' | 'severe'
  category: string
  requiresAttention: boolean
  description: string
}

export interface AnalysisResult {
  predictions: DetectedCondition[]
  topPrediction: string
  overallConfidence: number
  riskLevel: 'low' | 'moderate' | 'high'
  recommendations: string[]
  processingInfo: {
    imageProcessed: boolean
    symptomsIncluded: boolean
    modelUsed: string
    processingTime: number
  }
}

export interface CleanupResponse {
  success: boolean
  message: string
  publicId?: string
  deletedImages?: string[]
  totalFound?: number
}

// Enhanced consultation types for Requirements 4.1, 4.2, 4.3
export interface ConsultationRequest {
  analysisResult: AnalysisResult
  symptoms: string
  sessionId: string
  userAgent?: string
  timestamp?: Date
}

export interface ConsultationResponse {
  success: boolean
  consultation?: {
    conditionAssessment: string
    symptomCorrelation: string
    recommendations: string[]
    urgencyLevel: 'immediate' | 'within_week' | 'routine' | 'monitor'
    educationalInfo: string
    medicalDisclaimer: string
  }
  metadata?: {
    modelUsed: string
    processingTime: number
    confidenceScore: number
    fallbackUsed: boolean
    safetyValidated: boolean
  }
  emergencyContacts?: Array<{
    type: 'emergency' | 'urgent_care' | 'dermatologist'
    name: string
    phone: string
    description: string
  }>
  sessionId?: string
  error?: string
  fallbackConsultation?: any
}

// Enhanced error types for better error handling
export interface ConsultationError {
  type: 'api_error' | 'validation_error' | 'network_error' | 'timeout_error' | 'rate_limit_error'
  message: string
  code?: string
  retryable: boolean
  fallbackAvailable: boolean
}

// Health status interface for consultation service monitoring
export interface ConsultationHealthStatus {
  healthy: boolean
  apiAvailable: boolean
  lastSuccessfulCall?: Date
  errorRate: number
  recommendedAction?: string
}

// Consultation validation result
export interface ConsultationValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

// Caching interfaces for optimization (Requirement 6.1)
export interface ConsultationCacheEntry {
  key: string
  response: ConsultationResponse
  timestamp: Date
  expiresAt: Date
  accessCount: number
  lastAccessed: Date
}

export interface ConsultationCacheStats {
  totalEntries: number
  hitRate: number
  totalRequests: number
  cacheHits: number
  cacheMisses: number
  averageResponseTime: number
}

/**
 * Upload image to Cloudinary via Next.js API
 */
export async function uploadImage(file: File): Promise<UploadResponse> {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    const result: UploadResponse = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Upload failed')
    }

    return result
  } catch (error) {
    console.error('Upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

/**
 * Analyze skin condition using BiomedCLIP
 */
export async function analyzeSkinCondition(
  imageUrl: string,
  symptoms: string = '',
  sessionId?: string
): Promise<AnalysisResponse> {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl,
        symptoms,
        sessionId
      }),
    })

    const result: AnalysisResponse = await response.json()

    if (!response.ok && !result.analysis) {
      throw new Error(result.error || 'Analysis failed')
    }

    return result
  } catch (error) {
    console.error('Analysis error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Analysis failed'
    }
  }
}

/**
 * Generate medical consultation using Gemini AI
 * Enhanced with comprehensive error handling and validation (Requirements 4.1, 4.2, 4.3)
 */
export async function generateConsultation(
  analysisResult: AnalysisResult,
  symptoms: string = '',
  sessionId?: string
): Promise<ConsultationResponse> {
  try {
    // Validate input data before sending (Requirement 4.1)
    const validation = validateConsultationInput(analysisResult, symptoms)
    if (!validation.valid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`
      }
    }

    const requestData: ConsultationRequest = {
      analysisResult,
      symptoms,
      sessionId: sessionId || generateSessionId(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      timestamp: new Date()
    }

    const response = await fetch('/api/consultation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    })

    const result: ConsultationResponse = await response.json()

    // Enhanced error handling for different response scenarios
    if (!response.ok) {
      const error: ConsultationError = {
        type: response.status === 429 ? 'rate_limit_error' : 
              response.status >= 500 ? 'api_error' : 'validation_error',
        message: result.error || 'Consultation generation failed',
        retryable: response.status === 429 || response.status >= 500,
        fallbackAvailable: !!result.fallbackConsultation
      }

      // Return fallback consultation if available (Requirement 4.2)
      if (result.fallbackConsultation) {
        return {
          success: true,
          consultation: result.fallbackConsultation.consultation,
          metadata: {
            ...result.fallbackConsultation.metadata,
            fallbackUsed: true
          },
          sessionId: requestData.sessionId
        }
      }

      throw error
    }

    // Validate response structure (Requirement 4.1)
    if (!result.consultation) {
      throw new Error('Invalid response: missing consultation data')
    }

    return result
  } catch (error) {
    console.error('Consultation error:', error)
    
    // Enhanced error handling with structured error information
    if (error instanceof Error && 'type' in error) {
      const consultationError = error as ConsultationError
      return {
        success: false,
        error: consultationError.message,
        metadata: {
          modelUsed: 'fallback',
          processingTime: 0,
          confidenceScore: 0,
          fallbackUsed: true,
          safetyValidated: false
        }
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Consultation generation failed'
    }
  }
}

/**
 * Validate consultation input data (Requirement 4.1)
 */
export function validateConsultationInput(
  analysisResult: AnalysisResult,
  symptoms: string
): ConsultationValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate analysis result
  if (!analysisResult) {
    errors.push('Analysis result is required')
  } else {
    if (!analysisResult.predictions || !Array.isArray(analysisResult.predictions) || analysisResult.predictions.length === 0) {
      errors.push('Analysis result must contain valid predictions')
    }

    if (typeof analysisResult.overallConfidence !== 'number' || 
        analysisResult.overallConfidence < 0 || 
        analysisResult.overallConfidence > 1) {
      errors.push('Analysis result must contain valid confidence score (0-1)')
    }

    if (!analysisResult.riskLevel || !['low', 'moderate', 'high'].includes(analysisResult.riskLevel)) {
      errors.push('Analysis result must contain valid risk level')
    }

    // Check for high-risk conditions
    if (analysisResult.riskLevel === 'high') {
      warnings.push('High-risk condition detected - consultation will emphasize urgent medical attention')
    }
  }

  // Validate symptoms
  if (symptoms && typeof symptoms !== 'string') {
    errors.push('Symptoms must be a string')
  }

  if (symptoms && symptoms.length > 2000) {
    warnings.push('Symptoms will be truncated to 2000 characters')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Get consultation service health status
 */
export async function getConsultationHealth(): Promise<ConsultationHealthStatus> {
  try {
    const response = await fetch('/api/consultation', {
      method: 'GET',
    })

    if (!response.ok) {
      return {
        healthy: false,
        apiAvailable: false,
        errorRate: 1.0,
        recommendedAction: 'Service unavailable - use fallback consultation'
      }
    }

    const result = await response.json()
    
    return {
      healthy: result.success && result.health?.healthy,
      apiAvailable: result.success,
      lastSuccessfulCall: new Date(),
      errorRate: result.statistics?.recentErrors || 0,
      recommendedAction: result.health?.recommendedAction
    }
  } catch (error) {
    console.error('Health check error:', error)
    return {
      healthy: false,
      apiAvailable: false,
      errorRate: 1.0,
      recommendedAction: 'Network error - check connection'
    }
  }
}

/**
 * Regenerate consultation with additional symptoms (Requirement 4.3)
 */
export async function regenerateConsultation(
  originalConsultation: ConsultationResponse,
  additionalSymptoms: string,
  sessionId: string
): Promise<ConsultationResponse> {
  if (!originalConsultation.consultation || !originalConsultation.metadata) {
    throw new Error('Invalid original consultation data')
  }

  // Extract analysis result from metadata if available
  // This would need to be stored in the session or passed separately
  // For now, we'll return an error indicating this limitation
  return {
    success: false,
    error: 'Consultation regeneration requires original analysis data - please restart analysis with new symptoms'
  }
}

/**
 * Format consultation for display with enhanced readability (Requirement 4.2)
 */
export function formatConsultationForDisplay(consultation: ConsultationResponse): string {
  if (!consultation.success || !consultation.consultation) {
    return `❌ **Consultation Unavailable**\n\n${consultation.error || 'Unknown error occurred'}`
  }

  const { consultation: consult, metadata, emergencyContacts } = consultation
  
  let result = `🤖 **AI Medical Consultation**\n\n`
  
  // Processing info with enhanced metadata
  if (metadata) {
    result += `**Model:** ${metadata.modelUsed}\n`
    result += `**Processing Time:** ${metadata.processingTime}ms\n`
    result += `**Confidence:** ${(metadata.confidenceScore * 100).toFixed(1)}%\n`
    result += `**Fallback Used:** ${metadata.fallbackUsed ? '🔄 Yes' : '✅ No'}\n`
    result += `**Safety Validated:** ${metadata.safetyValidated ? '🛡️ Yes' : '⚠️ No'}\n\n`
  }
  
  // Condition assessment with enhanced formatting
  result += `**🔍 Condition Assessment:**\n${consult.conditionAssessment}\n\n`
  
  // Symptom correlation if available
  if (consult.symptomCorrelation) {
    result += `**📋 Symptom Analysis:**\n${consult.symptomCorrelation}\n\n`
  }
  
  // Recommendations with priority indicators
  result += `**💡 Personalized Recommendations:**\n`
  consult.recommendations.forEach((rec, index) => {
    result += `${index + 1}. ${rec}\n`
  })
  result += `\n`
  
  // Urgency level with visual indicators
  const urgencyEmoji = {
    'immediate': '🚨',
    'within_week': '⏰',
    'routine': '📅',
    'monitor': '👁️'
  }
  result += `**${urgencyEmoji[consult.urgencyLevel]} Urgency Level:** ${consult.urgencyLevel.replace('_', ' ').toUpperCase()}\n\n`
  
  // Educational information
  if (consult.educationalInfo) {
    result += `**📚 Educational Information:**\n${consult.educationalInfo}\n\n`
  }
  
  // Emergency contacts for high-urgency cases
  if (emergencyContacts && emergencyContacts.length > 0) {
    result += `**🚨 Emergency Contacts:**\n`
    emergencyContacts.forEach(contact => {
      result += `• **${contact.name}** (${contact.type}): ${contact.phone}\n  ${contact.description}\n`
    })
    result += `\n`
  }
  
  // Medical disclaimer (always present for safety)
  result += `**⚠️ Important Medical Disclaimer:**\n${consult.medicalDisclaimer}\n\n`
  
  result += `**🤖 About AI Consultation:**\n`
  result += `This consultation uses advanced AI to provide personalized medical guidance based on your specific condition analysis and symptoms. However, it is supplementary information only and should not replace professional medical advice.`
  
  return result
}

// Consultation caching and optimization system (Requirement 6.1)
class ConsultationCache {
  private cache: Map<string, ConsultationCacheEntry> = new Map()
  private stats: ConsultationCacheStats = {
    totalEntries: 0,
    hitRate: 0,
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageResponseTime: 0
  }
  private readonly maxEntries = 100
  private readonly defaultTTL = 30 * 60 * 1000 // 30 minutes
  private readonly pendingRequests: Map<string, Promise<ConsultationResponse>> = new Map()

  /**
   * Generate cache key for consultation request
   */
  private generateCacheKey(analysisResult: AnalysisResult, symptoms: string): string {
    // Create a deterministic key based on analysis results and symptoms
    const keyData = {
      topPrediction: analysisResult.topPrediction,
      confidence: Math.round(analysisResult.overallConfidence * 100) / 100, // Round to 2 decimals
      riskLevel: analysisResult.riskLevel,
      symptoms: symptoms.toLowerCase().trim()
    }
    
    return btoa(JSON.stringify(keyData)).replace(/[+/=]/g, '')
  }

  /**
   * Check if two analysis results are similar enough to use cached response
   */
  private isSimilarAnalysis(cached: AnalysisResult, current: AnalysisResult): boolean {
    // Check if top predictions match and confidence is within 10%
    return cached.topPrediction === current.topPrediction &&
           cached.riskLevel === current.riskLevel &&
           Math.abs(cached.overallConfidence - current.overallConfidence) < 0.1
  }

  /**
   * Get cached consultation if available and valid
   */
  get(analysisResult: AnalysisResult, symptoms: string): ConsultationResponse | null {
    this.stats.totalRequests++
    
    const key = this.generateCacheKey(analysisResult, symptoms)
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.stats.cacheMisses++
      this.updateHitRate()
      return null
    }
    
    // Check if entry has expired
    if (new Date() > entry.expiresAt) {
      this.cache.delete(key)
      this.stats.cacheMisses++
      this.updateHitRate()
      return null
    }
    
    // Update access statistics
    entry.accessCount++
    entry.lastAccessed = new Date()
    
    this.stats.cacheHits++
    this.updateHitRate()
    
    // Mark response as cached in metadata
    const cachedResponse = { ...entry.response }
    if (cachedResponse.metadata) {
      cachedResponse.metadata = {
        ...cachedResponse.metadata,
        processingTime: 0, // Cached responses are instant
        fallbackUsed: false
      }
    }
    
    return cachedResponse
  }

  /**
   * Store consultation response in cache
   */
  set(analysisResult: AnalysisResult, symptoms: string, response: ConsultationResponse): void {
    // Only cache successful responses
    if (!response.success || !response.consultation) {
      return
    }
    
    const key = this.generateCacheKey(analysisResult, symptoms)
    const now = new Date()
    
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxEntries) {
      this.evictLeastRecentlyUsed()
    }
    
    const entry: ConsultationCacheEntry = {
      key,
      response: { ...response }, // Deep copy to prevent mutations
      timestamp: now,
      expiresAt: new Date(now.getTime() + this.defaultTTL),
      accessCount: 1,
      lastAccessed: now
    }
    
    this.cache.set(key, entry)
    this.stats.totalEntries = this.cache.size
  }

  /**
   * Evict least recently used entries
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey = ''
    let oldestTime = new Date()
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey = key
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  /**
   * Update hit rate statistics
   */
  private updateHitRate(): void {
    this.stats.hitRate = this.stats.totalRequests > 0 
      ? this.stats.cacheHits / this.stats.totalRequests 
      : 0
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = new Date()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
      }
    }
    this.stats.totalEntries = this.cache.size
  }

  /**
   * Get cache statistics
   */
  getStats(): ConsultationCacheStats {
    return { ...this.stats }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
    this.stats = {
      totalEntries: 0,
      hitRate: 0,
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0
    }
  }

  /**
   * Handle request deduplication
   */
  async deduplicateRequest(
    key: string, 
    requestFn: () => Promise<ConsultationResponse>
  ): Promise<ConsultationResponse> {
    // Check if there's already a pending request for this key
    const pendingRequest = this.pendingRequests.get(key)
    if (pendingRequest) {
      return pendingRequest
    }

    // Create new request and store it
    const request = requestFn()
    this.pendingRequests.set(key, request)

    try {
      const result = await request
      return result
    } finally {
      // Clean up pending request
      this.pendingRequests.delete(key)
    }
  }
}

// Global cache instance
const consultationCache = new ConsultationCache()

/**
 * Enhanced consultation generation with caching and optimization (Requirement 6.1)
 */
export async function generateConsultationWithCache(
  analysisResult: AnalysisResult,
  symptoms: string = '',
  sessionId?: string,
  options: { useCache?: boolean; forceFresh?: boolean } = {}
): Promise<ConsultationResponse> {
  const { useCache = true, forceFresh = false } = options
  
  // Check cache first if enabled and not forcing fresh
  if (useCache && !forceFresh) {
    const cached = consultationCache.get(analysisResult, symptoms)
    if (cached) {
      console.log('📦 Using cached consultation response')
      return cached
    }
  }

  // Generate cache key for deduplication
  const cacheKey = `${analysisResult.topPrediction}-${symptoms.substring(0, 50)}`
  
  // Use deduplication to prevent multiple identical requests
  return consultationCache.deduplicateRequest(cacheKey, async () => {
    const startTime = Date.now()
    
    try {
      const response = await generateConsultation(analysisResult, symptoms, sessionId)
      
      // Cache successful responses
      if (response.success && useCache) {
        consultationCache.set(analysisResult, symptoms, response)
      }
      
      // Update average response time
      const responseTime = Date.now() - startTime
      const stats = consultationCache.getStats()
      stats.averageResponseTime = (stats.averageResponseTime + responseTime) / 2
      
      return response
    } catch (error) {
      console.error('Cached consultation generation failed:', error)
      throw error
    }
  })
}

/**
 * Get consultation cache statistics for monitoring
 */
export function getConsultationCacheStats(): ConsultationCacheStats {
  return consultationCache.getStats()
}

/**
 * Clear consultation cache
 */
export function clearConsultationCache(): void {
  consultationCache.clear()
}

/**
 * Optimize consultation cache by clearing expired entries
 */
export function optimizeConsultationCache(): void {
  consultationCache.clearExpired()
}

/**
 * Batch consultation requests for multiple analyses (cost optimization)
 */
export async function batchConsultationRequests(
  requests: Array<{
    analysisResult: AnalysisResult
    symptoms: string
    sessionId?: string
  }>
): Promise<ConsultationResponse[]> {
  // For now, process requests sequentially with caching
  // In a production environment, this could be optimized with actual batch API calls
  const results: ConsultationResponse[] = []
  
  for (const request of requests) {
    try {
      const result = await generateConsultationWithCache(
        request.analysisResult,
        request.symptoms,
        request.sessionId
      )
      results.push(result)
    } catch (error) {
      results.push({
        success: false,
        error: error instanceof Error ? error.message : 'Batch request failed'
      })
    }
  }
  
  return results
}

/**
 * Clean up uploaded image from Cloudinary
 */
export async function cleanupImage(publicId: string): Promise<CleanupResponse> {
  try {
    const response = await fetch(`/api/cleanup?publicId=${encodeURIComponent(publicId)}`, {
      method: 'DELETE',
    })

    const result: CleanupResponse = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'Cleanup failed')
    }

    return result
  } catch (error) {
    console.error('Cleanup error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Cleanup failed'
    }
  }
}

/**
 * Extract visual features from image using ImageAnalyzer
 */
export async function extractVisualFeatures(
  imageUrl: string,
  sessionId?: string
): Promise<FeatureExtractionResponse> {
  try {
    const response = await fetch('/api/extract-features', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl,
        sessionId
      }),
    })

    const result: FeatureExtractionResponse = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Feature extraction failed')
    }

    return result
  } catch (error) {
    console.error('Feature extraction error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Feature extraction failed'
    }
  }
}

/**
 * Format analysis results for display
 */
export function formatAnalysisForDisplay(analysis: AnalysisResult): string {
  const { predictions, topPrediction, overallConfidence, riskLevel, recommendations, processingInfo } = analysis
  
  let result = `🔬 **BiomedCLIP Analysis Results**\n\n`
  
  // Processing info
  result += `**Model:** ${processingInfo.modelUsed}\n`
  result += `**Processing Time:** ${processingInfo.processingTime}ms\n`
  result += `**Image Processed:** ${processingInfo.imageProcessed ? '✅ Yes' : '❌ No'}\n`
  result += `**Symptoms Included:** ${processingInfo.symptomsIncluded ? '✅ Yes' : '⚪ No'}\n\n`
  
  // Top prediction with enhanced formatting
  const riskEmoji = riskLevel === 'high' ? '🔴' : riskLevel === 'moderate' ? '🟡' : '🟢'
  result += `**Primary Detection:** ${topPrediction}\n`
  result += `**Confidence:** ${(overallConfidence * 100).toFixed(1)}%\n`
  result += `**Risk Level:** ${riskEmoji} ${riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)}\n\n`
  
  // Top predictions with confidence scores
  if (predictions.length > 1) {
    result += `**Alternative Possibilities:**\n`
    predictions.slice(1, 4).forEach((pred, index) => {
      const confidenceBar = '█'.repeat(Math.round(pred.confidence * 10)) + '░'.repeat(10 - Math.round(pred.confidence * 10))
      result += `${index + 2}. ${pred.condition} - ${(pred.confidence * 100).toFixed(1)}% ${confidenceBar}\n`
    })
    result += `\n`
  }
  
  // Description with category
  if (predictions[0]) {
    result += `**Condition Details:**\n`
    result += `📋 **Category:** ${predictions[0].category}\n`
    result += `⚕️ **Severity:** ${predictions[0].severity.charAt(0).toUpperCase() + predictions[0].severity.slice(1)}\n`
    result += `🏥 **Requires Attention:** ${predictions[0].requiresAttention ? 'Yes' : 'No'}\n\n`
    result += `**Description:**\n${predictions[0].description}\n\n`
  }
  
  // Recommendations with better formatting
  result += `**📋 Recommendations:**\n`
  recommendations.forEach((rec) => {
    result += `• ${rec}\n`
  })
  
  result += `\n**⚠️ Important Medical Disclaimer:**\n`
  result += `This AI analysis uses BiomedCLIP technology and is for informational purposes only. It is NOT a substitute for professional medical advice, diagnosis, or treatment. The analysis is based on visual patterns and should not be used for self-diagnosis. Always consult a qualified healthcare provider for any health concerns or before making medical decisions.\n\n`
  
  result += `**🔬 About BiomedCLIP:**\n`
  result += `BiomedCLIP is a specialized AI model trained on medical images and text. It uses advanced computer vision to analyze skin conditions, but its predictions should always be verified by medical professionals.`
  
  return result
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Demo sample interface for testing functionality
 */
export interface DemoSample {
  id: string
  name: string
  description: string
  imageUrl: string
  symptoms: string
  expectedCondition: string
  riskLevel: 'low' | 'medium' | 'high'
  category: string
  processingTime: string
}

/**
 * Demo analysis response interface
 */
export interface DemoAnalysisResponse {
  success: boolean
  analysis?: AnalysisResult
  metadata?: {
    isDemoMode: boolean
    sampleId: string
    processingTime: number
    timestamp: string
  }
  error?: string
}

/**
 * Analyze demo sample with predefined results
 */
export async function analyzeDemoSample(
  sampleId: string,
  symptoms: string = '',
  sessionId?: string
): Promise<DemoAnalysisResponse> {
  try {
    console.log(`🎭 Analyzing demo sample: ${sampleId}`)
    
    const response = await fetch('/api/demo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sampleId,
        symptoms,
        sessionId: sessionId || generateSessionId()
      }),
    })

    const result: DemoAnalysisResponse = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Demo analysis failed')
    }

    console.log(`✅ Demo analysis completed for ${sampleId}`)
    return result
  } catch (error) {
    console.error('Demo analysis error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Demo analysis failed'
    }
  }
}

/**
 * Get available demo samples
 */
export async function getDemoSamples(): Promise<{
  success: boolean
  samples?: Array<{
    id: string
    available: boolean
    expectedCondition: string
    riskLevel: string
    confidence: number
  }>
  totalSamples?: number
  error?: string
}> {
  try {
    const response = await fetch('/api/demo', {
      method: 'GET',
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch demo samples')
    }

    return result
  } catch (error) {
    console.error('Demo samples fetch error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch demo samples'
    }
  }
}

/**
 * Create a File object from a demo sample URL for consistent processing
 */
export async function createFileFromDemoSample(sample: DemoSample): Promise<File> {
  try {
    // For demo purposes, create a mock file object
    // In a real implementation, you might fetch the image and create a proper File
    const mockFile = new File(
      [new Blob(['demo-image-data'], { type: 'image/jpeg' })],
      `${sample.id}.jpg`,
      { type: 'image/jpeg' }
    )
    
    // Add demo metadata to the file object
    Object.defineProperty(mockFile, 'demoSample', {
      value: sample,
      writable: false,
      enumerable: false
    })
    
    return mockFile
  } catch (error) {
    console.error('Error creating demo file:', error)
    throw new Error('Failed to create demo file')
  }
}

/**
 * Check if a file is a demo sample
 */
export function isDemoFile(file: File): boolean {
  return 'demoSample' in file
}

/**
 * Get demo sample from file if it's a demo file
 */
export function getDemoSampleFromFile(file: File): DemoSample | null {
  if (isDemoFile(file)) {
    return (file as any).demoSample
  }
  return null
}

/**
 * Validate image file before upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Skip validation for demo files
  if (isDemoFile(file)) {
    return { valid: true }
  }

  // Check file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File must be an image' }
  }

  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 10MB' }
  }

  // Check supported formats
  const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!supportedFormats.includes(file.type)) {
    return { valid: false, error: 'Supported formats: JPEG, PNG, WebP' }
  }

  return { valid: true }
}