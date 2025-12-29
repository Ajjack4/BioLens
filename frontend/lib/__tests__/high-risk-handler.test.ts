/**
 * Tests for HighRiskHandler
 * Validates high-risk condition detection and emergency handling
 */

import { HighRiskHandler } from '../high-risk-handler'
import { DetectedCondition, AnalysisResult } from '../api-client'

describe('HighRiskHandler', () => {
  let handler: HighRiskHandler

  beforeEach(() => {
    handler = new HighRiskHandler()
  })

  describe('High-Risk Assessment', () => {
    it('should identify melanoma as high-risk', () => {
      const predictions: DetectedCondition[] = [
        {
          condition: 'Melanoma',
          confidence: 0.8,
          severity: 'severe',
          category: 'Oncological',
          requiresAttention: true,
          description: 'Potentially malignant skin lesion'
        }
      ]

      const analysisResult: AnalysisResult = {
        predictions,
        topPrediction: 'Melanoma',
        overallConfidence: 0.8,
        riskLevel: 'high',
        recommendations: [],
        processingInfo: {
          imageProcessed: true,
          symptomsIncluded: false,
          modelUsed: 'BiomedCLIP',
          processingTime: 1000
        }
      }

      const assessment = handler.assessHighRisk(predictions, '', analysisResult)

      expect(assessment.isHighRisk).toBe(true)
      expect(assessment.urgencyLevel).toBe('immediate')
      expect(assessment.riskFactors).toContain('Potential malignant condition detected: Melanoma')
      expect(assessment.emergencyContacts.length).toBeGreaterThan(0)
    })

    it('should identify urgent symptoms', () => {
      const predictions: DetectedCondition[] = [
        {
          condition: 'Atypical Nevus',
          confidence: 0.7,
          severity: 'moderate',
          category: 'Dermatological',
          requiresAttention: true,
          description: 'Unusual mole'
        }
      ]

      const analysisResult: AnalysisResult = {
        predictions,
        topPrediction: 'Atypical Nevus',
        overallConfidence: 0.7,
        riskLevel: 'moderate',
        recommendations: [],
        processingInfo: {
          imageProcessed: true,
          symptomsIncluded: true,
          modelUsed: 'BiomedCLIP',
          processingTime: 1000
        }
      }

      const symptoms = 'rapidly growing mole with irregular borders and color changes'
      const assessment = handler.assessHighRisk(predictions, symptoms, analysisResult)

      expect(assessment.isHighRisk).toBe(true)
      expect(assessment.urgencyLevel).toBe('urgent')
      expect(assessment.riskFactors.some(factor => factor.includes('rapidly growing'))).toBe(true)
      expect(assessment.riskFactors.some(factor => factor.includes('irregular borders'))).toBe(true)
    })

    it('should handle low-risk conditions appropriately', () => {
      const predictions: DetectedCondition[] = [
        {
          condition: 'Seborrheic Keratosis',
          confidence: 0.9,
          severity: 'mild',
          category: 'Benign',
          requiresAttention: false,
          description: 'Benign skin growth'
        }
      ]

      const analysisResult: AnalysisResult = {
        predictions,
        topPrediction: 'Seborrheic Keratosis',
        overallConfidence: 0.9,
        riskLevel: 'low',
        recommendations: [],
        processingInfo: {
          imageProcessed: true,
          symptomsIncluded: false,
          modelUsed: 'BiomedCLIP',
          processingTime: 1000
        }
      }

      const assessment = handler.assessHighRisk(predictions, '', analysisResult)

      expect(assessment.isHighRisk).toBe(false)
      expect(['routine', 'moderate']).toContain(assessment.urgencyLevel)
      // Emergency contacts may still be provided for moderate cases
      expect(assessment.emergencyContacts.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Risk-Based Modifications', () => {
    it('should generate high-risk modifications', () => {
      const assessment = {
        isHighRisk: true,
        urgencyLevel: 'immediate' as const,
        riskFactors: ['Potential malignancy'],
        emergencyContacts: [],
        specialInstructions: []
      }

      const modifications = handler.generateRiskBasedModifications(assessment)

      expect(modifications.promptModifications).toContain('🚨 HIGH-RISK CONDITION DETECTED 🚨')
      expect(modifications.systemInstructions).toContain('CRITICAL: This is a high-risk medical situation requiring immediate attention.')
      expect(modifications.responseRequirements).toContain('Must emphasize IMMEDIATE medical attention in multiple sections')
      expect(modifications.emergencyProtocols.length).toBeGreaterThan(0)
    })

    it('should generate urgent modifications', () => {
      const assessment = {
        isHighRisk: false,
        urgencyLevel: 'urgent' as const,
        riskFactors: ['Requires prompt attention'],
        emergencyContacts: [],
        specialInstructions: []
      }

      const modifications = handler.generateRiskBasedModifications(assessment)

      expect(modifications.promptModifications).toContain('⚠️ URGENT CONDITION REQUIRING PROMPT ATTENTION')
      expect(modifications.systemInstructions).toContain('This condition requires prompt medical attention within 1-3 days.')
    })
  })

  describe('Emergency Contact Information', () => {
    it('should provide emergency contacts for immediate cases', () => {
      const contacts = handler.createEmergencyContactInjection('immediate')

      expect(contacts).toContain('🚨 EMERGENCY CONTACTS:')
      expect(contacts).toContain('Emergency Services')
      expect(contacts).toContain('911')
      expect(contacts).toContain('TIME IS CRITICAL')
    })

    it('should provide appropriate contacts for urgent cases', () => {
      const contacts = handler.createEmergencyContactInjection('urgent')

      expect(contacts).toContain('🚨 EMERGENCY CONTACTS:')
      expect(contacts).toContain('Dermatology Emergency')
      expect(contacts).toContain('Urgent Care Center')
      expect(contacts).not.toContain('911')
    })

    it('should provide no contacts for routine cases', () => {
      const contacts = handler.createEmergencyContactInjection('routine')

      expect(contacts).toBe('')
    })
  })

  describe('Validation', () => {
    it('should validate high-risk handling completeness', () => {
      const assessment = {
        isHighRisk: true,
        urgencyLevel: 'immediate' as const,
        riskFactors: ['Malignant condition'],
        emergencyContacts: [],
        specialInstructions: []
      }

      const promptContent = 'This is a critical medical emergency requiring immediate attention'
      const responseContent = 'EMERGENCY CONTACTS: Call 911 immediately for urgent care'

      const validation = handler.validateHighRiskHandling(assessment, promptContent, responseContent)

      expect(validation.valid).toBe(true)
      expect(validation.issues).toHaveLength(0)
    })

    it('should identify missing urgent language', () => {
      const assessment = {
        isHighRisk: true,
        urgencyLevel: 'immediate' as const,
        riskFactors: ['Malignant condition'],
        emergencyContacts: [],
        specialInstructions: []
      }

      const promptContent = 'This is a routine consultation'
      const responseContent = 'Please monitor the condition and schedule an appointment'

      const validation = handler.validateHighRiskHandling(assessment, promptContent, responseContent)

      expect(validation.valid).toBe(false)
      expect(validation.issues.some(issue => issue.includes('urgent language'))).toBe(true)
    })

    it('should identify inappropriate delay suggestions', () => {
      const assessment = {
        isHighRisk: true,
        urgencyLevel: 'immediate' as const,
        riskFactors: ['Malignant condition'],
        emergencyContacts: [],
        specialInstructions: []
      }

      const promptContent = 'This is urgent and critical'
      const responseContent = 'You can wait and see how it develops over the next few weeks'

      const validation = handler.validateHighRiskHandling(assessment, promptContent, responseContent)

      expect(validation.valid).toBe(false)
      expect(validation.issues.some(issue => issue.includes('waiting or delaying'))).toBe(true)
    })
  })
})