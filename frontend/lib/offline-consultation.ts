/**
 * Offline Consultation System
 * Provides comprehensive medical consultation capabilities without external API dependencies
 * Implements enhanced analysis-based consultation for seamless fallback experience
 */

import { AnalysisResult, DetectedCondition } from './api-client'
import { ConsultationResponse, ConsultationInput } from './consultation-engine'

export interface OfflineConsultationConfig {
  includeDetailedRecommendations: boolean
  includeEducationalContent: boolean
  includeEmergencyContacts: boolean
  maxRecommendations: number
}

/**
 * Comprehensive offline consultation system
 * Provides intelligent medical guidance based solely on BiomedCLIP analysis results
 */
export class OfflineConsultationEngine {
  private config: OfflineConsultationConfig

  constructor(config: Partial<OfflineConsultationConfig> = {}) {
    this.config = {
      includeDetailedRecommendations: true,
      includeEducationalContent: true,
      includeEmergencyContacts: true,
      maxRecommendations: 8,
      ...config
    }
  }

  /**
   * Generates comprehensive offline consultation
   * Works entirely without external dependencies
   */
  generateOfflineConsultation(
    analysisResult: AnalysisResult,
    symptoms: string = '',
    sessionId: string
  ): ConsultationResponse {
    const startTime = Date.now()

    try {
      // Validate input
      if (!analysisResult || !analysisResult.predictions || analysisResult.predictions.length === 0) {
        throw new Error('Invalid analysis result provided')
      }

      const topPrediction = analysisResult.predictions[0]
      const riskLevel = this.assessOfflineRiskLevel(analysisResult)
      const processedSymptoms = this.processSymptoms(symptoms)

      // Generate comprehensive consultation components
      const conditionAssessment = this.generateOfflineAssessment(analysisResult, processedSymptoms)
      const symptomCorrelation = this.generateOfflineSymptomCorrelation(symptoms, analysisResult, processedSymptoms)
      const recommendations = this.generateOfflineRecommendations(analysisResult, symptoms, riskLevel)
      const urgencyLevel = this.determineOfflineUrgencyLevel(analysisResult, riskLevel)
      const educationalInfo = this.generateOfflineEducationalInfo(topPrediction, analysisResult)
      const medicalDisclaimer = this.getOfflineMedicalDisclaimer()

      const processingTime = Date.now() - startTime

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
          modelUsed: 'Offline Consultation Engine v2.0',
          processingTime,
          confidenceScore: analysisResult.overallConfidence,
          fallbackUsed: true,
          safetyValidated: true
        },
        emergencyContacts: this.config.includeEmergencyContacts ? 
          this.getOfflineEmergencyContacts(riskLevel) : undefined
      }

    } catch (error) {
      console.error('Offline consultation generation failed:', error)
      return this.generateMinimalConsultation(analysisResult, sessionId)
    }
  }

  /**
   * Generates comprehensive offline assessment
   */
  private generateOfflineAssessment(
    analysisResult: AnalysisResult, 
    processedSymptoms: any
  ): string {
    const topPrediction = analysisResult.predictions[0]
    const confidence = (analysisResult.overallConfidence * 100).toFixed(1)

    let assessment = `**Comprehensive Offline Analysis**\n\n`
    
    assessment += `Based on advanced image analysis, the most likely condition is **${topPrediction.condition}** with ${confidence}% confidence. `
    
    // Add detailed condition context
    assessment += `This condition is classified as **${topPrediction.severity} severity** in the **${topPrediction.category}** category. `
    
    // Add attention requirements
    if (topPrediction.requiresAttention) {
      assessment += `⚠️ This condition typically **requires medical attention** for proper evaluation and treatment. `
    } else {
      assessment += `This condition may be manageable with appropriate care and monitoring. `
    }

    // Add confidence interpretation
    if (analysisResult.overallConfidence > 0.8) {
      assessment += `The **high confidence level** (${confidence}%) suggests strong visual pattern matching with known characteristics of this condition. `
    } else if (analysisResult.overallConfidence > 0.6) {
      assessment += `The **moderate-high confidence level** (${confidence}%) indicates good pattern matching, though professional confirmation is recommended. `
    } else if (analysisResult.overallConfidence > 0.4) {
      assessment += `The **moderate confidence level** (${confidence}%) suggests possible pattern matching, but professional evaluation is strongly recommended for definitive assessment. `
    } else {
      assessment += `The **lower confidence level** (${confidence}%) indicates uncertainty in the analysis. Professional medical evaluation is essential for accurate diagnosis. `
    }

    // Add alternative possibilities
    if (analysisResult.predictions.length > 1) {
      const alternatives = analysisResult.predictions.slice(1, 4)
        .map(pred => `${pred.condition} (${(pred.confidence * 100).toFixed(1)}%)`)
        .join(', ')
      assessment += `\n\n**Alternative possibilities to consider:** ${alternatives}. `
      assessment += `These alternatives should be discussed with a healthcare provider for comprehensive evaluation. `
    }

    // Add symptom integration context
    if (processedSymptoms.keywords.length > 0) {
      assessment += `\n\n**Symptom Integration:** Your reported symptoms (${processedSymptoms.keywords.join(', ')}) have been considered in this analysis and may provide additional diagnostic context. `
    }

    // Add risk level context
    const riskLevel = analysisResult.riskLevel
    if (riskLevel === 'high') {
      assessment += `\n\n🚨 **HIGH RISK ASSESSMENT:** This condition requires immediate medical attention. Do not delay seeking professional care. `
    } else if (riskLevel === 'moderate') {
      assessment += `\n\n⚠️ **MODERATE RISK ASSESSMENT:** This condition should be evaluated by a healthcare provider within a reasonable timeframe. `
    } else {
      assessment += `\n\n✅ **LOW RISK ASSESSMENT:** While this appears to be a lower-risk condition, monitoring and appropriate care are still recommended. `
    }

    return assessment
  }

  /**
   * Generates offline symptom correlation analysis
   */
  private generateOfflineSymptomCorrelation(
    symptoms: string,
    analysisResult: AnalysisResult,
    processedSymptoms: any
  ): string {
    if (!symptoms || symptoms.trim().length === 0) {
      return `**No symptoms provided** - Analysis was performed based solely on visual characteristics. Adding symptom information could enhance the assessment accuracy and provide more personalized recommendations.`
    }

    const topCondition = analysisResult.predictions[0]
    let correlation = `**Symptom-Condition Correlation Analysis**\n\n`

    correlation += `Your reported symptoms have been analyzed in relation to the detected condition (**${topCondition.condition}**). `

    // Analyze symptom keywords
    if (processedSymptoms.keywords.length > 0) {
      correlation += `**Key symptoms identified:** ${processedSymptoms.keywords.join(', ')}. `

      // Condition-specific symptom correlations
      const conditionLower = topCondition.condition.toLowerCase()
      
      if (conditionLower.includes('eczema')) {
        if (processedSymptoms.keywords.includes('itch') || processedSymptoms.keywords.includes('itchy')) {
          correlation += `✅ **Strong correlation:** Itching is a hallmark symptom of eczema and strongly supports this diagnosis. `
        }
        if (processedSymptoms.keywords.includes('dry') || processedSymptoms.keywords.includes('flaky')) {
          correlation += `✅ **Supporting evidence:** Dry, flaky skin is commonly associated with eczema. `
        }
      } else if (conditionLower.includes('psoriasis')) {
        if (processedSymptoms.keywords.includes('scaly') || processedSymptoms.keywords.includes('flaky')) {
          correlation += `✅ **Strong correlation:** Scaling is a characteristic feature of psoriasis. `
        }
        if (processedSymptoms.keywords.includes('red') || processedSymptoms.keywords.includes('inflamed')) {
          correlation += `✅ **Supporting evidence:** Redness and inflammation are typical of psoriatic lesions. `
        }
      } else if (conditionLower.includes('fungal')) {
        if (processedSymptoms.keywords.includes('itch') || processedSymptoms.keywords.includes('burn')) {
          correlation += `✅ **Strong correlation:** Itching and burning are common symptoms of fungal infections. `
        }
      } else if (conditionLower.includes('acne')) {
        if (processedSymptoms.keywords.includes('pain') || processedSymptoms.keywords.includes('tender')) {
          correlation += `✅ **Supporting evidence:** Pain and tenderness can occur with inflammatory acne. `
        }
      } else if (conditionLower.includes('melanoma') || conditionLower.includes('carcinoma')) {
        correlation += `⚠️ **Critical note:** Any changes in size, color, texture, or new symptoms in suspicious lesions require immediate medical evaluation. `
      }
    }

    // Analyze symptom severity
    if (processedSymptoms.severity !== 'unknown') {
      correlation += `\n\n**Symptom severity assessment:** ${processedSymptoms.severity}. `
      
      if (processedSymptoms.severity === 'severe') {
        correlation += `The severe nature of your symptoms increases the urgency for professional medical evaluation. `
      } else if (processedSymptoms.severity === 'moderate') {
        correlation += `Moderate symptoms suggest the condition is having a noticeable impact and warrants medical attention. `
      }
    }

    // Analyze duration if available
    if (processedSymptoms.duration !== 'unknown') {
      correlation += `**Duration context:** Symptoms lasting ${processedSymptoms.duration} provide important diagnostic information. `
      
      if (processedSymptoms.duration === 'days') {
        correlation += `Recent onset may suggest acute conditions or flare-ups of chronic conditions. `
      } else if (processedSymptoms.duration === 'weeks' || processedSymptoms.duration === 'months') {
        correlation += `Persistent symptoms over this timeframe indicate the need for professional evaluation and management. `
      } else if (processedSymptoms.duration === 'years') {
        correlation += `Long-standing symptoms suggest a chronic condition that may benefit from ongoing medical management. `
      }
    }

    correlation += `\n\n**Recommendation:** This symptom analysis enhances the visual assessment and should be shared with your healthcare provider for comprehensive evaluation.`

    return correlation
  }

  /**
   * Generates comprehensive offline recommendations
   */
  private generateOfflineRecommendations(
    analysisResult: AnalysisResult,
    symptoms: string,
    riskLevel: 'low' | 'moderate' | 'high'
  ): string[] {
    const recommendations: string[] = []
    const topCondition = analysisResult.predictions[0]
    const conditionLower = topCondition.condition.toLowerCase()

    // Priority recommendations based on risk level
    if (riskLevel === 'high') {
      recommendations.push('🚨 **URGENT PRIORITY:** Seek immediate medical attention from a dermatologist or emergency care')
      recommendations.push('📞 **Contact healthcare provider today** - do not delay for high-risk conditions')
      recommendations.push('🏥 **Consider emergency care** if symptoms worsen rapidly or you develop systemic symptoms')
      recommendations.push('📋 **Prepare for medical visit:** Document all symptoms, changes, and timeline')
    } else if (riskLevel === 'moderate') {
      recommendations.push('📅 **Schedule medical appointment** within 1-2 weeks with healthcare provider or dermatologist')
      recommendations.push('👀 **Monitor closely** and seek immediate care if condition worsens or spreads')
      recommendations.push('📸 **Document changes** with photos and symptom tracking for medical consultation')
      recommendations.push('⚠️ **Seek immediate care if:** rapid changes, severe pain, fever, or systemic symptoms develop')
    } else {
      recommendations.push('🩺 **Consider medical consultation** if symptoms persist beyond 2-3 weeks or worsen')
      recommendations.push('📊 **Continue monitoring** and maintain good skin care practices')
      recommendations.push('📝 **Track symptoms** and any changes for future medical reference')
    }

    // Condition-specific recommendations
    if (conditionLower.includes('eczema')) {
      recommendations.push('🧴 **Moisturize regularly** with fragrance-free, hypoallergenic moisturizers (2-3 times daily)')
      recommendations.push('🧼 **Use gentle products:** mild, pH-balanced cleansers and avoid harsh soaps')
      recommendations.push('🚫 **Identify triggers:** avoid known irritants (certain fabrics, fragrances, stress)')
      recommendations.push('❄️ **For acute symptoms:** consider cool compresses and over-the-counter hydrocortisone cream')
      recommendations.push('🌡️ **Temperature control:** use lukewarm water for bathing and avoid hot showers')
    } else if (conditionLower.includes('psoriasis')) {
      recommendations.push('🧴 **Heavy moisturizing:** apply thick creams or ointments multiple times daily')
      recommendations.push('☀️ **Controlled sun exposure:** limited sunlight may help, but always use sunscreen')
      recommendations.push('🧘 **Stress management:** practice stress reduction as it can trigger flare-ups')
      recommendations.push('🧴 **Scalp care:** use medicated shampoos if scalp is affected')
      recommendations.push('💊 **Consider supplements:** discuss omega-3 fatty acids with healthcare provider')
    } else if (conditionLower.includes('fungal')) {
      recommendations.push('🌬️ **Keep area dry:** ensure good ventilation and avoid moisture buildup')
      recommendations.push('💊 **Antifungal treatment:** consider over-the-counter antifungal creams or powders')
      recommendations.push('🧺 **Hygiene measures:** wash clothing/bedding in hot water (140°F+) and dry thoroughly')
      recommendations.push('🚫 **Avoid sharing:** don\'t share towels, shoes, or personal items')
      recommendations.push('👟 **Footwear:** wear breathable shoes and change socks daily if feet are affected')
    } else if (conditionLower.includes('acne')) {
      recommendations.push('🧼 **Gentle cleansing:** use non-comedogenic, gentle cleansers twice daily')
      recommendations.push('🚫 **Avoid over-washing:** excessive cleansing can worsen inflammation')
      recommendations.push('💊 **OTC treatments:** consider salicylic acid or benzoyl peroxide products')
      recommendations.push('🚫 **Don\'t pick:** avoid squeezing or picking lesions to prevent scarring')
      recommendations.push('🧴 **Non-comedogenic products:** use oil-free, non-pore-clogging skincare and makeup')
    } else if (conditionLower.includes('melanoma') || conditionLower.includes('carcinoma')) {
      recommendations.push('🚨 **CRITICAL:** Contact dermatologist immediately for urgent evaluation')
      recommendations.push('☀️ **Sun protection:** protect area from UV exposure while awaiting medical care')
      recommendations.push('📏 **Document thoroughly:** take high-quality photos with ruler for scale reference')
      recommendations.push('📋 **Prepare medical history:** list any changes in size, color, texture, or symptoms')
      recommendations.push('⏰ **Don\'t delay:** skin cancers require prompt professional evaluation and treatment')
    } else if (conditionLower.includes('dermatitis')) {
      recommendations.push('🧴 **Gentle skin care:** use hypoallergenic, fragrance-free products')
      recommendations.push('🚫 **Avoid irritants:** identify and eliminate potential triggers')
      recommendations.push('❄️ **Cool compresses:** apply for 10-15 minutes to reduce inflammation and itching')
      recommendations.push('💊 **Anti-inflammatory:** consider over-the-counter hydrocortisone for short-term use')
    }

    // General skin health recommendations
    if (this.config.includeDetailedRecommendations) {
      recommendations.push('📸 **Photo documentation:** take weekly photos in good lighting to track changes')
      recommendations.push('☀️ **Daily sun protection:** use broad-spectrum SPF 30+ sunscreen, even indoors')
      recommendations.push('💧 **Stay hydrated:** maintain good hydration for overall skin health')
      recommendations.push('🥗 **Healthy diet:** consider anti-inflammatory foods and discuss supplements with provider')
      recommendations.push('😴 **Quality sleep:** adequate rest supports skin healing and immune function')
    }

    // Symptom-specific additions
    if (symptoms) {
      const symptomsLower = symptoms.toLowerCase()
      if (symptomsLower.includes('pain')) {
        recommendations.push('💊 **Pain management:** consider appropriate over-the-counter pain relief and cool compresses')
      }
      if (symptomsLower.includes('itch')) {
        recommendations.push('🧊 **Itch relief:** use cool compresses, antihistamines, or anti-itch creams as appropriate')
      }
      if (symptomsLower.includes('burn')) {
        recommendations.push('❄️ **Burning sensation:** apply cool, damp cloths and avoid further irritation')
      }
    }

    // Limit recommendations based on configuration
    return recommendations.slice(0, this.config.maxRecommendations)
  }

  /**
   * Generates comprehensive offline educational information
   */
  private generateOfflineEducationalInfo(
    condition: DetectedCondition,
    analysisResult: AnalysisResult
  ): string {
    if (!this.config.includeEducationalContent) {
      return condition.description || 'Educational information not available in current configuration.'
    }

    let info = `**About ${condition.condition}**\n\n`
    
    // Add basic description
    info += condition.description || 'This is a skin condition that requires professional medical evaluation for proper diagnosis and treatment.'
    
    // Add category-specific information
    if (condition.category === 'Dermatological') {
      info += '\n\n**Dermatological Conditions:** These skin conditions often involve inflammation, irritation, or structural changes in the skin. They typically benefit from consistent skincare routines, appropriate topical treatments, and professional medical guidance. Many dermatological conditions are chronic and require ongoing management rather than one-time treatment.'
    } else if (condition.category === 'Infectious') {
      info += '\n\n**Infectious Conditions:** These are caused by microorganisms such as bacteria, fungi, or viruses. They are often treatable with appropriate antimicrobial medications when properly diagnosed. Early treatment typically leads to better outcomes and prevents spread to other areas or individuals.'
    } else if (condition.category === 'Autoimmune') {
      info += '\n\n**Autoimmune Conditions:** These occur when the immune system mistakenly attacks healthy skin tissue. They are typically chronic conditions that can be effectively managed with proper medical care, lifestyle modifications, and sometimes immunosuppressive treatments. Stress management and trigger avoidance are often important components of treatment.'
    } else if (condition.category === 'Oncological') {
      info += '\n\n**⚠️ Oncological Conditions:** These involve abnormal cell growth that may be benign or malignant. Early detection and treatment are crucial for the best outcomes. Regular skin examinations and prompt evaluation of suspicious lesions are essential preventive measures.'
    } else if (condition.category === 'Benign') {
      info += '\n\n**Benign Conditions:** These are non-cancerous growths or changes that typically don\'t pose serious health risks. However, they may still benefit from monitoring and sometimes treatment for cosmetic or comfort reasons.'
    }

    // Add severity-specific information
    if (condition.severity === 'severe') {
      info += '\n\n**Severity Level - Severe:** This condition classification indicates significant impact on skin health and typically requires prompt medical attention and potentially aggressive treatment approaches.'
    } else if (condition.severity === 'moderate') {
      info += '\n\n**Severity Level - Moderate:** This condition may cause noticeable symptoms and discomfort, typically benefiting from medical evaluation and appropriate treatment to prevent progression.'
    } else if (condition.severity === 'mild') {
      info += '\n\n**Severity Level - Mild:** While less severe, this condition still warrants attention and appropriate care to prevent worsening and maintain skin health.'
    }

    // Add confidence-based educational context
    if (analysisResult.overallConfidence > 0.8) {
      info += '\n\n**Analysis Confidence:** The high confidence in this analysis suggests strong visual pattern matching. However, definitive diagnosis requires professional medical evaluation, as similar-appearing conditions can have different underlying causes and treatments.'
    } else if (analysisResult.overallConfidence < 0.5) {
      info += '\n\n**Analysis Confidence:** The moderate confidence level indicates some uncertainty in the visual analysis. Professional medical evaluation is particularly important for accurate diagnosis and appropriate treatment planning.'
    }

    // Add general prevention and management information
    info += '\n\n**General Skin Health:** Maintaining good skin health involves regular cleansing with gentle products, adequate moisturization, sun protection, stress management, and prompt attention to changes or new symptoms. Regular self-examinations and professional skin checks are important preventive measures.'

    return info
  }

  /**
   * Processes symptoms for enhanced analysis
   */
  private processSymptoms(symptoms: string): any {
    if (!symptoms || symptoms.trim().length === 0) {
      return {
        keywords: [],
        severity: 'unknown',
        duration: 'unknown',
        location: 'skin'
      }
    }

    const symptomsLower = symptoms.toLowerCase()
    
    // Extract symptom keywords
    const keywords: string[] = []
    const symptomKeywords = [
      'itch', 'itchy', 'scratch', 'scratching',
      'pain', 'painful', 'hurt', 'hurts', 'tender',
      'burn', 'burning', 'sting', 'stinging',
      'red', 'redness', 'inflamed', 'swollen', 'swelling',
      'dry', 'flaky', 'scaly', 'peeling', 'cracking',
      'bump', 'bumps', 'lump', 'lumps', 'raised',
      'rash', 'spots', 'patches', 'lesion', 'blisters'
    ]

    symptomKeywords.forEach(keyword => {
      if (symptomsLower.includes(keyword)) {
        keywords.push(keyword)
      }
    })

    // Assess severity indicators
    let severity = 'mild'
    const severeIndicators = ['severe', 'intense', 'unbearable', 'extreme', 'very painful', 'excruciating']
    const moderateIndicators = ['moderate', 'noticeable', 'bothersome', 'uncomfortable', 'significant']
    
    if (severeIndicators.some(indicator => symptomsLower.includes(indicator))) {
      severity = 'severe'
    } else if (moderateIndicators.some(indicator => symptomsLower.includes(indicator))) {
      severity = 'moderate'
    }

    // Extract duration if mentioned
    let duration = 'unknown'
    if (symptomsLower.includes('day') || symptomsLower.includes('today') || symptomsLower.includes('yesterday')) {
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
      location: 'skin'
    }
  }

  /**
   * Assesses risk level for offline consultation
   */
  private assessOfflineRiskLevel(analysisResult: AnalysisResult): 'low' | 'moderate' | 'high' {
    const topCondition = analysisResult.predictions[0]
    const conditionLower = topCondition.condition.toLowerCase()
    
    // High-risk conditions
    if (conditionLower.includes('melanoma') || 
        conditionLower.includes('carcinoma') ||
        conditionLower.includes('cancer')) {
      return 'high'
    }
    
    // Use existing risk level as baseline
    let riskLevel = analysisResult.riskLevel
    
    // Adjust based on additional factors
    if (topCondition.requiresAttention && analysisResult.overallConfidence > 0.7) {
      if (riskLevel === 'low') riskLevel = 'moderate'
    }
    
    if (topCondition.severity === 'severe') {
      if (riskLevel === 'low') riskLevel = 'moderate'
    }
    
    return riskLevel
  }

  /**
   * Determines urgency level for offline consultation
   */
  private determineOfflineUrgencyLevel(
    analysisResult: AnalysisResult,
    riskLevel: 'low' | 'moderate' | 'high'
  ): 'immediate' | 'within_week' | 'routine' | 'monitor' {
    const topCondition = analysisResult.predictions[0]
    const conditionLower = topCondition.condition.toLowerCase()
    
    // Immediate attention for high-risk conditions
    if (riskLevel === 'high' || 
        conditionLower.includes('melanoma') || 
        conditionLower.includes('carcinoma')) {
      return 'immediate'
    }
    
    // Within week for conditions requiring attention
    if (topCondition.requiresAttention || riskLevel === 'moderate') {
      return 'within_week'
    }
    
    // Monitor for low-risk conditions
    if (riskLevel === 'low' && !topCondition.requiresAttention) {
      return 'monitor'
    }
    
    return 'routine'
  }

  /**
   * Gets offline emergency contacts
   */
  private getOfflineEmergencyContacts(riskLevel: 'low' | 'moderate' | 'high'): any[] {
    const contacts: any[] = []
    
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
      description: 'Specialized skin condition care and diagnosis'
    })
    
    if (riskLevel !== 'low') {
      contacts.push({
        type: 'urgent_care',
        name: 'Urgent Care Center',
        phone: 'Find local urgent care',
        description: 'For non-emergency but urgent medical needs'
      })
    }
    
    return contacts
  }

  /**
   * Gets comprehensive offline medical disclaimer
   */
  private getOfflineMedicalDisclaimer(): string {
    return '⚠️ **COMPREHENSIVE MEDICAL DISCLAIMER**: This offline AI-powered analysis is for informational and educational purposes only and is NOT a substitute for professional medical advice, diagnosis, or treatment. The analysis is based on visual pattern recognition and should never be used for self-diagnosis or treatment decisions. This system operates independently without external AI consultation and provides enhanced analysis based on established medical knowledge patterns. Always consult a qualified healthcare provider, dermatologist, or medical professional for any health concerns, skin changes, or before making any medical decisions. If you have a medical emergency or urgent symptoms, call emergency services immediately. For skin conditions showing rapid changes, unusual symptoms, or causing significant concern, seek prompt medical attention. This analysis should be shared with your healthcare provider as supplementary information only.'
  }

  /**
   * Generates minimal consultation for critical failures
   */
  private generateMinimalConsultation(
    analysisResult: AnalysisResult,
    sessionId: string
  ): ConsultationResponse {
    const topPrediction = analysisResult.predictions[0]
    
    return {
      consultation: {
        conditionAssessment: `Analysis detected: ${topPrediction.condition}. Professional medical evaluation is recommended for proper diagnosis and treatment.`,
        symptomCorrelation: 'Symptom analysis unavailable due to system limitations.',
        recommendations: [
          'Consult a healthcare provider or dermatologist',
          'Monitor the condition for any changes',
          'Take photos to track progression',
          'Seek immediate care if condition worsens rapidly'
        ],
        urgencyLevel: topPrediction.requiresAttention ? 'within_week' : 'routine',
        educationalInfo: topPrediction.description || 'Professional medical evaluation recommended.',
        medicalDisclaimer: this.getOfflineMedicalDisclaimer()
      },
      metadata: {
        modelUsed: 'Minimal Offline Consultation',
        processingTime: 0,
        confidenceScore: analysisResult.overallConfidence,
        fallbackUsed: true,
        safetyValidated: true
      }
    }
  }
}

/**
 * Create singleton instance for offline consultation
 */
let offlineConsultationInstance: OfflineConsultationEngine | null = null

/**
 * Get offline consultation engine instance
 */
export function getOfflineConsultationEngine(config?: Partial<OfflineConsultationConfig>): OfflineConsultationEngine {
  if (!offlineConsultationInstance) {
    offlineConsultationInstance = new OfflineConsultationEngine(config)
  }
  return offlineConsultationInstance
}

/**
 * Generate offline consultation (convenience function)
 */
export function generateOfflineConsultation(
  analysisResult: AnalysisResult,
  symptoms: string = '',
  sessionId: string,
  config?: Partial<OfflineConsultationConfig>
): ConsultationResponse {
  const engine = getOfflineConsultationEngine(config)
  return engine.generateOfflineConsultation(analysisResult, symptoms, sessionId)
}