/**
 * Medical Prompt Builder for BioLens Application
 * Constructs medically appropriate prompts for Gemini AI consultation
 * Ensures safety instructions and proper medical context
 */

import { DetectedCondition, AnalysisResult } from './api-client'
import { getHighRiskHandler, HighRiskAssessment, RiskBasedModifications } from './high-risk-handler'

export interface RiskLevel {
  level: 'low' | 'moderate' | 'high'
  factors: string[]
  requiresUrgentCare: boolean
}

export interface MedicalPrompt {
  systemInstruction: string
  userPrompt: string
  safetyInstructions: string[]
  contextData: {
    predictions: DetectedCondition[]
    symptoms: string
    riskLevel: RiskLevel
  }
}

export interface PromptTemplate {
  role: string
  safetyInstructions: string[]
  contextSection: string
  taskSection: string
  outputFormat: string
}

/**
 * Medical Prompt Builder Class
 * Constructs structured, medically appropriate prompts for Gemini AI
 */
export class MedicalPromptBuilder {
  private readonly baseTemplate: PromptTemplate
  private readonly safetyInstructions: string[]
  private readonly highRiskInstructions: string[]
  private readonly highRiskHandler: ReturnType<typeof getHighRiskHandler>

  constructor() {
    this.highRiskHandler = getHighRiskHandler()
    this.baseTemplate = {
      role: `You are a medical AI assistant providing supplementary health information.
You must NOT provide definitive diagnoses or replace professional medical care.
Your role is to help users understand their AI analysis results and provide general guidance.`,

      safetyInstructions: [
        'Always emphasize that this is supplementary information only',
        'Encourage users to consult healthcare professionals for any concerns',
        'Avoid definitive diagnostic language (do not say "you have" or "this is definitely")',
        'Use probabilistic language ("may indicate", "could suggest", "appears consistent with")',
        'Include appropriate medical disclaimers in your response',
        'Focus on general care recommendations rather than specific treatments',
        'Emphasize the importance of professional medical evaluation'
      ],

      contextSection: `You will analyze BiomedCLIP AI results combined with user-reported symptoms.
BiomedCLIP is a specialized medical AI that analyzes skin conditions from images.
Your task is to help users understand these results and provide appropriate guidance.`,

      taskSection: `Provide a structured medical consultation response that helps the user understand their AI analysis results.
Focus on education, general care recommendations, and appropriate next steps.
Maintain a supportive but cautious tone throughout your response.`,

      outputFormat: `Structure your response with these sections:
**Condition Assessment**: Analysis of the AI predictions and their significance
**Symptom Correlation**: How reported symptoms relate to the AI findings
**Recommendations**: General care suggestions and next steps
**Urgency**: Timeline for seeking professional care
**Educational Info**: Brief explanation of the detected conditions
**Important**: Medical disclaimer and professional consultation emphasis`
    }

    this.safetyInstructions = [
      'Never provide definitive diagnoses',
      'Always include medical disclaimers',
      'Encourage professional medical consultation',
      'Use cautious, probabilistic language',
      'Avoid specific medication recommendations',
      'Focus on general care and monitoring',
      'Emphasize the supplementary nature of AI analysis'
    ]

    this.highRiskInstructions = [
      'CRITICAL: Emphasize IMMEDIATE medical attention for high-risk conditions',
      'Use urgent language for potentially serious conditions',
      'Recommend emergency care if appropriate',
      'Stress the time-sensitive nature of evaluation',
      'Provide emergency contact guidance',
      'Avoid any language that might delay care'
    ]
  }

  /**
   * Build a complete medical consultation prompt with high-risk assessment
   */
  buildConsultationPromptWithRiskAssessment(
    predictions: DetectedCondition[],
    symptoms: string,
    riskLevel: RiskLevel,
    analysisResult: AnalysisResult
  ): MedicalPrompt & { highRiskAssessment: HighRiskAssessment; riskModifications: RiskBasedModifications } {
    // Perform high-risk assessment
    const highRiskAssessment = this.highRiskHandler.assessHighRisk(predictions, symptoms, analysisResult)
    
    // Generate risk-based modifications
    const riskModifications = this.highRiskHandler.generateRiskBasedModifications(highRiskAssessment)
    
    // Build base prompt
    const basePrompt = this.buildConsultationPrompt(predictions, symptoms, riskLevel)
    
    // Apply high-risk modifications
    const enhancedPrompt = this.applyHighRiskModifications(basePrompt, riskModifications, highRiskAssessment)
    
    return {
      ...enhancedPrompt,
      highRiskAssessment,
      riskModifications
    }
  }

  /**
   * Apply high-risk modifications to a prompt
   */
  private applyHighRiskModifications(
    basePrompt: MedicalPrompt,
    modifications: RiskBasedModifications,
    assessment: HighRiskAssessment
  ): MedicalPrompt {
    let enhancedSystemInstruction = basePrompt.systemInstruction
    let enhancedUserPrompt = basePrompt.userPrompt
    
    // Apply system instruction modifications
    if (modifications.systemInstructions.length > 0) {
      enhancedSystemInstruction += '\n\n--- HIGH-RISK CONDITION PROTOCOLS ---\n'
      modifications.systemInstructions.forEach((instruction, index) => {
        enhancedSystemInstruction += `${index + 1}. ${instruction}\n`
      })
      enhancedSystemInstruction += '--- END HIGH-RISK PROTOCOLS ---\n'
    }
    
    // Apply prompt modifications
    if (modifications.promptModifications.length > 0) {
      enhancedUserPrompt = modifications.promptModifications.join('\n') + '\n\n' + enhancedUserPrompt
    }
    
    // Add emergency contact injection if needed
    if (assessment.urgencyLevel === 'immediate' || assessment.urgencyLevel === 'urgent') {
      const emergencyInjection = this.highRiskHandler.createEmergencyContactInjection(assessment.urgencyLevel)
      enhancedUserPrompt += '\n' + emergencyInjection
    }
    
    // Add response requirements
    if (modifications.responseRequirements.length > 0) {
      enhancedUserPrompt += '\n--- MANDATORY RESPONSE REQUIREMENTS ---\n'
      modifications.responseRequirements.forEach((requirement, index) => {
        enhancedUserPrompt += `${index + 1}. ${requirement}\n`
      })
      enhancedUserPrompt += '--- END REQUIREMENTS ---\n'
    }
    
    // Add special instructions
    if (assessment.specialInstructions.length > 0) {
      enhancedUserPrompt += '\n**SPECIAL INSTRUCTIONS FOR THIS CASE:**\n'
      assessment.specialInstructions.forEach(instruction => {
        enhancedUserPrompt += `• ${instruction}\n`
      })
      enhancedUserPrompt += '\n'
    }
    
    return {
      ...basePrompt,
      systemInstruction: enhancedSystemInstruction,
      userPrompt: enhancedUserPrompt,
      safetyInstructions: [...basePrompt.safetyInstructions, ...assessment.specialInstructions]
    }
  }
  buildConsultationPrompt(
    predictions: DetectedCondition[],
    symptoms: string,
    riskLevel: RiskLevel
  ): MedicalPrompt {
    const systemInstruction = this.buildSystemInstruction(riskLevel)
    const userPrompt = this.buildUserPrompt(predictions, symptoms, riskLevel)
    const safetyInstructions = this.getSafetyInstructions(riskLevel)

    return {
      systemInstruction,
      userPrompt,
      safetyInstructions,
      contextData: {
        predictions,
        symptoms,
        riskLevel
      }
    }
  }

  /**
   * Build system instruction with role and safety guidelines
   */
  private buildSystemInstruction(riskLevel: RiskLevel): string {
    let instruction = this.baseTemplate.role + '\n\n'
    
    // Add safety instructions
    instruction += 'SAFETY GUIDELINES:\n'
    this.baseTemplate.safetyInstructions.forEach((guideline, index) => {
      instruction += `${index + 1}. ${guideline}\n`
    })

    // Add high-risk specific instructions if needed
    if (riskLevel.level === 'high' || riskLevel.requiresUrgentCare) {
      instruction += '\nHIGH-RISK CONDITION PROTOCOLS:\n'
      this.highRiskInstructions.forEach((protocol, index) => {
        instruction += `${index + 1}. ${protocol}\n`
      })
    }

    instruction += '\n' + this.baseTemplate.contextSection
    
    return instruction
  }

  /**
   * Build user prompt with analysis data and context
   */
  private buildUserPrompt(
    predictions: DetectedCondition[],
    symptoms: string,
    riskLevel: RiskLevel
  ): string {
    let prompt = 'MEDICAL CONSULTATION REQUEST\n\n'
    
    // Add BiomedCLIP analysis results
    prompt += this.formatPredictionsForPrompt(predictions)
    
    // Add risk assessment
    prompt += this.formatRiskAssessment(riskLevel)
    
    // Add symptoms if provided
    if (symptoms && symptoms.trim().length > 0) {
      prompt += this.formatSymptomsForPrompt(symptoms)
    }
    
    // Add task instructions
    prompt += '\n' + this.baseTemplate.taskSection + '\n\n'
    
    // Add output format requirements
    prompt += this.baseTemplate.outputFormat + '\n\n'
    
    // Add condition-specific instructions
    prompt += this.getConditionSpecificInstructions(predictions, riskLevel)
    
    return prompt
  }

  /**
   * Format predictions data for prompt inclusion
   */
  formatPredictionsForPrompt(predictions: DetectedCondition[]): string {
    if (!predictions || predictions.length === 0) {
      return 'BiomedCLIP Analysis: No predictions available\n\n'
    }

    let formatted = 'BiomedCLIP ANALYSIS RESULTS:\n'
    
    // Primary prediction
    const primary = predictions[0]
    formatted += `Primary Detection: ${primary.condition}\n`
    formatted += `Confidence: ${(primary.confidence * 100).toFixed(1)}%\n`
    formatted += `Severity: ${primary.severity}\n`
    formatted += `Category: ${primary.category}\n`
    formatted += `Requires Attention: ${primary.requiresAttention ? 'Yes' : 'No'}\n`
    formatted += `Description: ${primary.description}\n\n`
    
    // Alternative predictions
    if (predictions.length > 1) {
      formatted += 'Alternative Possibilities:\n'
      predictions.slice(1, 4).forEach((pred, index) => {
        formatted += `${index + 2}. ${pred.condition} - ${(pred.confidence * 100).toFixed(1)}% confidence\n`
        formatted += `   Severity: ${pred.severity}, Category: ${pred.category}\n`
      })
      formatted += '\n'
    }
    
    return formatted
  }

  /**
   * Format risk assessment for prompt
   */
  private formatRiskAssessment(riskLevel: RiskLevel): string {
    let formatted = 'RISK ASSESSMENT:\n'
    formatted += `Overall Risk Level: ${riskLevel.level.toUpperCase()}\n`
    formatted += `Requires Urgent Care: ${riskLevel.requiresUrgentCare ? 'YES' : 'No'}\n`
    
    if (riskLevel.factors.length > 0) {
      formatted += 'Risk Factors:\n'
      riskLevel.factors.forEach(factor => {
        formatted += `- ${factor}\n`
      })
    }
    
    formatted += '\n'
    return formatted
  }

  /**
   * Format symptoms for prompt inclusion
   */
  private formatSymptomsForPrompt(symptoms: string): string {
    let formatted = 'PATIENT-REPORTED SYMPTOMS:\n'
    formatted += `"${symptoms.trim()}"\n\n`
    
    // Add symptom analysis context
    formatted += 'Please correlate these symptoms with the AI analysis results and provide relevant guidance.\n\n'
    
    return formatted
  }

  /**
   * Get condition-specific prompt instructions
   */
  private getConditionSpecificInstructions(predictions: DetectedCondition[], riskLevel: RiskLevel): string {
    if (!predictions || predictions.length === 0) {
      return 'GENERAL INSTRUCTIONS:\nProvide general skin health guidance and recommend professional evaluation.\n'
    }

    const primaryCondition = predictions[0].condition.toLowerCase()
    let instructions = 'CONDITION-SPECIFIC GUIDANCE:\n'
    
    // High-risk conditions
    if (primaryCondition.includes('melanoma') || primaryCondition.includes('carcinoma')) {
      instructions += '🚨 CRITICAL: This appears to be a potentially serious condition requiring IMMEDIATE medical attention.\n'
      instructions += 'Emphasize urgent dermatological evaluation and avoid any language that might delay care.\n'
      instructions += 'Provide emergency contact guidance and stress the time-sensitive nature.\n\n'
    }
    // Inflammatory conditions
    else if (primaryCondition.includes('eczema') || primaryCondition.includes('dermatitis')) {
      instructions += 'Focus on trigger avoidance, gentle skincare, and moisturization strategies.\n'
      instructions += 'Discuss the chronic nature and importance of consistent management.\n\n'
    }
    // Autoimmune conditions
    else if (primaryCondition.includes('psoriasis')) {
      instructions += 'Emphasize the chronic, manageable nature of this condition.\n'
      instructions += 'Discuss lifestyle factors, stress management, and professional treatment options.\n\n'
    }
    // Infectious conditions
    else if (primaryCondition.includes('fungal') || primaryCondition.includes('bacterial')) {
      instructions += 'Focus on hygiene, prevention of spread, and appropriate treatment timing.\n'
      instructions += 'Discuss when over-the-counter options may be appropriate vs. prescription needs.\n\n'
    }
    // Acne and related
    else if (primaryCondition.includes('acne')) {
      instructions += 'Provide gentle skincare guidance and discuss treatment progression.\n'
      instructions += 'Address common misconceptions and emphasize patience with treatment.\n\n'
    }
    
    // Risk-based additions
    if (riskLevel.level === 'high') {
      instructions += 'URGENT CARE EMPHASIS: Use clear, direct language about the need for immediate professional evaluation.\n'
    } else if (riskLevel.level === 'moderate') {
      instructions += 'TIMELY CARE: Recommend evaluation within 1-2 weeks and monitoring guidance.\n'
    } else {
      instructions += 'ROUTINE CARE: Focus on monitoring, general care, and when to seek evaluation.\n'
    }
    
    return instructions
  }

  /**
   * Add safety instruction injection to any prompt
   */
  addSafetyInstructions(prompt: string): string {
    const safetyHeader = '\n--- MANDATORY SAFETY REQUIREMENTS ---\n'
    let safetySection = 'You MUST include the following in your response:\n'
    
    this.safetyInstructions.forEach((instruction, index) => {
      safetySection += `${index + 1}. ${instruction}\n`
    })
    
    safetySection += '\nFAILURE TO FOLLOW THESE SAFETY REQUIREMENTS IS UNACCEPTABLE.\n'
    safetySection += '--- END SAFETY REQUIREMENTS ---\n\n'
    
    return prompt + safetyHeader + safetySection
  }

  /**
   * Get safety instructions based on risk level
   */
  private getSafetyInstructions(riskLevel: RiskLevel): string[] {
    const instructions = [...this.safetyInstructions]
    
    if (riskLevel.level === 'high' || riskLevel.requiresUrgentCare) {
      instructions.push(...this.highRiskInstructions)
    }
    
    return instructions
  }

  /**
   * Create condition-specific prompt variations
   */
  createConditionSpecificPrompt(
    conditionType: 'oncological' | 'inflammatory' | 'infectious' | 'autoimmune' | 'general',
    predictions: DetectedCondition[],
    symptoms: string,
    riskLevel: RiskLevel
  ): MedicalPrompt {
    // Build base prompt
    const basePrompt = this.buildConsultationPrompt(predictions, symptoms, riskLevel)
    
    // Add condition-specific modifications
    let enhancedSystemInstruction = basePrompt.systemInstruction
    let enhancedUserPrompt = basePrompt.userPrompt
    
    switch (conditionType) {
      case 'oncological':
        enhancedSystemInstruction += '\n\nONCOLOGICAL CONDITION PROTOCOL:\n'
        enhancedSystemInstruction += 'This case involves potential skin cancer. Use URGENT language and emphasize IMMEDIATE medical attention.\n'
        enhancedSystemInstruction += 'Stress that early detection and treatment are critical for outcomes.\n'
        enhancedSystemInstruction += 'Provide clear guidance on emergency contacts and next steps.\n'
        
        enhancedUserPrompt += '\n🚨 URGENT ONCOLOGICAL CONSULTATION:\n'
        enhancedUserPrompt += 'This case requires immediate attention due to potential malignancy.\n'
        enhancedUserPrompt += 'Emphasize urgent dermatological evaluation and provide emergency guidance.\n'
        break
        
      case 'inflammatory':
        enhancedSystemInstruction += '\n\nINFLAMMATORY CONDITION GUIDANCE:\n'
        enhancedSystemInstruction += 'Focus on trigger identification, gentle care, and inflammation management.\n'
        enhancedSystemInstruction += 'Discuss the chronic nature and importance of consistent skincare routines.\n'
        
        enhancedUserPrompt += '\nINFLAMMATORY CONDITION FOCUS:\n'
        enhancedUserPrompt += 'Provide comprehensive guidance on managing inflammatory skin conditions.\n'
        enhancedUserPrompt += 'Include trigger avoidance and gentle skincare strategies.\n'
        break
        
      case 'infectious':
        enhancedSystemInstruction += '\n\nINFECTIOUS CONDITION PROTOCOL:\n'
        enhancedSystemInstruction += 'Emphasize hygiene, prevention of spread, and appropriate treatment timing.\n'
        enhancedSystemInstruction += 'Discuss when professional care is needed vs. over-the-counter options.\n'
        
        enhancedUserPrompt += '\nINFECTIOUS CONDITION MANAGEMENT:\n'
        enhancedUserPrompt += 'Focus on containment, hygiene, and appropriate treatment approaches.\n'
        enhancedUserPrompt += 'Address prevention of spread and treatment timing.\n'
        break
        
      case 'autoimmune':
        enhancedSystemInstruction += '\n\nAUTOIMMUNE CONDITION GUIDANCE:\n'
        enhancedSystemInstruction += 'Emphasize the chronic, manageable nature of autoimmune conditions.\n'
        enhancedSystemInstruction += 'Discuss lifestyle factors, stress management, and long-term care strategies.\n'
        
        enhancedUserPrompt += '\nAUTOIMMUNE CONDITION SUPPORT:\n'
        enhancedUserPrompt += 'Provide comprehensive guidance for managing chronic autoimmune skin conditions.\n'
        enhancedUserPrompt += 'Include lifestyle modifications and long-term management strategies.\n'
        break
        
      case 'general':
      default:
        enhancedUserPrompt += '\nGENERAL DERMATOLOGICAL CONSULTATION:\n'
        enhancedUserPrompt += 'Provide balanced guidance appropriate for the detected condition.\n'
        break
    }
    
    return {
      ...basePrompt,
      systemInstruction: enhancedSystemInstruction,
      userPrompt: enhancedUserPrompt
    }
  }

  /**
   * Add urgent attention emphasis for high-risk conditions
   */
  addUrgentAttentionEmphasis(
    prompt: MedicalPrompt,
    conditionName: string,
    urgencyLevel: 'immediate' | 'urgent' | 'moderate' | 'routine'
  ): MedicalPrompt {
    if (urgencyLevel === 'immediate') {
      const urgentPrefix = `
🚨🚨🚨 CRITICAL MEDICAL ALERT 🚨🚨🚨

This consultation involves a potentially LIFE-THREATENING condition that requires IMMEDIATE medical attention.

URGENT ACTION REQUIRED:
- Contact a dermatologist or emergency services IMMEDIATELY
- Do NOT delay seeking professional medical care
- This is a time-sensitive medical emergency
- Early intervention can be life-saving

🚨🚨🚨 END CRITICAL ALERT 🚨🚨🚨

`
      return {
        ...prompt,
        userPrompt: urgentPrefix + prompt.userPrompt,
        systemInstruction: prompt.systemInstruction + '\n\nCRITICAL: This is a medical emergency. Use the most urgent language possible while remaining professional. Emphasize IMMEDIATE care in every section of your response.'
      }
    } else if (urgencyLevel === 'urgent') {
      const urgentPrefix = `
⚠️ URGENT MEDICAL ATTENTION REQUIRED ⚠️

This condition requires prompt medical evaluation within 1-3 days.
Do not delay scheduling an appointment.

`
      return {
        ...prompt,
        userPrompt: urgentPrefix + prompt.userPrompt,
        systemInstruction: prompt.systemInstruction + '\n\nURGENT: Emphasize the need for prompt medical care. Use clear, direct language about timing.'
      }
    }
    
    return prompt
  }

  /**
   * Create emergency contact information injection
   */
  createEmergencyContactInjection(
    urgencyLevel: 'immediate' | 'urgent' | 'moderate' | 'routine',
    conditionType?: string
  ): string {
    return this.highRiskHandler.createEmergencyContactInjection(urgencyLevel)
  }

  /**
   * Implement risk-based prompt modifications
   */
  implementRiskBasedModifications(
    basePrompt: MedicalPrompt,
    predictions: DetectedCondition[],
    symptoms: string,
    analysisResult: AnalysisResult
  ): MedicalPrompt & { riskAssessment: HighRiskAssessment } {
    // Assess risk level
    const riskAssessment = this.highRiskHandler.assessHighRisk(predictions, symptoms, analysisResult)
    
    // Generate modifications
    const modifications = this.highRiskHandler.generateRiskBasedModifications(riskAssessment)
    
    // Apply modifications
    const enhancedPrompt = this.applyHighRiskModifications(basePrompt, modifications, riskAssessment)
    
    // Add urgent attention emphasis if needed
    const finalPrompt = this.addUrgentAttentionEmphasis(
      enhancedPrompt,
      predictions[0]?.condition || 'unknown',
      riskAssessment.urgencyLevel
    )
    
    return {
      ...finalPrompt,
      riskAssessment
    }
  }
  validatePrompt(prompt: MedicalPrompt): { valid: boolean; issues: string[] } {
    const issues: string[] = []
    
    // Check system instruction
    if (!prompt.systemInstruction.includes('supplementary')) {
      issues.push('System instruction must emphasize supplementary nature')
    }
    
    if (!prompt.systemInstruction.includes('NOT provide definitive diagnoses')) {
      issues.push('System instruction must prohibit definitive diagnoses')
    }
    
    // Check safety instructions
    if (prompt.safetyInstructions.length === 0) {
      issues.push('Safety instructions are required')
    }
    
    const requiredSafetyTopics = ['disclaimer', 'professional consultation', 'supplementary']
    requiredSafetyTopics.forEach(topic => {
      const hasTopic = prompt.safetyInstructions.some(instruction => 
        instruction.toLowerCase().includes(topic)
      )
      if (!hasTopic) {
        issues.push(`Safety instructions must include ${topic} guidance`)
      }
    })
    
    // Check user prompt structure
    if (!prompt.userPrompt.includes('BiomedCLIP')) {
      issues.push('User prompt must reference BiomedCLIP analysis')
    }
    
    if (!prompt.userPrompt.includes('RISK ASSESSMENT')) {
      issues.push('User prompt must include risk assessment')
    }
    
    // Check high-risk handling
    if (prompt.contextData.riskLevel.level === 'high') {
      if (!prompt.systemInstruction.includes('IMMEDIATE') && !prompt.systemInstruction.includes('URGENT')) {
        issues.push('High-risk conditions must emphasize urgency')
      }
    }
    
    return {
      valid: issues.length === 0,
      issues
    }
  }

  /**
   * Get template for specific medical scenarios
   */
  getScenarioTemplate(scenario: 'emergency' | 'routine' | 'followup' | 'second_opinion'): Partial<PromptTemplate> {
    switch (scenario) {
      case 'emergency':
        return {
          role: `You are providing URGENT medical guidance for a potentially serious condition.
Your primary goal is to ensure the user seeks immediate professional care while providing supportive information.`,
          
          safetyInstructions: [
            'CRITICAL: Emphasize IMMEDIATE medical attention',
            'Use urgent, clear language about the need for professional care',
            'Provide emergency contact guidance',
            'Avoid any language that might delay care',
            'Stress the time-sensitive nature of the situation'
          ]
        }
        
      case 'routine':
        return {
          role: `You are providing routine medical guidance for a non-urgent condition.
Focus on education, general care recommendations, and appropriate monitoring.`,
          
          safetyInstructions: [
            'Provide balanced, educational information',
            'Recommend routine professional evaluation',
            'Focus on general care and monitoring',
            'Include appropriate medical disclaimers'
          ]
        }
        
      case 'followup':
        return {
          role: `You are providing follow-up guidance for ongoing condition monitoring.
Help the user understand changes and determine if additional care is needed.`,
          
          safetyInstructions: [
            'Focus on change assessment and monitoring',
            'Provide guidance on when to seek additional care',
            'Emphasize the importance of professional follow-up'
          ]
        }
        
      case 'second_opinion':
        return {
          role: `You are providing supplementary information to help the user understand their condition.
Support informed decision-making while emphasizing professional medical care.`,
          
          safetyInstructions: [
            'Provide educational context and general information',
            'Support informed decision-making',
            'Emphasize the value of professional medical opinions',
            'Avoid contradicting existing medical advice'
          ]
        }
        
      default:
        return this.baseTemplate
    }
  }
}

/**
 * Create a singleton instance of the medical prompt builder
 */
let medicalPromptBuilderInstance: MedicalPromptBuilder | null = null

/**
 * Get the singleton medical prompt builder instance
 */
export function getMedicalPromptBuilder(): MedicalPromptBuilder {
  if (!medicalPromptBuilderInstance) {
    medicalPromptBuilderInstance = new MedicalPromptBuilder()
  }
  return medicalPromptBuilderInstance
}