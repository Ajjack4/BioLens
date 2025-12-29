/**
 * Tests for ResponseProcessor
 * Validates medical safety processing and response formatting
 */

import { ResponseProcessor, getResponseProcessor, validateResponseSafety } from '../response-processor'
import { GeminiResponse } from '../gemini-client'
import { ConsultationInput } from '../consultation-engine'

// Mock data for testing
const mockAnalysisResult = {
  predictions: [
    {
      condition: 'Eczema',
      confidence: 0.85,
      severity: 'moderate' as const,
      category: 'Dermatological',
      requiresAttention: true,
      description: 'A common skin condition causing inflammation and itching'
    }
  ],
  topPrediction: 'Eczema',
  overallConfidence: 0.85,
  riskLevel: 'moderate' as const,
  recommendations: ['Consult a healthcare provider', 'Use gentle moisturizers'],
  processingInfo: {
    modelUsed: 'biomedclip',
    imageProcessed: true,
    symptomsIncluded: true
  }
}

const mockConsultationInput: ConsultationInput = {
  analysisResult: mockAnalysisResult,
  symptoms: 'Itchy, red patches on arms',
  sessionId: 'test-session-123',
  timestamp: new Date(),
  userAgent: 'test-agent'
}

describe('ResponseProcessor', () => {
  let processor: ResponseProcessor

  beforeEach(() => {
    processor = new ResponseProcessor()
  })

  describe('Medical Safety Validation', () => {
    test('should detect prohibited medical language', () => {
      const unsafeResponse = 'I diagnose you with eczema. Take this medication immediately.'
      const validation = processor.validateMedicalSafety(unsafeResponse)
      
      expect(validation.valid).toBe(false)
      expect(validation.issues.length).toBeGreaterThan(0)
      expect(validation.issues[0]).toContain('prohibited medical language')
    })

    test('should validate safe medical response', () => {
      const safeResponse = `
        **Assessment**: The analysis suggests the possibility of eczema based on visual patterns.
        **Recommendations**: Consider consulting a healthcare provider for proper evaluation.
        **Important**: This is not a substitute for professional medical advice. Always consult qualified healthcare providers.
      `
      const validation = processor.validateMedicalSafety(safeResponse)
      
      expect(validation.valid).toBe(true)
      expect(validation.issues.length).toBe(0)
    })

    test('should require adequate medical disclaimers', () => {
      const responseWithoutDisclaimer = 'You have eczema. Apply moisturizer.'
      const validation = processor.validateMedicalSafety(responseWithoutDisclaimer)
      
      expect(validation.valid).toBe(false)
      expect(validation.issues.some(issue => issue.includes('disclaimer'))).toBe(true)
    })

    test('should assess risk levels correctly', () => {
      const highRiskResponse = 'This appears to be melanoma. Seek immediate medical attention.'
      const validation = processor.validateMedicalSafety(highRiskResponse)
      
      expect(validation.riskLevel).toBe('high')
      expect(validation.requiresEmergencyContacts).toBe(true)
    })
  })

  describe('Response Structure Validation', () => {
    test('should validate complete response structure', () => {
      const completeResponse = `
        **Condition Assessment**: Based on analysis, this appears to be eczema.
        **Symptom Correlation**: Your reported itching aligns with eczema symptoms.
        **Recommendations**: 
        - Consult a healthcare provider
        - Use gentle moisturizers
        **Urgency**: Routine medical consultation recommended
        **Educational Information**: Eczema is a common inflammatory skin condition.
        **Medical Disclaimer**: This is not a substitute for professional medical advice.
      `
      
      const structure = processor.validateResponseStructure(completeResponse)
      
      expect(structure.hasAssessment).toBe(true)
      expect(structure.hasSymptomCorrelation).toBe(true)
      expect(structure.hasRecommendations).toBe(true)
      expect(structure.hasUrgencyLevel).toBe(true)
      expect(structure.hasEducationalInfo).toBe(true)
      expect(structure.hasDisclaimer).toBe(true)
      expect(structure.missingRequired.length).toBe(0)
    })

    test('should identify missing required sections', () => {
      const incompleteResponse = 'This looks like eczema.'
      const structure = processor.validateResponseStructure(incompleteResponse)
      
      expect(structure.missingRequired.length).toBeGreaterThan(0)
      expect(structure.missingRequired).toContain('hasRecommendations')
    })
  })

  describe('Response Processing', () => {
    test('should process valid Gemini response successfully', () => {
      const mockGeminiResponse: GeminiResponse = {
        success: true,
        content: `
          **Condition Assessment**: Based on the analysis, this appears to be eczema with moderate severity.
          **Symptom Correlation**: Your reported itching and red patches are consistent with eczema symptoms.
          **Recommendations**: 
          - Consult a dermatologist for proper evaluation
          - Use fragrance-free moisturizers
          - Avoid known triggers
          **Urgency**: Schedule an appointment within 1-2 weeks
          **Educational Information**: Eczema is a chronic inflammatory skin condition that can be managed effectively.
          **Medical Disclaimer**: This analysis is not a substitute for professional medical advice.
        `,
        metadata: {
          modelUsed: 'gemini-1.5-pro',
          processingTime: 1500,
          tokensUsed: 200
        }
      }

      const result = processor.processResponse(mockGeminiResponse, mockConsultationInput)
      
      // Should have valid consultation structure
      expect(result.consultation).toBeDefined()
      expect(result.consultation.conditionAssessment).toBeDefined()
      expect(result.consultation.symptomCorrelation).toBeDefined()
      expect(result.consultation.recommendations).toBeDefined()
      expect(result.consultation.urgencyLevel).toBeDefined()
      expect(result.consultation.educationalInfo).toBeDefined()
      expect(result.consultation.medicalDisclaimer).toContain('NOT a substitute')
      expect(result.metadata.safetyValidated).toBe(true)
    })

    test('should handle failed Gemini response', () => {
      const failedResponse: GeminiResponse = {
        success: false,
        error: 'API request failed',
        metadata: {
          modelUsed: 'gemini-1.5-pro',
          processingTime: 100
        }
      }

      expect(() => {
        processor.processResponse(failedResponse, mockConsultationInput)
      }).toThrow('Invalid Gemini response')
    })

    test('should generate fallback content when sections are missing', () => {
      const incompleteResponse: GeminiResponse = {
        success: true,
        content: 'This looks like eczema.',
        metadata: {
          modelUsed: 'gemini-1.5-pro',
          processingTime: 500
        }
      }

      const result = processor.processResponse(incompleteResponse, mockConsultationInput)
      
      // Should generate fallback content
      expect(result.consultation.conditionAssessment).toBeDefined()
      expect(result.consultation.conditionAssessment.length).toBeGreaterThan(0)
      expect(result.consultation.recommendations).toBeDefined()
      expect(result.consultation.medicalDisclaimer).toContain('DISCLAIMER')
    })
  })

  describe('Content Sanitization', () => {
    test('should sanitize prohibited content', () => {
      const unsafeResponse: GeminiResponse = {
        success: true,
        content: 'I diagnose you with eczema. Take this prescription medication.',
        metadata: {
          modelUsed: 'gemini-1.5-pro',
          processingTime: 500
        }
      }

      const result = processor.processResponse(unsafeResponse, mockConsultationInput)
      
      // Prohibited terms should be replaced with safer alternatives
      expect(result.consultation.conditionAssessment).not.toContain('I diagnose')
      expect(result.consultation.conditionAssessment).not.toContain('prescription')
    })

    test('should remove HTML tags from content', () => {
      const htmlResponse: GeminiResponse = {
        success: true,
        content: '<script>alert("test")</script>**Assessment**: This appears to be <b>eczema</b>.',
        metadata: {
          modelUsed: 'gemini-1.5-pro',
          processingTime: 500
        }
      }

      const result = processor.processResponse(htmlResponse, mockConsultationInput)
      
      expect(result.consultation.conditionAssessment).not.toContain('<script>')
      expect(result.consultation.conditionAssessment).not.toContain('<b>')
    })
  })

  describe('Emergency Contacts Generation', () => {
    test('should generate emergency contacts for high-risk conditions', () => {
      const highRiskInput: ConsultationInput = {
        ...mockConsultationInput,
        analysisResult: {
          ...mockAnalysisResult,
          riskLevel: 'high',
          predictions: [{
            ...mockAnalysisResult.predictions[0],
            condition: 'Melanoma',
            severity: 'severe' as const
          }]
        }
      }

      const highRiskResponse: GeminiResponse = {
        success: true,
        content: 'This appears to be melanoma. Seek immediate medical attention.',
        metadata: {
          modelUsed: 'gemini-1.5-pro',
          processingTime: 500
        }
      }

      const result = processor.processResponse(highRiskResponse, highRiskInput)
      
      expect(result.emergencyContacts).toBeDefined()
      expect(result.emergencyContacts!.length).toBeGreaterThan(0)
      expect(result.emergencyContacts!.some(contact => contact.type === 'emergency')).toBe(true)
    })

    test('should not generate emergency contacts for low-risk conditions', () => {
      const lowRiskInput: ConsultationInput = {
        ...mockConsultationInput,
        analysisResult: {
          ...mockAnalysisResult,
          riskLevel: 'low'
        }
      }

      const lowRiskResponse: GeminiResponse = {
        success: true,
        content: 'This appears to be mild eczema. Monitor and consider routine consultation.',
        metadata: {
          modelUsed: 'gemini-1.5-pro',
          processingTime: 500
        }
      }

      const result = processor.processResponse(lowRiskResponse, lowRiskInput)
      
      expect(result.emergencyContacts).toBeUndefined()
    })
  })
})

describe('Singleton Functions', () => {
  test('getResponseProcessor should return singleton instance', () => {
    const processor1 = getResponseProcessor()
    const processor2 = getResponseProcessor()
    
    expect(processor1).toBe(processor2)
  })

  test('validateResponseSafety should work as standalone function', () => {
    const unsafeResponse = 'I diagnose you with cancer. Take this medication.'
    const validation = validateResponseSafety(unsafeResponse)
    
    expect(validation.valid).toBe(false)
    expect(validation.issues.length).toBeGreaterThan(0)
  })
})