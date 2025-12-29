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

export interface ConsultationRequest {
  analysisResult: AnalysisResult
  symptoms: string
  sessionId: string
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
 */
export async function generateConsultation(
  analysisResult: AnalysisResult,
  symptoms: string = '',
  sessionId?: string
): Promise<ConsultationResponse> {
  try {
    const response = await fetch('/api/consultation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        analysisResult,
        symptoms,
        sessionId: sessionId || generateSessionId()
      }),
    })

    const result: ConsultationResponse = await response.json()

    if (!response.ok && !result.consultation) {
      throw new Error(result.error || 'Consultation generation failed')
    }

    return result
  } catch (error) {
    console.error('Consultation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Consultation generation failed'
    }
  }
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
 * Validate image file before upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
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