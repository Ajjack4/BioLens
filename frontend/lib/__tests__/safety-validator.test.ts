/**
 * Tests for SafetyValidator
 * Validates medical safety compliance and prohibited content detection
 */

import { 
  SafetyValidator, 
  MedicalComplianceValidator,
  getSafetyValidator, 
  getMedicalComplianceValidator,
  validateResponseSafety,
  performMedicalComplianceCheck
} from '../safety-validator'
import { ConsultationResponse } from '../consultation-engine'
import { AnalysisResult } from '../api-client'

describe('SafetyValidator', () => {
  let validator: SafetyValidator

  beforeEach(() => {
    validator = getSafetyValidator()
  })

  describe('validateResponse', () => {
    it('should validate safe medical response', () => {
      const safeResponse = `
        **Condition Assessment**: The analysis suggests this may be consistent with eczema.
        **Recommendations**: 
        - Consider consulting a healthcare provider for proper evaluation
        - Apply fragrance-free moisturizer regularly
        **Important**: This is not a substitute for professional medical advice. 
        Please consult a qualified healthcare provider for any health concerns.
      `

      const result = validator.validateResponse(safeResponse)
      
      expect(result.valid).toBe(true)
      expect(result.issues).toHaveLength(0)
      expect(result.riskLevel).toBe('low')
    })

    it('should detect prohibited diagnostic language', () => {
      const unsafeResponse = `
        You have eczema. I diagnose this condition as definitely eczema.
        Take this medication and you will be cured.
      `

      const result = validator.validateResponse(unsafeResponse)
      
      expect(result.valid).toBe(false)
      expect(result.issues.length).toBeGreaterThan(0)
      expect(result.issues.some(issue => issue.includes('prohibited'))).toBe(true)
    })

    it('should detect missing medical disclaimers', () => {
      const responseWithoutDisclaimer = `
        This appears to be eczema. You should moisturize regularly.
      `

      const result = validator.validateResponse(responseWithoutDisclaimer)
      
      expect(result.valid).toBe(false)
      expect(result.issues.some(issue => issue.includes('disclaimer'))).toBe(true)
    })

    it('should assess urgency level correctly', () => {
      const urgentResponse = `
        This requires immediate medical attention. Seek emergency care right away.
        This is not a substitute for professional medical advice.
        Please consult a qualified healthcare provider for any health concerns.
      `

      const result = validator.validateResponse(urgentResponse)
      
      expect(result.urgencyAssessment.level).toBe('immediate')
      expect(result.urgencyAssessment.factors.length).toBeGreaterThan(0)
    })
  })

  describe('checkForProhibitedContent', () => {
    it('should detect definitive diagnostic language', () => {
      // Test individual prohibited terms that should be detected
      const result1 = validator.checkForProhibitedContent('I diagnose you with eczema')
      expect(result1.valid).toBe(false)
      expect(result1.violations.length).toBeGreaterThan(0)

      const result2 = validator.checkForProhibitedContent('You definitely have psoriasis')
      expect(result2.valid).toBe(false)
      expect(result2.violations.length).toBeGreaterThan(0)

      const result3 = validator.checkForProhibitedContent('Take this prescription medication')
      expect(result3.valid).toBe(false)
      expect(result3.violations.length).toBeGreaterThan(0)
    })

    it('should allow appropriate medical language', () => {
      const appropriateTexts = [
        'This may be consistent with eczema',
        'The analysis suggests possible psoriasis',
        'Consider consulting a healthcare provider',
        'This appears to be a benign condition'
      ]

      appropriateTexts.forEach(text => {
        const result = validator.checkForProhibitedContent(text)
        expect(result.valid).toBe(true)
        expect(result.violations).toHaveLength(0)
      })
    })
  })

  describe('ensureDisclaimersPresent', () => {
    it('should validate adequate medical disclaimers', () => {
      const adequateDisclaimer = `
        This is not a substitute for professional medical advice.
        Please consult a qualified healthcare provider for any health concerns.
        This information is for informational purposes only.
        In case of emergency, contact emergency services immediately.
      `

      const result = validator.ensureDisclaimersPresent(adequateDisclaimer)
      expect(result).toBe(true)
    })

    it('should reject inadequate disclaimers', () => {
      const inadequateDisclaimer = 'This is just information.'

      const result = validator.ensureDisclaimersPresent(inadequateDisclaimer)
      expect(result).toBe(false)
    })
  })

  describe('assessUrgencyLevel', () => {
    it('should assess immediate urgency for emergency conditions', () => {
      const emergencyResponse = `
        This requires immediate medical attention. 
        Contact emergency services right away.
        Bleeding and rapid growth detected.
      `

      const assessment = validator.assessUrgencyLevel(emergencyResponse)
      
      expect(assessment.level).toBe('immediate')
      expect(assessment.emergencyIndicators.length).toBeGreaterThan(0)
      expect(assessment.timeframe).toContain('immediately')
    })

    it('should assess routine urgency for low-risk conditions', () => {
      const routineResponse = `
        This appears to be a common skin condition.
        Consider care when convenient.
        This is not a substitute for professional medical advice.
        Please consult a healthcare provider for proper evaluation.
      `

      const assessment = validator.assessUrgencyLevel(routineResponse)
      
      expect(assessment.level).toBe('routine')
      expect(assessment.emergencyIndicators).toHaveLength(0)
    })
  })
})

describe('MedicalComplianceValidator', () => {
  let complianceValidator: MedicalComplianceValidator
  let mockConsultationResponse: ConsultationResponse
  let mockAnalysisResult: AnalysisResult

  beforeEach(() => {
    complianceValidator = getMedicalComplianceValidator()
    
    mockConsultationResponse = {
      consultation: {
        conditionAssessment: 'The analysis suggests this may be consistent with eczema.',
        symptomCorrelation: 'Your symptoms align with typical eczema presentations.',
        recommendations: [
          'Consider consulting a healthcare provider',
          'Apply fragrance-free moisturizer regularly'
        ],
        urgencyLevel: 'routine',
        educationalInfo: 'Eczema is a common skin condition.',
        medicalDisclaimer: 'This is not a substitute for professional medical advice. Please consult a healthcare provider.'
      },
      metadata: {
        modelUsed: 'test',
        processingTime: 100,
        confidenceScore: 0.8,
        fallbackUsed: false,
        safetyValidated: true
      }
    }

    mockAnalysisResult = {
      predictions: [{
        condition: 'Eczema',
        confidence: 0.8,
        severity: 'mild',
        category: 'Dermatological',
        requiresAttention: false,
        description: 'Common inflammatory skin condition'
      }],
      topPrediction: 'Eczema',
      overallConfidence: 0.8,
      riskLevel: 'low',
      processingInfo: {
        modelUsed: 'biomedclip',
        imageProcessed: true,
        symptomsIncluded: true
      }
    }
  })

  describe('validateAgainstDefinitiveDiagnosis', () => {
    it('should detect definitive diagnosis language', () => {
      const definitiveResponse = 'You have eczema. This is definitely psoriasis.'

      const result = complianceValidator.validateAgainstDefinitiveDiagnosis(definitiveResponse)
      
      expect(result.valid).toBe(false)
      expect(result.violations.length).toBeGreaterThan(0)
      expect(result.suggestions.length).toBeGreaterThan(0)
    })

    it('should allow appropriate uncertainty language', () => {
      const appropriateResponse = 'This may be consistent with eczema. The analysis suggests possible psoriasis.'

      const result = complianceValidator.validateAgainstDefinitiveDiagnosis(appropriateResponse)
      
      expect(result.valid).toBe(true)
      expect(result.violations).toHaveLength(0)
    })
  })

  describe('ensureProfessionalConsultationEmphasis', () => {
    it('should validate adequate professional consultation emphasis', () => {
      const goodResponse = {
        ...mockConsultationResponse,
        consultation: {
          ...mockConsultationResponse.consultation,
          conditionAssessment: 'Please consult a healthcare provider for proper evaluation.',
          recommendations: [
            'See a doctor for professional medical advice',
            'Schedule appointment with healthcare provider'
          ]
        }
      }

      const result = complianceValidator.ensureProfessionalConsultationEmphasis(goodResponse)
      
      expect(result.valid).toBe(true)
      expect(result.issues).toHaveLength(0)
    })

    it('should detect insufficient professional consultation emphasis', () => {
      const poorResponse = {
        ...mockConsultationResponse,
        consultation: {
          ...mockConsultationResponse.consultation,
          conditionAssessment: 'This looks like eczema.',
          recommendations: ['Apply moisturizer', 'Avoid irritants']
        }
      }

      const result = complianceValidator.ensureProfessionalConsultationEmphasis(poorResponse)
      
      expect(result.valid).toBe(false)
      expect(result.issues.length).toBeGreaterThan(0)
    })
  })

  describe('addEmergencyContactsForUrgentCases', () => {
    it('should add emergency contacts for high-risk conditions', () => {
      const highRiskAnalysis = {
        ...mockAnalysisResult,
        riskLevel: 'high' as const,
        topPrediction: 'Melanoma'
      }

      const urgentResponse = {
        ...mockConsultationResponse,
        consultation: {
          ...mockConsultationResponse.consultation,
          urgencyLevel: 'immediate' as const
        }
      }

      const result = complianceValidator.addEmergencyContactsForUrgentCases(
        urgentResponse,
        highRiskAnalysis
      )
      
      expect(result.contactsAdded.length).toBeGreaterThan(0)
      expect(result.justification.length).toBeGreaterThan(0)
      expect(result.updatedResponse.emergencyContacts).toBeDefined()
    })

    it('should not add emergency contacts for low-risk routine cases', () => {
      const result = complianceValidator.addEmergencyContactsForUrgentCases(
        mockConsultationResponse,
        mockAnalysisResult
      )
      
      expect(result.contactsAdded).toHaveLength(0)
      expect(result.updatedResponse.emergencyContacts).toBeUndefined()
    })
  })

  describe('performComprehensiveComplianceCheck', () => {
    it('should perform comprehensive compliance validation', () => {
      const result = complianceValidator.performComprehensiveComplianceCheck(
        mockConsultationResponse,
        mockAnalysisResult
      )
      
      expect(result).toHaveProperty('overallCompliant')
      expect(result).toHaveProperty('complianceScore')
      expect(result).toHaveProperty('diagnosisCheck')
      expect(result).toHaveProperty('consultationCheck')
      expect(result).toHaveProperty('emergencyContactCheck')
      expect(result).toHaveProperty('safetyCheck')
      expect(result.complianceScore).toBeGreaterThanOrEqual(0)
      expect(result.complianceScore).toBeLessThanOrEqual(100)
    })

    it('should detect compliance issues in problematic responses', () => {
      const problematicResponse = {
        ...mockConsultationResponse,
        consultation: {
          ...mockConsultationResponse.consultation,
          conditionAssessment: 'You definitely have eczema.',
          medicalDisclaimer: 'This is just information.'
        }
      }

      const result = complianceValidator.performComprehensiveComplianceCheck(
        problematicResponse,
        mockAnalysisResult
      )
      
      expect(result.overallCompliant).toBe(false)
      expect(result.complianceScore).toBeLessThan(80)
      expect(result.recommendations.length).toBeGreaterThan(0)
    })
  })
})

describe('Convenience Functions', () => {
  it('should validate response safety using convenience function', () => {
    const response = 'This may be eczema. Please consult a healthcare provider.'
    
    const result = validateResponseSafety(response)
    
    expect(result).toHaveProperty('valid')
    expect(result).toHaveProperty('issues')
    expect(result).toHaveProperty('riskLevel')
  })

  it('should perform medical compliance check using convenience function', () => {
    const mockResponse: ConsultationResponse = {
      consultation: {
        conditionAssessment: 'Test assessment',
        symptomCorrelation: 'Test correlation',
        recommendations: ['Test recommendation'],
        urgencyLevel: 'routine',
        educationalInfo: 'Test info',
        medicalDisclaimer: 'This is not a substitute for professional medical advice.'
      },
      metadata: {
        modelUsed: 'test',
        processingTime: 100,
        confidenceScore: 0.8,
        fallbackUsed: false,
        safetyValidated: true
      }
    }

    const result = performMedicalComplianceCheck(mockResponse)
    
    expect(result).toHaveProperty('hasValidDisclaimer')
    expect(result).toHaveProperty('complianceScore')
  })
})