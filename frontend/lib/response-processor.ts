/**
 * Response Processor for BioLens Medical Consultation
 * Processes and validates Gemini responses for medical safety compliance
 * Implements response structure validation, content safety checks, and disclaimer injection
 */

import { ConsultationInput, ConsultationResponse, EmergencyContact } from './consultation-engine'
import { GeminiResponse } from './gemini-client'
import { getSafetyValidator, getMedicalComplianceValidator, SafetyCheck } from './safety-validator'

export interface SafetyValidation {
  valid: boolean
  issues: string[]
  warnings: string[]
  riskLevel: 'low' | 'medium' | 'high'
  requiresDisclaimer: boolean
  requiresEmergencyContacts: boolean
}

export interface FormattedConsultation {
  conditionAssessment: string
  symptomCorrelation: string
  recommendations: string[]
  urgencyLevel: 'immediate' | 'within_week' | 'routine' | 'monitor'
  educationalInfo: string
  medicalDisclaimer: string
}

export interface ResponseStructure {
  hasAssessment: boolean
  hasSymptomCorrelation: boolean
  hasRecommendations: boolean
  hasUrgencyLevel: boolean
  hasEducationalInfo: boolean
  hasDisclaimer: boolean
  sectionsFound: string[]
  missingRequired: string[]
}

/**
 * Processes and validates Gemini responses for medical safety
 */
export class ResponseProcessor {
  private safetyValidator: ReturnType<typeof getSafetyValidator>
  private complianceValidator: ReturnType<typeof getMedicalComplianceValidator>
  private prohibitedTerms: string[] = [
    // Definitive diagnostic language
    'i diagnose', 'you have', 'definitely', 'certainly is', 'confirmed diagnosis',
    'you are diagnosed with', 'this is definitely', 'without doubt',
    
    // Treatment prescriptions
    'take this medication', 'prescription', 'prescribe', 'dosage',
    'stop taking', 'increase dose', 'decrease dose', 'medication schedule',
    
    // Medical advice beyond scope
    'surgery is required', 'you need surgery', 'immediate surgery',
    'stop all medications', 'ignore your doctor', 'don\'t see a doctor',
    
    // Inappropriate certainty
    'guaranteed cure', 'will definitely work', 'never fails',
    'always effective', '100% certain', 'no need to worry'
  ]

  private requiredDisclaimerTerms: string[] = [
    'not a substitute', 'professional medical advice', 'consult', 'healthcare provider',
    'medical professional', 'qualified', 'emergency'
  ]

  private urgencyKeywords = {
    immediate: ['immediate', 'urgent', 'emergency', 'right away', 'asap', 'now'],
    within_week: ['within a week', 'soon', 'few days', 'this week', 'promptly'],
    routine: ['routine', 'regular', 'scheduled', 'convenience', 'when possible'],
    monitor: ['monitor', 'watch', 'observe', 'track', 'keep an eye']
  }

  constructor() {
    this.safetyValidator = getSafetyValidator()
    this.complianceValidator = getMedicalComplianceValidator()
  }

  /**
   * Main processing method - converts Gemini response to consultation format
   */
  processResponse(
    geminiResponse: GeminiResponse,
    originalInput: ConsultationInput
  ): ConsultationResponse {
    if (!geminiResponse.success || !geminiResponse.content) {
      throw new Error(`Invalid Gemini response: ${geminiResponse.error || 'No content received'}`)
    }

    console.log('🔍 Raw Gemini response content (first 500 chars):')
    console.log(geminiResponse.content.substring(0, 500) + '...')

    // Step 1: Validate response structure
    const structureValidation = this.validateResponseStructure(geminiResponse.content)
    console.log('📋 Response structure validation:', structureValidation.sectionsFound)
    
    // Step 2: Validate medical safety using SafetyValidator
    const safetyValidation = this.safetyValidator.validateResponse(geminiResponse.content)
    
    // Step 3: Format response for display
    const formattedConsultation = this.formatForDisplay(
      geminiResponse.content, 
      originalInput,
      safetyValidation
    )
    
    console.log('💡 Extracted recommendations count:', formattedConsultation.recommendations.length)
    
    // Step 4: Inject disclaimers and safety information
    const finalConsultation = this.injectDisclaimers(
      formattedConsultation,
      safetyValidation,
      originalInput
    )

    // Step 5: Create initial consultation response
    let consultationResponse: ConsultationResponse = {
      consultation: finalConsultation,
      metadata: {
        modelUsed: geminiResponse.metadata?.modelUsed || 'gemini-1.5-pro',
        processingTime: geminiResponse.metadata?.processingTime || 0,
        confidenceScore: originalInput.analysisResult.overallConfidence,
        fallbackUsed: false,
        safetyValidated: safetyValidation.valid
      },
      emergencyContacts: undefined
    }

    // Step 6: Perform comprehensive compliance check and add emergency contacts
    const complianceCheck = this.complianceValidator.performComprehensiveComplianceCheck(
      consultationResponse,
      originalInput.analysisResult
    )

    // Update consultation response with emergency contacts if needed
    if (complianceCheck.emergencyContactCheck.contactsAdded.length > 0) {
      consultationResponse = complianceCheck.emergencyContactCheck.updatedResponse
    }

    // Step 7: Validate high-risk condition handling if applicable
    if (originalInput.analysisResult.riskLevel === 'high') {
      const highRiskValidation = this.safetyValidator.validateHighRiskHandling(
        geminiResponse.content,
        originalInput.analysisResult,
        consultationResponse
      )

      if (!highRiskValidation.valid) {
        console.warn('High-risk condition handling validation failed:', highRiskValidation.issues)
        // Add additional safety measures for high-risk cases
        consultationResponse = this.enhanceHighRiskResponse(consultationResponse, highRiskValidation.issues)
      }
    }

    // Step 8: Final safety validation (more lenient)
    if (!complianceCheck.overallCompliant && complianceCheck.complianceScore < 40) {
      console.warn('Compliance check failed with low score:', complianceCheck.recommendations)
      consultationResponse.metadata.safetyValidated = false
    } else {
      // Accept responses with warnings but reasonable compliance scores
      consultationResponse.metadata.safetyValidated = complianceCheck.complianceScore >= 40
    }

    return consultationResponse
  }

  /**
   * Validates the structure of the Gemini response
   */
  validateResponseStructure(response: string): ResponseStructure {
    const content = response.toLowerCase()
    const sections = {
      hasAssessment: this.containsSection(content, ['assessment', 'condition', 'analysis']),
      hasSymptomCorrelation: this.containsSection(content, ['symptom', 'correlation', 'symptoms']),
      hasRecommendations: this.containsSection(content, ['recommendation', 'suggest', 'advice']),
      hasUrgencyLevel: this.containsSection(content, ['urgency', 'urgent', 'immediate', 'timeline']),
      hasEducationalInfo: this.containsSection(content, ['educational', 'information', 'about', 'learn']),
      hasDisclaimer: this.containsSection(content, ['disclaimer', 'not a substitute', 'professional'])
    }

    const sectionsFound = Object.entries(sections)
      .filter(([_, found]) => found)
      .map(([section, _]) => section)

    const requiredSections = ['hasAssessment', 'hasRecommendations']
    const missingRequired = requiredSections.filter(section => !sections[section as keyof typeof sections])

    return {
      ...sections,
      sectionsFound,
      missingRequired
    }
  }

  /**
   * Validates medical safety of the response content using SafetyValidator
   */
  validateMedicalSafety(response: string): SafetyValidation {
    // Use the dedicated SafetyValidator for comprehensive safety checking
    const safetyCheck = this.safetyValidator.validateResponse(response)
    
    // Convert SafetyCheck to SafetyValidation format for backward compatibility
    return {
      valid: safetyCheck.valid,
      issues: safetyCheck.issues,
      warnings: safetyCheck.warnings,
      riskLevel: safetyCheck.riskLevel,
      requiresDisclaimer: safetyCheck.requiresDisclaimer,
      requiresEmergencyContacts: safetyCheck.requiresEmergencyContacts
    }
  }

  /**
   * Formats the response for optimal display
   */
  formatForDisplay(
    response: string, 
    originalInput: ConsultationInput,
    safetyValidation: SafetyValidation
  ): FormattedConsultation {
    // Parse structured sections from response
    const conditionAssessment = this.extractSection(response, 'assessment') || 
                               this.extractSection(response, 'condition') ||
                               this.generateFallbackAssessment(originalInput)

    const symptomCorrelation = this.extractSection(response, 'symptom') ||
                              this.generateSymptomCorrelation(originalInput)

    const recommendations = this.extractRecommendations(response) ||
                           this.generateFallbackRecommendations(originalInput)

    const urgencyLevel = this.extractUrgencyLevel(response) ||
                        this.determineUrgencyFromRisk(originalInput.analysisResult.riskLevel)

    const educationalInfo = this.extractSection(response, 'educational') ||
                           this.extractSection(response, 'information') ||
                           this.generateEducationalInfo(originalInput)

    // Generate base disclaimer (will be enhanced in injectDisclaimers)
    const medicalDisclaimer = this.generateBaseDisclaimer()

    return {
      conditionAssessment: this.sanitizeContent(conditionAssessment),
      symptomCorrelation: this.sanitizeContent(symptomCorrelation),
      recommendations: recommendations.map(rec => this.sanitizeContent(rec)),
      urgencyLevel,
      educationalInfo: this.sanitizeContent(educationalInfo),
      medicalDisclaimer
    }
  }

  /**
   * Injects comprehensive disclaimers and safety information
   */
  injectDisclaimers(
    consultation: FormattedConsultation,
    safetyValidation: SafetyValidation,
    originalInput: ConsultationInput
  ): FormattedConsultation {
    // Enhanced medical disclaimer based on risk level
    let disclaimer = this.generateEnhancedDisclaimer(safetyValidation.riskLevel)

    // Add specific warnings based on safety validation
    if (safetyValidation.issues.length > 0) {
      disclaimer += '\n\n⚠️ **ADDITIONAL SAFETY NOTICE**: This response has been processed to ensure medical safety compliance.'
    }

    // Add risk-specific disclaimers
    if (originalInput.analysisResult.riskLevel === 'high') {
      disclaimer += '\n\n🚨 **HIGH-RISK CONDITION NOTICE**: The analysis suggests a condition that may require immediate medical attention. Do not delay in seeking professional healthcare evaluation.'
    }

    // Enhance recommendations with safety prefixes
    const enhancedRecommendations = consultation.recommendations.map(rec => {
      if (!rec.toLowerCase().includes('consult') && !rec.toLowerCase().includes('see') && 
          !rec.toLowerCase().includes('doctor') && !rec.toLowerCase().includes('healthcare')) {
        return `Consider discussing with a healthcare provider: ${rec}`
      }
      return rec
    })

    console.log('🔧 Enhanced recommendations count:', enhancedRecommendations.length)

    return {
      ...consultation,
      recommendations: enhancedRecommendations,
      medicalDisclaimer: disclaimer
    }
  }

  /**
   * Enhances response for high-risk conditions with additional safety measures
   */
  private enhanceHighRiskResponse(
    consultationResponse: ConsultationResponse,
    validationIssues: string[]
  ): ConsultationResponse {
    const enhanced = { ...consultationResponse }

    // Enhance condition assessment with urgent language if missing
    if (validationIssues.some(issue => issue.includes('urgent language'))) {
      enhanced.consultation.conditionAssessment = 
        '🚨 **URGENT MEDICAL ATTENTION REQUIRED** 🚨\n\n' + 
        enhanced.consultation.conditionAssessment
    }

    // Ensure urgency level is set to immediate for high-risk conditions
    if (enhanced.consultation.urgencyLevel !== 'immediate') {
      enhanced.consultation.urgencyLevel = 'immediate'
    }

    // Add emergency contacts if missing
    if (validationIssues.some(issue => issue.includes('emergency contact')) && !enhanced.emergencyContacts) {
      enhanced.emergencyContacts = this.safetyValidator.generateEmergencyContacts(
        'immediate',
        'high'
      )
    }

    // Enhance recommendations with urgent care emphasis
    const urgentRecommendations = [
      '🚨 CRITICAL: Seek immediate medical attention - do not delay',
      'Contact a dermatologist or emergency services without delay',
      'Time is critical for this type of condition'
    ]

    enhanced.consultation.recommendations = [
      ...urgentRecommendations,
      ...enhanced.consultation.recommendations.filter(rec => 
        !rec.toLowerCase().includes('monitor') && 
        !rec.toLowerCase().includes('wait')
      )
    ]

    // Enhance medical disclaimer for high-risk cases
    enhanced.consultation.medicalDisclaimer = 
      '🚨 **CRITICAL HIGH-RISK CONDITION NOTICE**: ' +
      enhanced.consultation.medicalDisclaimer +
      ' This condition may be life-threatening and requires IMMEDIATE professional medical evaluation.'

    return enhanced
  }

  /**
   * Checks for prohibited content that violates medical safety guidelines
   */
  checkForProhibitedContent(text: string): boolean {
    // Delegate to SafetyValidator for consistency
    const result = this.safetyValidator.checkForProhibitedContent(text)
    return !result.valid
  }

  /**
   * Ensures medical disclaimers are present and adequate
   */
  ensureDisclaimersPresent(text: string): boolean {
    // Delegate to SafetyValidator for consistency
    return this.safetyValidator.ensureDisclaimersPresent(text)
  }

  /**
   * Extracts a specific section from the response
   */
  private extractSection(response: string, sectionType: string): string | null {
    const lines = response.split('\n')
    const sectionPatterns = {
      assessment: /^\s*\*\*.*?(assessment|condition|analysis).*?\*\*:?/i,
      symptom: /^\s*\*\*.*?(symptom|correlation).*?\*\*:?/i,
      recommendation: /^\s*\*\*.*?(recommendation|suggest|advice).*?\*\*:?/i,
      educational: /^\s*\*\*.*?(educational|information|about|learn).*?\*\*:?/i,
      urgency: /^\s*\*\*.*?(urgency|urgent|timeline).*?\*\*:?/i
    }

    const pattern = sectionPatterns[sectionType as keyof typeof sectionPatterns]
    if (!pattern) return null

    const sectionStart = lines.findIndex(line => pattern.test(line))
    if (sectionStart === -1) return null

    let sectionContent = ''
    for (let i = sectionStart + 1; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Stop at next section header (starts with **)
      if (line.match(/^\s*\*\*.*?\*\*:?/) && i > sectionStart + 1) {
        break
      }
      
      if (line) {
        sectionContent += line + ' '
      }
    }

    return sectionContent.trim() || null
  }

  /**
   * Extracts recommendations from the response
   */
  private extractRecommendations(response: string): string[] {
    const lines = response.split('\n')
    const recommendations: string[] = []
    
    let inRecommendations = false
    for (const line of lines) {
      const trimmed = line.trim()
      
      if (trimmed.match(/^\s*\*\*.*?(recommendation|suggest|advice).*?\*\*:?/i)) {
        inRecommendations = true
        continue
      }
      
      if (inRecommendations) {
        // Stop at next major section (starts with **)
        if (trimmed.match(/^\s*\*\*.*?\*\*:?/) && !trimmed.match(/recommendation|suggest|advice/i)) {
          break
        }
        
        // Extract list items
        if (trimmed.match(/^[-•*]\s/) || trimmed.match(/^\d+\.\s/)) {
          const cleanRec = trimmed.replace(/^[-•*\d.]\s*/, '').trim()
          if (cleanRec) {
            recommendations.push(cleanRec)
          }
        } else if (trimmed && !trimmed.match(/^\s*\*\*.*?\*\*:?/)) {
          // Handle non-list format recommendations
          recommendations.push(trimmed)
        }
      }
    }
    
    return recommendations.length > 0 ? recommendations : []
  }

  /**
   * Extracts urgency level from response content
   */
  private extractUrgencyLevel(response: string): 'immediate' | 'within_week' | 'routine' | 'monitor' | null {
    const content = response.toLowerCase()
    
    // Check each urgency level in order of priority
    for (const [level, keywords] of Object.entries(this.urgencyKeywords)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        return level as 'immediate' | 'within_week' | 'routine' | 'monitor'
      }
    }
    
    return null
  }

  /**
   * Checks if content contains any of the specified section indicators
   */
  private containsSection(content: string, indicators: string[]): boolean {
    return indicators.some(indicator => content.includes(indicator))
  }

  /**
   * Sanitizes content to remove potentially harmful elements
   */
  private sanitizeContent(content: string): string {
    if (!content) return ''
    
    // Remove HTML tags
    let sanitized = content.replace(/<[^>]*>/g, '')
    
    // Remove excessive whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim()
    
    // Remove prohibited terms by replacing with safer alternatives
    this.prohibitedTerms.forEach(term => {
      const regex = new RegExp(term, 'gi')
      sanitized = sanitized.replace(regex, (match) => {
        if (match.toLowerCase().includes('diagnose')) {
          return 'suggest the possibility of'
        } else if (match.toLowerCase().includes('definitely')) {
          return 'likely'
        } else if (match.toLowerCase().includes('prescription')) {
          return 'professional medical evaluation for treatment options'
        }
        return 'professional medical consultation recommended'
      })
    })
    
    return sanitized
  }

  /**
   * Generates fallback assessment when extraction fails
   */
  private generateFallbackAssessment(input: ConsultationInput): string {
    const topPrediction = input.analysisResult.predictions[0]
    const confidence = (input.analysisResult.overallConfidence * 100).toFixed(1)
    
    return `Based on the analysis, the most likely condition appears to be ${topPrediction.condition} with ${confidence}% confidence. This assessment is based on visual pattern analysis and should be confirmed by a healthcare professional.`
  }

  /**
   * Generates symptom correlation when extraction fails
   */
  private generateSymptomCorrelation(input: ConsultationInput): string {
    if (!input.symptoms || input.symptoms.trim().length === 0) {
      return 'No symptoms were provided for correlation analysis. The assessment is based solely on visual analysis.'
    }
    
    return `Your reported symptoms have been considered alongside the visual analysis. Professional evaluation can provide more comprehensive correlation between symptoms and potential conditions.`
  }

  /**
   * Generates fallback recommendations
   */
  private generateFallbackRecommendations(input: ConsultationInput): string[] {
    const riskLevel = input.analysisResult.riskLevel
    const recommendations: string[] = []
    
    if (riskLevel === 'high') {
      recommendations.push('Seek immediate medical attention from a healthcare provider')
      recommendations.push('Do not delay professional evaluation for high-risk conditions')
    } else if (riskLevel === 'moderate') {
      recommendations.push('Schedule an appointment with a healthcare provider within 1-2 weeks')
      recommendations.push('Monitor the condition and seek immediate care if it worsens')
    } else {
      recommendations.push('Consider consulting a healthcare provider if symptoms persist')
      recommendations.push('Continue monitoring and maintain good skin care practices')
    }
    
    recommendations.push('Take photos to track any changes over time')
    recommendations.push('Maintain good skin hygiene and avoid known irritants')
    
    return recommendations
  }

  /**
   * Determines urgency level from risk assessment
   */
  private determineUrgencyFromRisk(riskLevel: 'low' | 'moderate' | 'high'): 'immediate' | 'within_week' | 'routine' | 'monitor' {
    switch (riskLevel) {
      case 'high': return 'immediate'
      case 'moderate': return 'within_week'
      case 'low': return 'monitor'
      default: return 'routine'
    }
  }

  /**
   * Generates educational information when extraction fails
   */
  private generateEducationalInfo(input: ConsultationInput): string {
    const condition = input.analysisResult.predictions[0]
    return condition.description || 'Professional medical consultation can provide detailed information about this condition and appropriate treatment options.'
  }

  /**
   * Generates base medical disclaimer
   */
  private generateBaseDisclaimer(): string {
    return '⚠️ **IMPORTANT MEDICAL DISCLAIMER**: This AI-powered analysis is for informational purposes only and is NOT a substitute for professional medical advice, diagnosis, or treatment.'
  }

  /**
   * Generates enhanced disclaimer based on risk level
   */
  private generateEnhancedDisclaimer(riskLevel: 'low' | 'medium' | 'high'): string {
    let disclaimer = this.generateBaseDisclaimer()
    
    disclaimer += ' Always consult a qualified healthcare provider for any health concerns or before making medical decisions.'
    
    if (riskLevel === 'high') {
      disclaimer += ' **HIGH-RISK CONDITIONS REQUIRE IMMEDIATE PROFESSIONAL EVALUATION.** Do not delay seeking medical care.'
    } else if (riskLevel === 'medium') {
      disclaimer += ' This analysis has been processed for safety compliance. Professional evaluation is strongly recommended.'
    }
    
    disclaimer += ' If you have a medical emergency, call emergency services immediately.'
    
    return disclaimer
  }

  /**
   * Generates emergency contacts based on safety validation and risk level
   */
  private generateEmergencyContacts(
    safetyValidation: SafetyValidation,
    riskLevel: 'low' | 'moderate' | 'high'
  ): EmergencyContact[] {
    const contacts: EmergencyContact[] = []
    
    if (safetyValidation.requiresEmergencyContacts || riskLevel === 'high') {
      contacts.push({
        type: 'emergency',
        name: 'Emergency Services',
        phone: '911',
        description: 'For immediate medical emergencies'
      })
      
      contacts.push({
        type: 'dermatologist',
        name: 'Dermatologist',
        phone: 'Contact your healthcare provider',
        description: 'Specialized skin condition evaluation and treatment'
      })
    }
    
    if (riskLevel !== 'low') {
      contacts.push({
        type: 'urgent_care',
        name: 'Urgent Care',
        phone: 'Find local urgent care center',
        description: 'For urgent but non-emergency medical needs'
      })
    }
    
    return contacts
  }
}

/**
 * Create a singleton instance of the response processor
 */
let responseProcessorInstance: ResponseProcessor | null = null

/**
 * Get the singleton response processor instance
 */
export function getResponseProcessor(): ResponseProcessor {
  if (!responseProcessorInstance) {
    responseProcessorInstance = new ResponseProcessor()
  }
  return responseProcessorInstance
}

/**
 * Process a Gemini response with safety validation
 */
export async function processGeminiResponse(
  geminiResponse: GeminiResponse,
  originalInput: ConsultationInput
): Promise<ConsultationResponse> {
  const processor = getResponseProcessor()
  return processor.processResponse(geminiResponse, originalInput)
}

/**
 * Validate response safety without full processing
 */
export function validateResponseSafety(response: string): SafetyValidation {
  const processor = getResponseProcessor()
  return processor.validateMedicalSafety(response)
}