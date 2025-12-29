/**
 * High-Risk Condition Handler for BioLens Application
 * Handles urgent attention emphasis for high-risk conditions
 * Provides emergency contact information and risk-based modifications
 */

import { DetectedCondition, AnalysisResult } from './api-client'
import { RiskLevel, EmergencyContact } from './consultation-engine'

export interface HighRiskAssessment {
  isHighRisk: boolean
  urgencyLevel: 'immediate' | 'urgent' | 'moderate' | 'routine'
  riskFactors: string[]
  emergencyContacts: EmergencyContact[]
  specialInstructions: string[]
}

export interface RiskBasedModifications {
  promptModifications: string[]
  systemInstructions: string[]
  responseRequirements: string[]
  emergencyProtocols: string[]
}

/**
 * High-Risk Condition Handler Class
 * Identifies and handles high-risk conditions requiring urgent attention
 */
export class HighRiskHandler {
  private readonly highRiskConditions: Set<string>
  private readonly urgentKeywords: Set<string>
  private readonly emergencyContacts: EmergencyContact[]

  constructor() {
    // Define high-risk conditions that require immediate attention
    this.highRiskConditions = new Set([
      'melanoma',
      'carcinoma',
      'cancer',
      'malignant',
      'tumor',
      'neoplasm',
      'sarcoma',
      'lymphoma',
      'metastatic',
      'aggressive',
      'invasive'
    ])

    // Keywords that indicate urgent conditions
    this.urgentKeywords = new Set([
      'bleeding',
      'ulcerated',
      'rapidly growing',
      'changing quickly',
      'asymmetric',
      'irregular borders',
      'color variation',
      'diameter increase',
      'evolving',
      'suspicious'
    ])

    // Emergency contact information
    this.emergencyContacts = [
      {
        type: 'emergency',
        name: 'Emergency Services',
        phone: '911',
        description: 'For immediate life-threatening emergencies'
      },
      {
        type: 'dermatologist',
        name: 'Dermatology Emergency',
        phone: 'Contact your dermatologist immediately',
        description: 'For urgent skin condition evaluation'
      },
      {
        type: 'urgent_care',
        name: 'Urgent Care Center',
        phone: 'Find nearest urgent care',
        description: 'For same-day medical evaluation'
      }
    ]
  }

  /**
   * Assess if conditions are high-risk and require urgent attention
   */
  assessHighRisk(
    predictions: DetectedCondition[],
    symptoms: string,
    analysisResult: AnalysisResult
  ): HighRiskAssessment {
    const riskFactors: string[] = []
    let isHighRisk = false
    let urgencyLevel: 'immediate' | 'urgent' | 'moderate' | 'routine' = 'routine'

    // Check primary prediction for high-risk conditions
    if (predictions.length > 0) {
      const primaryCondition = predictions[0]
      const conditionName = primaryCondition.condition.toLowerCase()

      // Check for malignant conditions
      if (this.isHighRiskCondition(conditionName)) {
        isHighRisk = true
        urgencyLevel = 'immediate'
        riskFactors.push(`Potential malignant condition detected: ${primaryCondition.condition}`)
        
        if (primaryCondition.confidence > 0.7) {
          riskFactors.push('High confidence in malignant condition prediction')
        }
      }

      // Check severity and attention requirements
      if (primaryCondition.requiresAttention) {
        riskFactors.push('Condition flagged as requiring medical attention')
        if (urgencyLevel === 'routine') {
          urgencyLevel = 'moderate'
        }
      }

      if (primaryCondition.severity === 'severe') {
        riskFactors.push('Severe condition severity detected')
        if (urgencyLevel === 'routine') {
          urgencyLevel = 'urgent'
        }
      }

      // Check confidence levels for concerning predictions
      if (primaryCondition.confidence > 0.8 && this.isPotentiallySerious(conditionName)) {
        riskFactors.push('High confidence in potentially serious condition')
        if (urgencyLevel === 'routine') {
          urgencyLevel = 'moderate'
        }
      }
    }

    // Analyze symptoms for urgent indicators
    if (symptoms && symptoms.trim().length > 0) {
      const symptomRisk = this.analyzeSymptomRisk(symptoms)
      if (symptomRisk.hasUrgentSymptoms) {
        riskFactors.push(...symptomRisk.urgentFactors)
        if (symptomRisk.requiresImmediate && urgencyLevel !== 'immediate') {
          urgencyLevel = 'urgent'
          isHighRisk = true
        }
      }
    }

    // Check overall analysis risk level
    if (analysisResult.riskLevel === 'high') {
      isHighRisk = true
      if (urgencyLevel === 'routine') {
        urgencyLevel = 'urgent'
      }
      riskFactors.push('Overall analysis indicates high risk level')
    }

    // Generate special instructions based on risk assessment
    const specialInstructions = this.generateSpecialInstructions(
      isHighRisk,
      urgencyLevel,
      predictions[0]?.condition || 'unknown'
    )

    return {
      isHighRisk,
      urgencyLevel,
      riskFactors,
      emergencyContacts: this.getRelevantEmergencyContacts(urgencyLevel),
      specialInstructions
    }
  }

  /**
   * Check if a condition is considered high-risk
   */
  private isHighRiskCondition(conditionName: string): boolean {
    return Array.from(this.highRiskConditions).some(riskCondition =>
      conditionName.includes(riskCondition)
    )
  }

  /**
   * Check if a condition is potentially serious (but not necessarily high-risk)
   */
  private isPotentiallySerious(conditionName: string): boolean {
    const seriousConditions = [
      'basal cell',
      'squamous cell',
      'atypical',
      'dysplastic',
      'precancerous',
      'keratosis',
      'suspicious lesion'
    ]

    return seriousConditions.some(condition =>
      conditionName.includes(condition)
    )
  }

  /**
   * Analyze symptoms for urgent risk indicators
   */
  private analyzeSymptomRisk(symptoms: string): {
    hasUrgentSymptoms: boolean
    requiresImmediate: boolean
    urgentFactors: string[]
  } {
    const symptomsLower = symptoms.toLowerCase()
    const urgentFactors: string[] = []
    let hasUrgentSymptoms = false
    let requiresImmediate = false

    // Check for urgent symptom keywords
    Array.from(this.urgentKeywords).forEach(keyword => {
      if (symptomsLower.includes(keyword)) {
        hasUrgentSymptoms = true
        urgentFactors.push(`Urgent symptom reported: ${keyword}`)
        
        // Some symptoms require immediate attention
        if (['bleeding', 'rapidly growing', 'changing quickly'].includes(keyword)) {
          requiresImmediate = true
        }
      }
    })

    // Check for ABCDE criteria mentions
    const abcdeFactors = [
      { keyword: 'asymmetr', factor: 'Asymmetry (A criteria)' },
      { keyword: 'border', factor: 'Border irregularity (B criteria)' },
      { keyword: 'color', factor: 'Color variation (C criteria)' },
      { keyword: 'diameter', factor: 'Diameter changes (D criteria)' },
      { keyword: 'evolving', factor: 'Evolution/changes (E criteria)' },
      { keyword: 'changing', factor: 'Evolution/changes (E criteria)' }
    ]

    abcdeFactors.forEach(({ keyword, factor }) => {
      if (symptomsLower.includes(keyword)) {
        hasUrgentSymptoms = true
        urgentFactors.push(`Melanoma warning sign: ${factor}`)
      }
    })

    // Check for pain or discomfort that might indicate serious conditions
    const painKeywords = ['painful', 'pain', 'tender', 'sore', 'burning', 'stinging']
    if (painKeywords.some(keyword => symptomsLower.includes(keyword))) {
      urgentFactors.push('Pain or discomfort reported')
    }

    // Check for systemic symptoms
    const systemicSymptoms = ['fever', 'fatigue', 'weight loss', 'night sweats', 'swollen lymph']
    if (systemicSymptoms.some(symptom => symptomsLower.includes(symptom))) {
      hasUrgentSymptoms = true
      requiresImmediate = true
      urgentFactors.push('Systemic symptoms reported - requires immediate evaluation')
    }

    return {
      hasUrgentSymptoms,
      requiresImmediate,
      urgentFactors
    }
  }

  /**
   * Generate special instructions based on risk assessment
   */
  private generateSpecialInstructions(
    isHighRisk: boolean,
    urgencyLevel: 'immediate' | 'urgent' | 'moderate' | 'routine',
    conditionName: string
  ): string[] {
    const instructions: string[] = []

    if (isHighRisk || urgencyLevel === 'immediate') {
      instructions.push('🚨 CRITICAL: This condition requires IMMEDIATE medical attention')
      instructions.push('Contact a dermatologist or emergency services without delay')
      instructions.push('Do not wait for symptoms to worsen - early intervention is crucial')
      instructions.push('Prepare a list of all symptoms and changes you have noticed')
      instructions.push('Take high-quality photos with a ruler for scale if possible')
      
      if (this.isHighRiskCondition(conditionName.toLowerCase())) {
        instructions.push('This may be a potentially life-threatening condition')
        instructions.push('Time is critical - seek care within 24 hours if possible')
      }
    } else if (urgencyLevel === 'urgent') {
      instructions.push('⚠️ URGENT: Schedule medical evaluation within 1-3 days')
      instructions.push('Monitor closely and seek immediate care if condition worsens')
      instructions.push('Document any changes with photos and symptom tracking')
      instructions.push('Contact healthcare provider to expedite appointment if possible')
    } else if (urgencyLevel === 'moderate') {
      instructions.push('📋 MODERATE: Schedule medical evaluation within 1-2 weeks')
      instructions.push('Monitor condition and seek earlier care if symptoms worsen')
      instructions.push('Keep detailed records of changes and symptoms')
    } else {
      instructions.push('📅 ROUTINE: Consider medical evaluation if condition persists or worsens')
      instructions.push('Continue monitoring and maintain good skin care practices')
    }

    // Add condition-specific instructions
    if (conditionName.toLowerCase().includes('melanoma')) {
      instructions.push('Protect area from sun exposure while awaiting medical care')
      instructions.push('Avoid trauma to the lesion')
      instructions.push('Prepare family history of skin cancer for medical appointment')
    }

    return instructions
  }

  /**
   * Get relevant emergency contacts based on urgency level
   */
  private getRelevantEmergencyContacts(urgencyLevel: 'immediate' | 'urgent' | 'moderate' | 'routine'): EmergencyContact[] {
    const contacts: EmergencyContact[] = []

    if (urgencyLevel === 'immediate') {
      // Include all emergency contacts for immediate cases
      contacts.push(...this.emergencyContacts)
    } else if (urgencyLevel === 'urgent') {
      // Include dermatologist and urgent care for urgent cases
      contacts.push(
        this.emergencyContacts.find(c => c.type === 'dermatologist')!,
        this.emergencyContacts.find(c => c.type === 'urgent_care')!
      )
    } else if (urgencyLevel === 'moderate') {
      // Include dermatologist for moderate cases
      contacts.push(this.emergencyContacts.find(c => c.type === 'dermatologist')!)
    }
    // No emergency contacts for routine cases

    return contacts
  }

  /**
   * Generate risk-based prompt modifications
   */
  generateRiskBasedModifications(assessment: HighRiskAssessment): RiskBasedModifications {
    const modifications: RiskBasedModifications = {
      promptModifications: [],
      systemInstructions: [],
      responseRequirements: [],
      emergencyProtocols: []
    }

    if (assessment.isHighRisk || assessment.urgencyLevel === 'immediate') {
      // High-risk prompt modifications
      modifications.promptModifications.push(
        '🚨 HIGH-RISK CONDITION DETECTED 🚨',
        'This case requires URGENT medical attention and careful handling.',
        'Use clear, direct language about the need for immediate professional care.',
        'Emphasize the time-sensitive nature of the situation.'
      )

      // High-risk system instructions
      modifications.systemInstructions.push(
        'CRITICAL: This is a high-risk medical situation requiring immediate attention.',
        'Use urgent, clear language throughout your response.',
        'Emphasize IMMEDIATE medical care - do not suggest waiting or monitoring.',
        'Provide emergency contact information and next steps.',
        'Avoid any language that might delay or discourage seeking immediate care.'
      )

      // High-risk response requirements
      modifications.responseRequirements.push(
        'Must emphasize IMMEDIATE medical attention in multiple sections',
        'Must include emergency contact information',
        'Must use urgent language (CRITICAL, IMMEDIATE, URGENT)',
        'Must provide clear next steps for emergency care',
        'Must avoid any suggestion of waiting or self-monitoring'
      )

      // Emergency protocols
      modifications.emergencyProtocols.push(
        'Recommend contacting dermatologist immediately',
        'Suggest emergency care if dermatologist unavailable',
        'Provide guidance on documenting condition for medical visit',
        'Emphasize protection of affected area until medical evaluation'
      )
    } else if (assessment.urgencyLevel === 'urgent') {
      // Urgent modifications (less intense than high-risk)
      modifications.promptModifications.push(
        '⚠️ URGENT CONDITION REQUIRING PROMPT ATTENTION',
        'This condition needs timely medical evaluation.',
        'Emphasize the importance of scheduling care within days, not weeks.'
      )

      modifications.systemInstructions.push(
        'This condition requires prompt medical attention within 1-3 days.',
        'Use clear language about the importance of timely care.',
        'Provide guidance on monitoring and when to seek immediate care.'
      )

      modifications.responseRequirements.push(
        'Must recommend medical evaluation within 1-3 days',
        'Must provide monitoring guidance',
        'Must explain when to seek immediate care'
      )
    }

    return modifications
  }

  /**
   * Create emergency contact information injection
   */
  createEmergencyContactInjection(urgencyLevel: 'immediate' | 'urgent' | 'moderate' | 'routine'): string {
    const contacts = this.getRelevantEmergencyContacts(urgencyLevel)
    
    if (contacts.length === 0) {
      return ''
    }

    let injection = '\n**🚨 EMERGENCY CONTACTS:**\n'
    
    contacts.forEach(contact => {
      injection += `**${contact.name}**: ${contact.phone}\n`
      injection += `*${contact.description}*\n\n`
    })

    if (urgencyLevel === 'immediate') {
      injection += '**⏰ TIME IS CRITICAL**: Do not delay seeking medical attention.\n'
      injection += 'If you cannot reach a dermatologist immediately, consider emergency care.\n\n'
    }

    return injection
  }

  /**
   * Validate high-risk handling completeness
   */
  validateHighRiskHandling(
    assessment: HighRiskAssessment,
    promptContent: string,
    responseContent: string
  ): { valid: boolean; issues: string[] } {
    const issues: string[] = []

    if (assessment.isHighRisk || assessment.urgencyLevel === 'immediate') {
      // Check for required urgent language
      const urgentTerms = ['immediate', 'urgent', 'critical', 'emergency']
      const hasUrgentLanguage = urgentTerms.some(term =>
        promptContent.toLowerCase().includes(term) || responseContent.toLowerCase().includes(term)
      )
      
      if (!hasUrgentLanguage) {
        issues.push('High-risk conditions must include urgent language')
      }

      // Check for emergency contacts
      if (!responseContent.includes('EMERGENCY CONTACTS') && !responseContent.includes('emergency')) {
        issues.push('High-risk conditions must include emergency contact information')
      }

      // Check that monitoring/waiting is not suggested
      const delayingTerms = ['wait and see', 'monitor for now', 'wait a few weeks']
      const hasDelayingLanguage = delayingTerms.some(term =>
        responseContent.toLowerCase().includes(term)
      )
      
      if (hasDelayingLanguage) {
        issues.push('High-risk conditions must not suggest waiting or delaying care')
      }
    }

    return {
      valid: issues.length === 0,
      issues
    }
  }
}

/**
 * Create a singleton instance of the high-risk handler
 */
let highRiskHandlerInstance: HighRiskHandler | null = null

/**
 * Get the singleton high-risk handler instance
 */
export function getHighRiskHandler(): HighRiskHandler {
  if (!highRiskHandlerInstance) {
    highRiskHandlerInstance = new HighRiskHandler()
  }
  return highRiskHandlerInstance
}