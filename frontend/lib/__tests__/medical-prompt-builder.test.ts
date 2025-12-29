/**
 * Tests for MedicalPromptBuilder
 * Validates prompt generation, safety instructions, and high-risk handling
 */

import { MedicalPromptBuilder } from '../medical-prompt-builder'
import { DetectedCondition } from '../api-client'

describe('MedicalPromptBuilder', () => {
  let promptBuilder: MedicalPromptBuilder

  beforeEach(() => {
    promptBuilder = new MedicalPromptBuilder()
  })

  describe('Basic Prompt Generation', () => {
    it('should create a basic consultation prompt', () => {
      const predictions: DetectedCondition[] = [
        {
          condition: 'Eczema',
          confidence: 0.85,
          severity: 'moderate',
          category: 'Dermatological',
          requiresAttention: true,
          description: 'Inflammatory skin condition'
        }
      ]

      const riskLevel = {
        level: 'moderate' as const,
        factors: ['Requires medical attention'],
        requiresUrgentCare: false
      }

      const prompt = promptBuilder.buildConsultationPrompt(predictions, 'itchy red patches', riskLevel)

      expect(prompt.systemInstruction).toContain('medical AI assistant')
      expect(prompt.systemInstruction).toContain('NOT provide definitive diagnoses')
      expect(prompt.userPrompt).toContain('BiomedCLIP ANALYSIS RESULTS')
      expect(prompt.userPrompt).toContain('Eczema')
      expect(prompt.userPrompt).toContain('85.0%')
      expect(prompt.safetyInstructions.length).toBeGreaterThan(0)
    })

    it('should format predictions correctly', () => {
      const predictions: DetectedCondition[] = [
        {
          condition: 'Psoriasis',
          confidence: 0.75,
          severity: 'mild',
          category: 'Autoimmune',
          requiresAttention: false,
          description: 'Chronic autoimmune condition'
        },
        {
          condition: 'Eczema',
          confidence: 0.65,
          severity: 'moderate',
          category: 'Dermatological',
          requiresAttention: true,
          description: 'Inflammatory skin condition'
        }
      ]

      const formatted = promptBuilder.formatPredictionsForPrompt(predictions)

      expect(formatted).toContain('Primary Detection: Psoriasis')
      expect(formatted).toContain('Confidence: 75.0%')
      expect(formatted).toContain('Alternative Possibilities')
      expect(formatted).toContain('2. Eczema - 65.0% confidence')
    })
  })

  describe('Safety Instructions', () => {
    it('should include all required safety instructions', () => {
      const predictions: DetectedCondition[] = [
        {
          condition: 'Acne',
          confidence: 0.9,
          severity: 'mild',
          category: 'Dermatological',
          requiresAttention: false,
          description: 'Common skin condition'
        }
      ]

      const riskLevel = {
        level: 'low' as const,
        factors: [],
        requiresUrgentCare: false
      }

      const prompt = promptBuilder.buildConsultationPrompt(predictions, '', riskLevel)

      expect(prompt.systemInstruction).toContain('supplementary information only')
      expect(prompt.systemInstruction).toContain('consult healthcare professionals')
      expect(prompt.systemInstruction).toContain('definitive diagnostic language')
      expect(prompt.systemInstruction).toContain('medical disclaimers')
    })

    it('should add safety instructions to any prompt', () => {
      const basicPrompt = 'Analyze this condition'
      const enhancedPrompt = promptBuilder.addSafetyInstructions(basicPrompt)

      expect(enhancedPrompt).toContain('MANDATORY SAFETY REQUIREMENTS')
      expect(enhancedPrompt).toContain('Never provide definitive diagnoses')
      expect(enhancedPrompt).toContain('Always include medical disclaimers')
    })
  })

  describe('High-Risk Condition Handling', () => {
    it('should emphasize urgency for high-risk conditions', () => {
      const highRiskPredictions: DetectedCondition[] = [
        {
          condition: 'Melanoma',
          confidence: 0.8,
          severity: 'severe',
          category: 'Oncological',
          requiresAttention: true,
          description: 'Potentially malignant skin lesion'
        }
      ]

      const highRiskLevel = {
        level: 'high' as const,
        factors: ['Potential malignant condition'],
        requiresUrgentCare: true
      }

      const prompt = promptBuilder.buildConsultationPrompt(highRiskPredictions, 'changing mole', highRiskLevel)

      expect(prompt.systemInstruction).toContain('HIGH-RISK CONDITION PROTOCOLS')
      expect(prompt.systemInstruction).toContain('IMMEDIATE')
      expect(prompt.systemInstruction).toContain('urgent language')
    })

    it('should add urgent attention emphasis', () => {
      const basePrompt = {
        systemInstruction: 'Basic instruction',
        userPrompt: 'Basic prompt',
        safetyInstructions: [],
        contextData: {
          predictions: [],
          symptoms: '',
          riskLevel: { level: 'high' as const, factors: [], requiresUrgentCare: true }
        }
      }

      const urgentPrompt = promptBuilder.addUrgentAttentionEmphasis(basePrompt, 'Melanoma', 'immediate')

      expect(urgentPrompt.userPrompt).toContain('CRITICAL MEDICAL ALERT')
      expect(urgentPrompt.userPrompt).toContain('LIFE-THREATENING')
      expect(urgentPrompt.userPrompt).toContain('IMMEDIATE medical attention')
      expect(urgentPrompt.systemInstruction).toContain('medical emergency')
    })
  })

  describe('Condition-Specific Prompts', () => {
    it('should create oncological condition prompts', () => {
      const predictions: DetectedCondition[] = [
        {
          condition: 'Basal Cell Carcinoma',
          confidence: 0.75,
          severity: 'moderate',
          category: 'Oncological',
          requiresAttention: true,
          description: 'Type of skin cancer'
        }
      ]

      const riskLevel = {
        level: 'high' as const,
        factors: ['Potential malignancy'],
        requiresUrgentCare: true
      }

      const prompt = promptBuilder.createConditionSpecificPrompt(
        'oncological',
        predictions,
        'suspicious lesion',
        riskLevel
      )

      expect(prompt.systemInstruction).toContain('ONCOLOGICAL CONDITION PROTOCOL')
      expect(prompt.systemInstruction).toContain('skin cancer')
      expect(prompt.userPrompt).toContain('URGENT ONCOLOGICAL CONSULTATION')
    })

    it('should create inflammatory condition prompts', () => {
      const predictions: DetectedCondition[] = [
        {
          condition: 'Atopic Dermatitis',
          confidence: 0.85,
          severity: 'moderate',
          category: 'Inflammatory',
          requiresAttention: true,
          description: 'Chronic inflammatory condition'
        }
      ]

      const riskLevel = {
        level: 'moderate' as const,
        factors: ['Chronic condition'],
        requiresUrgentCare: false
      }

      const prompt = promptBuilder.createConditionSpecificPrompt(
        'inflammatory',
        predictions,
        'itchy patches',
        riskLevel
      )

      expect(prompt.systemInstruction).toContain('INFLAMMATORY CONDITION GUIDANCE')
      expect(prompt.systemInstruction).toContain('trigger identification')
      expect(prompt.userPrompt).toContain('INFLAMMATORY CONDITION FOCUS')
    })
  })

  describe('Prompt Validation', () => {
    it('should validate prompt safety and completeness', () => {
      const validPrompt = {
        systemInstruction: 'You are a medical AI assistant providing supplementary information. You must NOT provide definitive diagnoses.',
        userPrompt: 'BiomedCLIP analysis shows... RISK ASSESSMENT: moderate',
        safetyInstructions: [
          'Always include medical disclaimers',
          'Encourage professional consultation',
          'This is supplementary information only'
        ],
        contextData: {
          predictions: [],
          symptoms: '',
          riskLevel: { level: 'low' as const, factors: [], requiresUrgentCare: false }
        }
      }

      const validation = promptBuilder.validatePrompt(validPrompt)
      expect(validation.valid).toBe(true)
      expect(validation.issues).toHaveLength(0)
    })

    it('should identify validation issues', () => {
      const invalidPrompt = {
        systemInstruction: 'Basic instruction',
        userPrompt: 'Basic prompt',
        safetyInstructions: [],
        contextData: {
          predictions: [],
          symptoms: '',
          riskLevel: { level: 'low' as const, factors: [], requiresUrgentCare: false }
        }
      }

      const validation = promptBuilder.validatePrompt(invalidPrompt)
      expect(validation.valid).toBe(false)
      expect(validation.issues.length).toBeGreaterThan(0)
      expect(validation.issues.some(issue => issue.includes('supplementary'))).toBe(true)
    })

    it('should require urgent language for high-risk conditions', () => {
      const highRiskPrompt = {
        systemInstruction: 'Basic instruction without urgency',
        userPrompt: 'Basic prompt',
        safetyInstructions: ['basic safety'],
        contextData: {
          predictions: [],
          symptoms: '',
          riskLevel: { level: 'high' as const, factors: [], requiresUrgentCare: true }
        }
      }

      const validation = promptBuilder.validatePrompt(highRiskPrompt)
      expect(validation.valid).toBe(false)
      expect(validation.issues.some(issue => issue.includes('urgency'))).toBe(true)
    })
  })

  describe('Scenario Templates', () => {
    it('should provide emergency scenario template', () => {
      const template = promptBuilder.getScenarioTemplate('emergency')
      
      expect(template.role).toContain('URGENT medical guidance')
      expect(template.role).toContain('potentially serious condition')
      expect(template.safetyInstructions).toContain('CRITICAL: Emphasize IMMEDIATE medical attention')
    })

    it('should provide routine scenario template', () => {
      const template = promptBuilder.getScenarioTemplate('routine')
      
      expect(template.role).toContain('routine medical guidance')
      expect(template.role).toContain('non-urgent condition')
      expect(template.safetyInstructions).toEqual(expect.arrayContaining([
        expect.stringContaining('routine professional evaluation')
      ]))
    })
  })
})