/**
 * Safety Validator for BioLens Medical Consultation
 * Ensures all responses meet medical safety standards and compliance requirements
 * Validates medical disclaimers, prohibited content detection, and urgency assessment
 */

import { ConsultationResponse, EmergencyContact, RiskLevel } from './consultation-engine'
import { DetectedCondition, AnalysisResult } from './api-client'

export interface SafetyCheck {
  valid: boolean
  issues: string[]
  warnings: string[]
  riskLevel: 'low' | 'medium' | 'high'
  requiresDisclaimer: boolean
  requiresEmergencyContacts: boolean
  urgencyAssessment: UrgencyAssessment
}

export interface UrgencyAssessment {
  level: 'immediate' | 'urgent' | 'moderate' | 'routine'
  factors: string[]
  timeframe: string
  emergencyIndicators: string[]
}

export interface MedicalComplianceCheck {
  hasValidDisclaimer: boolean
  avoidsDiagnosticLanguage: boolean
  emphasizesProfessionalConsultation: boolean
  includesEmergencyContacts: boolean
  usesAppropriateCertaintyLanguage: boolean
  complianceScore: number
  violations: string[]
}

/**
 * Safety Validator Class
 * Comprehensive medical safety validation and compliance checking
 */
export class SafetyValidator {
  private readonly prohibitedTerms: string[]
  private readonly diagnosticLanguage: string[]
  private readonly requiredDisclaimerTerms: string[]
  private readonly emergencyIndicators: string[]
  private readonly highRiskConditions: Set<string>
  private readonly urgencyKeywords: Record<string, string[]>

  constructor() {
    // Prohibited medical terms that violate safety guidelines
    this.prohibitedTerms = [
      // Definitive diagnostic language
      'i diagnose', 'you have', 'definitely', 'certainly is', 'confirmed diagnosis',
      'you are diagnosed with', 'this is definitely', 'without doubt', 'conclusively',
      'positively identified', 'medical diagnosis', 'final diagnosis',
      
      // Treatment prescriptions
      'take this medication', 'prescription', 'prescribe', 'dosage', 'mg', 'ml',
      'stop taking', 'increase dose', 'decrease dose', 'medication schedule',
      'drug interaction', 'pharmaceutical', 'rx', 'prescription drug',
      
      // Medical advice beyond scope
      'surgery is required', 'you need surgery', 'immediate surgery',
      'stop all medications', 'ignore your doctor', 'don\'t see a doctor',
      'cancel appointment', 'avoid medical care', 'self-treat',
      
      // Inappropriate certainty
      'guaranteed cure', 'will definitely work', 'never fails',
      'always effective', '100% certain', 'no need to worry',
      'completely safe', 'risk-free', 'impossible to be wrong'
    ]

    // Diagnostic language that should be avoided
    this.diagnosticLanguage = [
      'diagnosis', 'diagnosed', 'diagnose', 'medical condition is',
      'you suffer from', 'afflicted with', 'disease is', 'illness is',
      'pathology shows', 'clinical diagnosis', 'medical determination'
    ]

    // Required terms for valid medical disclaimers
    this.requiredDisclaimerTerms = [
      'not a substitute', 'professional medical advice', 'consult', 'healthcare provider',
      'medical professional', 'qualified', 'emergency', 'informational purposes',
      'not intended', 'seek medical attention', 'healthcare consultation'
    ]

    // Emergency indicators requiring immediate attention
    this.emergencyIndicators = [
      'bleeding', 'rapid growth', 'sudden change', 'severe pain',
      'difficulty breathing', 'fever', 'infection signs', 'pus',
      'red streaking', 'swollen lymph nodes', 'systemic symptoms',
      'neurological symptoms', 'vision changes', 'consciousness'
    ]

    // High-risk conditions requiring urgent care
    this.highRiskConditions = new Set([
      'melanoma', 'carcinoma', 'cancer', 'malignant', 'tumor',
      'neoplasm', 'sarcoma', 'lymphoma', 'metastatic', 'aggressive',
      'invasive', 'basal cell carcinoma', 'squamous cell carcinoma'
    ])

    // Keywords for urgency level assessment
    this.urgencyKeywords = {
      immediate: [
        'immediate', 'emergency', 'urgent', 'critical', 'asap', 'now',
        'right away', 'without delay', 'immediately', 'emergent'
      ],
      urgent: [
        'soon', 'promptly', 'within days', 'this week', 'quickly',
        'expedited', 'priority', 'timely', 'rapid'
      ],
      moderate: [
        'within a week', 'few days', 'scheduled', 'planned',
        'routine appointment', 'regular care', 'follow-up'
      ],
      routine: [
        'routine', 'regular', 'convenience', 'when possible',
        'at your leisure', 'standard care', 'maintenance'
      ]
    }
  }

  /**
   * Main validation method - comprehensive safety check
   */
  validateResponse(response: string): SafetyCheck {
    const issues: string[] = []
    const warnings: string[] = []

    // Check for prohibited content
    const prohibitedCheck = this.checkForProhibitedContent(response)
    if (!prohibitedCheck.valid) {
      issues.push(...prohibitedCheck.violations)
    }

    // Validate medical disclaimers
    const disclaimerCheck = this.ensureDisclaimersPresent(response)
    if (!disclaimerCheck) {
      issues.push('Required medical disclaimers are missing or insufficient')
    }

    // Check for diagnostic language
    const diagnosticCheck = this.checkDiagnosticLanguage(response)
    if (diagnosticCheck.violations.length > 0) {
      issues.push(...diagnosticCheck.violations)
    }

    // Assess urgency level
    const urgencyAssessment = this.assessUrgencyLevel(response)

    // Check for appropriate uncertainty language
    const certaintyCheck = this.validateCertaintyLanguage(response)
    if (!certaintyCheck.valid) {
      warnings.push(...certaintyCheck.issues)
    }

    // Determine overall risk level
    const riskLevel = this.determineOverallRiskLevel(response, urgencyAssessment)

    // Check if emergency contacts are needed
    const requiresEmergencyContacts = this.shouldIncludeEmergencyContacts(
      response, 
      urgencyAssessment, 
      riskLevel
    )

    return {
      valid: issues.length === 0,
      issues,
      warnings,
      riskLevel,
      requiresDisclaimer: !disclaimerCheck || riskLevel !== 'low',
      requiresEmergencyContacts,
      urgencyAssessment
    }
  }

  /**
   * Checks for prohibited content that violates medical safety guidelines
   */
  checkForProhibitedContent(text: string): { valid: boolean; violations: string[] } {
    const content = text.toLowerCase()
    const violations: string[] = []

    this.prohibitedTerms.forEach(term => {
      if (content.includes(term)) {
        violations.push(`Contains prohibited medical language: "${term}"`)
      }
    })

    return {
      valid: violations.length === 0,
      violations
    }
  }

  /**
   * Ensures medical disclaimers are present and adequate
   */
  ensureDisclaimersPresent(text: string): boolean {
    const content = text.toLowerCase()
    
    // Count how many required disclaimer terms are present
    const foundTerms = this.requiredDisclaimerTerms.filter(term => 
      content.includes(term)
    )

    // Require at least 4 key disclaimer terms for adequate coverage
    const hasAdequateDisclaimer = foundTerms.length >= 4

    // Check for specific critical phrases
    const hasCriticalPhrases = [
      'not a substitute for professional medical advice',
      'consult a healthcare provider',
      'informational purposes only'
    ].some(phrase => content.includes(phrase))

    return hasAdequateDisclaimer && hasCriticalPhrases
  }

  /**
   * Checks for inappropriate diagnostic language
   */
  private checkDiagnosticLanguage(text: string): { violations: string[] } {
    const content = text.toLowerCase()
    const violations: string[] = []

    this.diagnosticLanguage.forEach(term => {
      if (content.includes(term)) {
        violations.push(`Contains inappropriate diagnostic language: "${term}"`)
      }
    })

    return { violations }
  }

  /**
   * Validates appropriate uncertainty language usage
   */
  private validateCertaintyLanguage(text: string): { valid: boolean; issues: string[] } {
    const content = text.toLowerCase()
    const issues: string[] = []

    // Check for appropriate uncertainty indicators
    const uncertaintyIndicators = [
      'might', 'could', 'may', 'possibly', 'appears', 'suggests',
      'likely', 'potential', 'probable', 'seems', 'indicates'
    ]

    const hasUncertaintyLanguage = uncertaintyIndicators.some(indicator => 
      content.includes(indicator)
    )

    if (!hasUncertaintyLanguage) {
      issues.push('Response lacks appropriate uncertainty language for medical context')
    }

    // Check for overly certain language
    const certaintyIndicators = [
      'absolutely', 'definitely', 'certainly', 'without doubt',
      'guaranteed', 'always', 'never', '100%'
    ]

    const hasOverCertainty = certaintyIndicators.some(indicator => 
      content.includes(indicator)
    )

    if (hasOverCertainty) {
      issues.push('Response contains inappropriate certainty language for medical context')
    }

    return {
      valid: hasUncertaintyLanguage && !hasOverCertainty,
      issues
    }
  }

  /**
   * Assesses urgency level based on content analysis
   */
  assessUrgencyLevel(response: string, riskFactors?: string[]): UrgencyAssessment {
    const content = response.toLowerCase()
    const factors: string[] = []
    const emergencyIndicators: string[] = []
    let level: 'immediate' | 'urgent' | 'moderate' | 'routine' = 'routine'
    let timeframe = 'No specific timeframe indicated'

    // Check for emergency indicators first
    this.emergencyIndicators.forEach(indicator => {
      if (content.includes(indicator)) {
        emergencyIndicators.push(indicator)
        factors.push(`Emergency indicator detected: ${indicator}`)
      }
    })

    // Check for high-risk conditions
    Array.from(this.highRiskConditions).forEach(condition => {
      if (content.includes(condition)) {
        factors.push(`High-risk condition mentioned: ${condition}`)
        if (level === 'routine') level = 'urgent'
      }
    })

    // Assess urgency keywords in order of priority (most urgent first)
    if (this.urgencyKeywords.immediate.some(keyword => content.includes(keyword))) {
      level = 'immediate'
      timeframe = 'Seek care immediately'
      factors.push(`Immediate indicators: ${this.urgencyKeywords.immediate.filter(k => content.includes(k)).join(', ')}`)
    } else if (this.urgencyKeywords.urgent.some(keyword => content.includes(keyword))) {
      if (level === 'routine') level = 'urgent'
      timeframe = 'Seek care within 1-3 days'
      factors.push(`Urgent indicators: ${this.urgencyKeywords.urgent.filter(k => content.includes(k)).join(', ')}`)
    } else if (this.urgencyKeywords.moderate.some(keyword => content.includes(keyword))) {
      if (level === 'routine') level = 'moderate'
      timeframe = 'Schedule care within 1-2 weeks'
      factors.push(`Moderate indicators: ${this.urgencyKeywords.moderate.filter(k => content.includes(k)).join(', ')}`)
    } else if (this.urgencyKeywords.routine.some(keyword => content.includes(keyword))) {
      // Only set to routine if no higher priority found
      if (level === 'routine' && factors.length === 0) {
        factors.push(`Routine indicators: ${this.urgencyKeywords.routine.filter(k => content.includes(k)).join(', ')}`)
      }
    }

    // Override based on emergency indicators
    if (emergencyIndicators.length > 0) {
      level = 'immediate'
      timeframe = 'Seek emergency care immediately'
    }

    // Include external risk factors if provided
    if (riskFactors && riskFactors.length > 0) {
      factors.push(...riskFactors)
    }

    return {
      level,
      factors,
      timeframe,
      emergencyIndicators
    }
  }

  /**
   * Determines overall risk level for the response
   */
  private determineOverallRiskLevel(
    response: string, 
    urgencyAssessment: UrgencyAssessment
  ): 'low' | 'medium' | 'high' {
    const content = response.toLowerCase()

    // High risk indicators
    if (urgencyAssessment.level === 'immediate' || 
        urgencyAssessment.emergencyIndicators.length > 0) {
      return 'high'
    }

    // Check for high-risk conditions
    const hasHighRiskCondition = Array.from(this.highRiskConditions).some(condition =>
      content.includes(condition)
    )

    if (hasHighRiskCondition) {
      return 'high'
    }

    // Medium risk indicators
    if (urgencyAssessment.level === 'urgent' || 
        urgencyAssessment.factors.length > 2) {
      return 'medium'
    }

    // Check for prohibited content (medium risk)
    const prohibitedCheck = this.checkForProhibitedContent(response)
    if (!prohibitedCheck.valid) {
      return 'medium'
    }

    // Check disclaimer adequacy
    const hasAdequateDisclaimer = this.ensureDisclaimersPresent(response)
    if (!hasAdequateDisclaimer) {
      return 'medium'
    }

    return 'low'
  }

  /**
   * Determines if emergency contacts should be included
   */
  private shouldIncludeEmergencyContacts(
    response: string,
    urgencyAssessment: UrgencyAssessment,
    riskLevel: 'low' | 'medium' | 'high'
  ): boolean {
    // Always include for high-risk or immediate urgency
    if (riskLevel === 'high' || urgencyAssessment.level === 'immediate') {
      return true
    }

    // Include for urgent cases
    if (urgencyAssessment.level === 'urgent') {
      return true
    }

    // Include if emergency indicators are present
    if (urgencyAssessment.emergencyIndicators.length > 0) {
      return true
    }

    // Include for medium risk with multiple factors
    if (riskLevel === 'medium' && urgencyAssessment.factors.length > 1) {
      return true
    }

    return false
  }

  /**
   * Validates medical disclaimer presence and quality
   */
  validateMedicalDisclaimer(disclaimer: string): {
    valid: boolean
    issues: string[]
    completeness: number
  } {
    const issues: string[] = []
    let completeness = 0

    if (!disclaimer || disclaimer.trim().length === 0) {
      issues.push('Medical disclaimer is missing')
      return { valid: false, issues, completeness: 0 }
    }

    const disclaimerLower = disclaimer.toLowerCase()

    // Check for required elements
    const requiredElements = [
      { text: 'not a substitute', weight: 25 },
      { text: 'professional medical advice', weight: 25 },
      { text: 'informational purposes', weight: 15 },
      { text: 'consult', weight: 15 },
      { text: 'healthcare provider', weight: 10 },
      { text: 'emergency', weight: 10 }
    ]

    requiredElements.forEach(element => {
      if (disclaimerLower.includes(element.text)) {
        completeness += element.weight
      } else {
        issues.push(`Missing required disclaimer element: "${element.text}"`)
      }
    })

    // Check for appropriate emphasis (bold, caps, etc.)
    const hasEmphasis = disclaimer.includes('**') || disclaimer.includes('⚠️') || 
                       disclaimer.includes('IMPORTANT') || disclaimer.includes('WARNING')
    
    if (!hasEmphasis) {
      issues.push('Disclaimer lacks visual emphasis (bold, warning symbols, etc.)')
    } else {
      completeness += 10
    }

    return {
      valid: completeness >= 75 && issues.length <= 2,
      issues,
      completeness: Math.min(completeness, 100)
    }
  }

  /**
   * Comprehensive medical compliance check
   */
  performComplianceCheck(consultationResponse: ConsultationResponse): MedicalComplianceCheck {
    const response = JSON.stringify(consultationResponse.consultation)
    const violations: string[] = []

    // Check disclaimer validity
    const disclaimerCheck = this.validateMedicalDisclaimer(
      consultationResponse.consultation.medicalDisclaimer
    )
    const hasValidDisclaimer = disclaimerCheck.valid

    if (!hasValidDisclaimer) {
      violations.push(...disclaimerCheck.issues)
    }

    // Check for diagnostic language avoidance
    const diagnosticCheck = this.checkDiagnosticLanguage(response)
    const avoidsDiagnosticLanguage = diagnosticCheck.violations.length === 0

    if (!avoidsDiagnosticLanguage) {
      violations.push(...diagnosticCheck.violations)
    }

    // Check professional consultation emphasis
    const emphasizesProfessionalConsultation = this.checkProfessionalConsultationEmphasis(response)
    
    if (!emphasizesProfessionalConsultation) {
      violations.push('Insufficient emphasis on professional medical consultation')
    }

    // Check emergency contacts for urgent cases
    const urgencyAssessment = this.assessUrgencyLevel(response)
    const shouldHaveContacts = this.shouldIncludeEmergencyContacts(response, urgencyAssessment, 'medium')
    const includesEmergencyContacts = !!consultationResponse.emergencyContacts && 
                                     consultationResponse.emergencyContacts.length > 0

    if (shouldHaveContacts && !includesEmergencyContacts) {
      violations.push('Missing required emergency contact information for urgent case')
    }

    // Check certainty language appropriateness
    const certaintyCheck = this.validateCertaintyLanguage(response)
    const usesAppropriateCertaintyLanguage = certaintyCheck.valid

    if (!usesAppropriateCertaintyLanguage) {
      violations.push(...certaintyCheck.issues)
    }

    // Calculate compliance score
    const checks = [
      hasValidDisclaimer,
      avoidsDiagnosticLanguage,
      emphasizesProfessionalConsultation,
      includesEmergencyContacts || !shouldHaveContacts,
      usesAppropriateCertaintyLanguage
    ]

    const complianceScore = (checks.filter(Boolean).length / checks.length) * 100

    return {
      hasValidDisclaimer,
      avoidsDiagnosticLanguage,
      emphasizesProfessionalConsultation,
      includesEmergencyContacts: includesEmergencyContacts || !shouldHaveContacts,
      usesAppropriateCertaintyLanguage,
      complianceScore,
      violations
    }
  }

  /**
   * Checks if response adequately emphasizes professional consultation
   */
  private checkProfessionalConsultationEmphasis(response: string): boolean {
    const content = response.toLowerCase()
    
    const consultationTerms = [
      'consult a healthcare provider',
      'see a doctor',
      'medical professional',
      'healthcare consultation',
      'professional medical advice',
      'seek medical attention',
      'contact your doctor'
    ]

    // Require at least 2 different consultation emphasis phrases
    const foundTerms = consultationTerms.filter(term => content.includes(term))
    return foundTerms.length >= 2
  }

  /**
   * Generates emergency contact information for urgent cases
   */
  generateEmergencyContacts(
    urgencyLevel: 'immediate' | 'urgent' | 'moderate' | 'routine',
    riskLevel: 'low' | 'medium' | 'high',
    conditionType?: string
  ): EmergencyContact[] {
    const contacts: EmergencyContact[] = []

    if (urgencyLevel === 'immediate' || riskLevel === 'high') {
      // Critical cases need all emergency contacts
      contacts.push({
        type: 'emergency',
        name: 'Emergency Services',
        phone: '911',
        description: 'For immediate life-threatening medical emergencies'
      })

      contacts.push({
        type: 'dermatologist',
        name: 'Dermatology Emergency',
        phone: 'Contact your dermatologist immediately or call their emergency line',
        description: 'Specialized urgent skin condition evaluation'
      })

      contacts.push({
        type: 'urgent_care',
        name: 'Urgent Care Center',
        phone: 'Find nearest 24-hour urgent care facility',
        description: 'For urgent medical evaluation when emergency room may not be necessary'
      })
    } else if (urgencyLevel === 'urgent' || riskLevel === 'medium') {
      // Urgent cases need dermatologist and urgent care
      contacts.push({
        type: 'dermatologist',
        name: 'Dermatologist',
        phone: 'Schedule urgent appointment with dermatologist',
        description: 'Specialized skin condition diagnosis and treatment'
      })

      contacts.push({
        type: 'urgent_care',
        name: 'Urgent Care',
        phone: 'Visit urgent care center for prompt evaluation',
        description: 'Same-day medical evaluation for urgent but non-emergency conditions'
      })
    }

    return contacts
  }

  /**
   * Validates high-risk condition handling completeness
   */
  validateHighRiskHandling(
    response: string,
    analysisResult: AnalysisResult,
    consultationResponse: ConsultationResponse
  ): { valid: boolean; issues: string[] } {
    const issues: string[] = []
    const content = response.toLowerCase()

    // Check if this is a high-risk condition
    const isHighRisk = analysisResult.riskLevel === 'high' ||
                      Array.from(this.highRiskConditions).some(condition =>
                        analysisResult.topPrediction.toLowerCase().includes(condition)
                      )

    if (!isHighRisk) {
      return { valid: true, issues: [] }
    }

    // For high-risk conditions, validate required elements
    
    // 1. Must have urgent language
    const urgentTerms = ['immediate', 'urgent', 'critical', 'emergency', 'asap']
    const hasUrgentLanguage = urgentTerms.some(term => content.includes(term))
    
    if (!hasUrgentLanguage) {
      issues.push('High-risk conditions must include urgent language (immediate, urgent, critical, emergency)')
    }

    // 2. Must have emergency contacts
    if (!consultationResponse.emergencyContacts || consultationResponse.emergencyContacts.length === 0) {
      issues.push('High-risk conditions must include emergency contact information')
    }

    // 3. Must not suggest waiting or monitoring
    const delayingTerms = ['wait and see', 'monitor for now', 'wait a few weeks', 'observe for changes']
    const hasDelayingLanguage = delayingTerms.some(term => content.includes(term))
    
    if (hasDelayingLanguage) {
      issues.push('High-risk conditions must not suggest waiting, monitoring, or delaying care')
    }

    // 4. Must emphasize time sensitivity
    const timeSensitiveTerms = ['time is critical', 'do not delay', 'seek care immediately', 'without delay']
    const hasTimeSensitivity = timeSensitiveTerms.some(term => content.includes(term))
    
    if (!hasTimeSensitivity) {
      issues.push('High-risk conditions must emphasize time-sensitive nature of care')
    }

    // 5. Must have appropriate urgency level
    if (consultationResponse.consultation.urgencyLevel !== 'immediate') {
      issues.push('High-risk conditions must have "immediate" urgency level')
    }

    return {
      valid: issues.length === 0,
      issues
    }
  }
}

/**
 * Create a singleton instance of the safety validator
 */
let safetyValidatorInstance: SafetyValidator | null = null

/**
 * Get the singleton safety validator instance
 */
export function getSafetyValidator(): SafetyValidator {
  if (!safetyValidatorInstance) {
    safetyValidatorInstance = new SafetyValidator()
  }
  return safetyValidatorInstance
}

/**
 * Validate response safety (convenience function)
 */
export function validateResponseSafety(response: string): SafetyCheck {
  const validator = getSafetyValidator()
  return validator.validateResponse(response)
}

/**
 * Perform comprehensive compliance check (convenience function)
 */
export function performMedicalComplianceCheck(consultationResponse: ConsultationResponse): MedicalComplianceCheck {
  const validator = getSafetyValidator()
  return validator.performComplianceCheck(consultationResponse)
}

/**
 * Validate high-risk condition handling (convenience function)
 */
export function validateHighRiskHandling(
  response: string,
  analysisResult: AnalysisResult,
  consultationResponse: ConsultationResponse
): { valid: boolean; issues: string[] } {
  const validator = getSafetyValidator()
  return validator.validateHighRiskHandling(response, analysisResult, consultationResponse)
}

/**
 * Enhanced Medical Compliance Validator
 * Provides comprehensive validation against definitive diagnosis language,
 * ensures professional consultation emphasis, and manages emergency contacts
 */
export class MedicalComplianceValidator {
  private safetyValidator: SafetyValidator

  constructor() {
    this.safetyValidator = getSafetyValidator()
  }

  /**
   * Validates against definitive diagnosis language
   * Ensures responses avoid making definitive medical diagnoses
   */
  validateAgainstDefinitiveDiagnosis(response: string): {
    valid: boolean
    violations: string[]
    suggestions: string[]
  } {
    const content = response.toLowerCase()
    const violations: string[] = []
    const suggestions: string[] = []

    // Definitive diagnosis patterns to avoid
    const definitivePatterns = [
      { pattern: /you have (a |an |the )?([a-z\s]+)/g, replacement: 'the analysis suggests possible $2' },
      { pattern: /this is (definitely |certainly |clearly )?([a-z\s]+)/g, replacement: 'this appears consistent with $2' },
      { pattern: /diagnosed with ([a-z\s]+)/g, replacement: 'analysis indicates possible $1' },
      { pattern: /you are suffering from ([a-z\s]+)/g, replacement: 'symptoms may be consistent with $1' },
      { pattern: /the condition is ([a-z\s]+)/g, replacement: 'the condition appears to be $1' },
      { pattern: /medical diagnosis of ([a-z\s]+)/g, replacement: 'analysis suggests $1' },
      { pattern: /confirmed ([a-z\s]+)/g, replacement: 'possible $1' },
      { pattern: /without doubt ([a-z\s]+)/g, replacement: 'likely $1' }
    ]

    definitivePatterns.forEach(({ pattern, replacement }) => {
      const matches = content.match(pattern)
      if (matches) {
        matches.forEach(match => {
          violations.push(`Definitive diagnosis language detected: "${match}"`)
          suggestions.push(`Consider rephrasing to: "${match.replace(pattern, replacement)}"`)
        })
      }
    })

    // Check for certainty modifiers that should be avoided
    const certaintyModifiers = [
      'definitely', 'certainly', 'absolutely', 'conclusively',
      'without question', 'undoubtedly', 'positively', 'confirmed'
    ]

    certaintyModifiers.forEach(modifier => {
      if (content.includes(modifier)) {
        violations.push(`Inappropriate certainty modifier: "${modifier}"`)
        suggestions.push(`Replace "${modifier}" with uncertainty language like "likely", "possibly", or "appears to be"`)
      }
    })

    return {
      valid: violations.length === 0,
      violations,
      suggestions
    }
  }

  /**
   * Ensures professional consultation emphasis throughout response
   * Validates that responses adequately encourage professional medical care
   */
  ensureProfessionalConsultationEmphasis(consultationResponse: ConsultationResponse): {
    valid: boolean
    issues: string[]
    recommendations: string[]
  } {
    const issues: string[] = []
    const recommendations: string[] = []
    const response = JSON.stringify(consultationResponse.consultation).toLowerCase()

    // Required professional consultation phrases
    const requiredPhrases = [
      'consult a healthcare provider',
      'see a doctor',
      'medical professional',
      'professional medical advice',
      'healthcare consultation'
    ]

    const foundPhrases = requiredPhrases.filter(phrase => response.includes(phrase))
    
    if (foundPhrases.length < 2) {
      issues.push('Insufficient professional consultation emphasis - need at least 2 different consultation phrases')
      recommendations.push('Add more references to consulting healthcare providers throughout the response')
    }

    // Check each section for professional consultation emphasis
    const sections = [
      { name: 'conditionAssessment', content: consultationResponse.consultation.conditionAssessment },
      { name: 'recommendations', content: consultationResponse.consultation.recommendations.join(' ') },
      { name: 'medicalDisclaimer', content: consultationResponse.consultation.medicalDisclaimer }
    ]

    sections.forEach(section => {
      const sectionContent = section.content.toLowerCase()
      const hasConsultationReference = requiredPhrases.some(phrase => 
        sectionContent.includes(phrase) || 
        sectionContent.includes('doctor') || 
        sectionContent.includes('healthcare')
      )

      if (!hasConsultationReference && section.name !== 'medicalDisclaimer') {
        issues.push(`Section "${section.name}" lacks professional consultation emphasis`)
        recommendations.push(`Add professional consultation reference to ${section.name} section`)
      }
    })

    // Check for appropriate frequency of consultation emphasis
    const consultationMentions = (response.match(/consult|doctor|healthcare|medical professional/g) || []).length
    const responseLength = response.split(' ').length
    const mentionRatio = consultationMentions / responseLength

    if (mentionRatio < 0.02) { // Less than 2% of words are consultation-related
      issues.push('Professional consultation emphasis frequency is too low')
      recommendations.push('Increase frequency of professional consultation references throughout response')
    }

    // Validate urgency-appropriate consultation emphasis
    const urgencyLevel = consultationResponse.consultation.urgencyLevel
    if (urgencyLevel === 'immediate' || urgencyLevel === 'within_week') {
      const urgentConsultationTerms = ['immediate', 'urgent', 'prompt', 'without delay']
      const hasUrgentEmphasis = urgentConsultationTerms.some(term => response.includes(term))
      
      if (!hasUrgentEmphasis) {
        issues.push('High-urgency cases must emphasize immediate professional consultation')
        recommendations.push('Add urgent language to professional consultation recommendations')
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      recommendations
    }
  }

  /**
   * Adds emergency contact information for urgent cases
   * Ensures appropriate emergency contacts are provided based on urgency and risk level
   */
  addEmergencyContactsForUrgentCases(
    consultationResponse: ConsultationResponse,
    analysisResult: AnalysisResult
  ): {
    updatedResponse: ConsultationResponse
    contactsAdded: EmergencyContact[]
    justification: string[]
  } {
    const urgencyLevel = consultationResponse.consultation.urgencyLevel
    const riskLevel = analysisResult.riskLevel
    const topCondition = analysisResult.topPrediction.toLowerCase()
    
    const justification: string[] = []
    let contactsAdded: EmergencyContact[] = []

    // Determine if emergency contacts are needed
    const needsEmergencyContacts = this.shouldAddEmergencyContacts(
      urgencyLevel, 
      riskLevel, 
      topCondition, 
      justification
    )

    if (needsEmergencyContacts) {
      // Map urgency levels to match the expected type
      const mappedUrgencyLevel = urgencyLevel === 'within_week' ? 'urgent' : 
                                 urgencyLevel === 'monitor' ? 'routine' :
                                 urgencyLevel as 'immediate' | 'urgent' | 'moderate' | 'routine'
      
      contactsAdded = this.safetyValidator.generateEmergencyContacts(
        mappedUrgencyLevel,
        riskLevel,
        topCondition
      )

      // Add condition-specific contacts
      if (topCondition.includes('melanoma') || topCondition.includes('carcinoma')) {
        contactsAdded.push({
          type: 'dermatologist',
          name: 'Oncology Dermatologist',
          phone: 'Contact cancer center or oncology dermatologist immediately',
          description: 'Specialized care for potential skin cancer - urgent evaluation required'
        })
        justification.push('Added oncology dermatologist contact for potential malignant condition')
      }

      // Enhance existing contacts with urgency-specific information
      contactsAdded = contactsAdded.map(contact => ({
        ...contact,
        description: this.enhanceContactDescription(contact, urgencyLevel, riskLevel)
      }))
    }

    const updatedResponse: ConsultationResponse = {
      ...consultationResponse,
      emergencyContacts: contactsAdded.length > 0 ? contactsAdded : consultationResponse.emergencyContacts
    }

    return {
      updatedResponse,
      contactsAdded,
      justification
    }
  }

  /**
   * Determines if emergency contacts should be added
   */
  private shouldAddEmergencyContacts(
    urgencyLevel: string,
    riskLevel: string,
    topCondition: string,
    justification: string[]
  ): boolean {
    let needsContacts = false

    // High-risk conditions always need emergency contacts
    if (riskLevel === 'high') {
      needsContacts = true
      justification.push('High-risk condition requires emergency contact information')
    }

    // Immediate urgency always needs emergency contacts
    if (urgencyLevel === 'immediate') {
      needsContacts = true
      justification.push('Immediate urgency level requires emergency contact information')
    }

    // Urgent cases need emergency contacts
    if (urgencyLevel === 'within_week') {
      needsContacts = true
      justification.push('Urgent timeline requires emergency contact information')
    }

    // Specific high-risk conditions
    const highRiskConditions = ['melanoma', 'carcinoma', 'cancer', 'malignant', 'tumor']
    if (highRiskConditions.some(condition => topCondition.includes(condition))) {
      needsContacts = true
      justification.push(`Potential ${topCondition} requires emergency contact information`)
    }

    // Moderate risk with concerning features
    if (riskLevel === 'moderate' && (urgencyLevel === 'within_week' || urgencyLevel === 'immediate')) {
      needsContacts = true
      justification.push('Moderate risk with urgent timeline requires emergency contacts')
    }

    return needsContacts
  }

  /**
   * Enhances contact descriptions with urgency and risk-specific information
   */
  private enhanceContactDescription(
    contact: EmergencyContact,
    urgencyLevel: string,
    riskLevel: string
  ): string {
    let description = contact.description

    if (urgencyLevel === 'immediate' && contact.type === 'emergency') {
      description += ' - Call immediately if condition worsens or you experience systemic symptoms'
    }

    if (urgencyLevel === 'immediate' && contact.type === 'dermatologist') {
      description += ' - Contact within hours, not days. If unavailable, consider emergency care'
    }

    if (riskLevel === 'high' && contact.type === 'urgent_care') {
      description += ' - For high-risk conditions when dermatologist is not immediately available'
    }

    if (urgencyLevel === 'within_week' && contact.type === 'dermatologist') {
      description += ' - Schedule appointment within 1-3 days, not weeks'
    }

    return description
  }

  /**
   * Comprehensive compliance validation combining all checks
   */
  performComprehensiveComplianceCheck(
    consultationResponse: ConsultationResponse,
    analysisResult: AnalysisResult
  ): {
    overallCompliant: boolean
    complianceScore: number
    diagnosisCheck: ReturnType<typeof this.validateAgainstDefinitiveDiagnosis>
    consultationCheck: ReturnType<typeof this.ensureProfessionalConsultationEmphasis>
    emergencyContactCheck: ReturnType<typeof this.addEmergencyContactsForUrgentCases>
    safetyCheck: SafetyCheck
    recommendations: string[]
  } {
    const response = JSON.stringify(consultationResponse.consultation)
    
    // Perform all compliance checks
    const diagnosisCheck = this.validateAgainstDefinitiveDiagnosis(response)
    const consultationCheck = this.ensureProfessionalConsultationEmphasis(consultationResponse)
    const emergencyContactCheck = this.addEmergencyContactsForUrgentCases(consultationResponse, analysisResult)
    const safetyCheck = this.safetyValidator.validateResponse(response)

    // Calculate compliance score
    const checks = [
      diagnosisCheck.valid,
      consultationCheck.valid,
      emergencyContactCheck.contactsAdded.length > 0 || consultationResponse.consultation.urgencyLevel === 'routine',
      safetyCheck.valid
    ]

    const complianceScore = (checks.filter(Boolean).length / checks.length) * 100

    // Compile recommendations
    const recommendations: string[] = [
      ...diagnosisCheck.suggestions,
      ...consultationCheck.recommendations,
      ...emergencyContactCheck.justification
    ]

    if (safetyCheck.warnings.length > 0) {
      recommendations.push(...safetyCheck.warnings.map(w => `Safety warning: ${w}`))
    }

    return {
      overallCompliant: complianceScore >= 80 && safetyCheck.valid,
      complianceScore,
      diagnosisCheck,
      consultationCheck,
      emergencyContactCheck,
      safetyCheck,
      recommendations
    }
  }
}

/**
 * Create a singleton instance of the medical compliance validator
 */
let medicalComplianceValidatorInstance: MedicalComplianceValidator | null = null

/**
 * Get the singleton medical compliance validator instance
 */
export function getMedicalComplianceValidator(): MedicalComplianceValidator {
  if (!medicalComplianceValidatorInstance) {
    medicalComplianceValidatorInstance = new MedicalComplianceValidator()
  }
  return medicalComplianceValidatorInstance
}

/**
 * Perform comprehensive compliance validation (convenience function)
 */
export function performComprehensiveComplianceCheck(
  consultationResponse: ConsultationResponse,
  analysisResult: AnalysisResult
): ReturnType<MedicalComplianceValidator['performComprehensiveComplianceCheck']> {
  const validator = getMedicalComplianceValidator()
  return validator.performComprehensiveComplianceCheck(consultationResponse, analysisResult)
}