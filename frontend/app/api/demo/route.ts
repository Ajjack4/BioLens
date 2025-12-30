import { NextRequest, NextResponse } from 'next/server'
import { AnalysisResult } from '@/lib/api-client'

// Demo sample data with realistic analysis results
const DEMO_ANALYSIS_RESULTS: Record<string, AnalysisResult> = {
  'eczema-sample': {
    predictions: [
      {
        condition: 'Eczema/Atopic Dermatitis',
        confidence: 0.78,
        severity: 'moderate',
        category: 'Inflammatory',
        requiresAttention: true,
        description: 'Chronic inflammatory skin condition characterized by itchy, red, and inflamed patches'
      },
      {
        condition: 'Contact Dermatitis',
        confidence: 0.15,
        severity: 'mild',
        category: 'Inflammatory',
        requiresAttention: true,
        description: 'Skin inflammation caused by contact with irritants or allergens'
      },
      {
        condition: 'Seborrheic Dermatitis',
        confidence: 0.07,
        severity: 'mild',
        category: 'Inflammatory',
        requiresAttention: false,
        description: 'Common skin condition causing scaly, itchy rash'
      }
    ],
    topPrediction: 'Eczema/Atopic Dermatitis',
    overallConfidence: 0.78,
    riskLevel: 'moderate',
    processingInfo: {
      modelUsed: 'BiomedCLIP-Demo',
      imageProcessed: true,
      symptomsIncluded: true,
      processingTime: 3.2
    }
  },
  'psoriasis-sample': {
    predictions: [
      {
        condition: 'Plaque Psoriasis',
        confidence: 0.82,
        severity: 'moderate',
        category: 'Autoimmune',
        requiresAttention: true,
        description: 'Chronic autoimmune condition causing thick, scaly patches on the skin'
      },
      {
        condition: 'Eczema',
        confidence: 0.12,
        severity: 'mild',
        category: 'Inflammatory',
        requiresAttention: true,
        description: 'Inflammatory skin condition with itchy, red patches'
      },
      {
        condition: 'Seborrheic Keratosis',
        confidence: 0.06,
        severity: 'mild',
        category: 'Benign Growth',
        requiresAttention: false,
        description: 'Common benign skin growth'
      }
    ],
    topPrediction: 'Plaque Psoriasis',
    overallConfidence: 0.82,
    riskLevel: 'moderate',
    processingInfo: {
      modelUsed: 'BiomedCLIP-Demo',
      imageProcessed: true,
      symptomsIncluded: true,
      processingTime: 4.1
    }
  },
  'fungal-sample': {
    predictions: [
      {
        condition: 'Tinea Corporis (Ringworm)',
        confidence: 0.85,
        severity: 'mild',
        category: 'Infectious',
        requiresAttention: true,
        description: 'Fungal infection causing circular, scaly patches with clear centers'
      },
      {
        condition: 'Eczema',
        confidence: 0.10,
        severity: 'mild',
        category: 'Inflammatory',
        requiresAttention: true,
        description: 'Inflammatory skin condition'
      },
      {
        condition: 'Contact Dermatitis',
        confidence: 0.05,
        severity: 'mild',
        category: 'Inflammatory',
        requiresAttention: false,
        description: 'Skin reaction to irritants'
      }
    ],
    topPrediction: 'Tinea Corporis (Ringworm)',
    overallConfidence: 0.85,
    riskLevel: 'low',
    processingInfo: {
      modelUsed: 'BiomedCLIP-Demo',
      imageProcessed: true,
      symptomsIncluded: true,
      processingTime: 2.8
    }
  },
  'melanoma-sample': {
    predictions: [
      {
        condition: 'Suspicious Melanocytic Lesion',
        confidence: 0.72,
        severity: 'severe',
        category: 'Oncological',
        requiresAttention: true,
        description: 'Potentially malignant pigmented lesion requiring immediate dermatological evaluation'
      },
      {
        condition: 'Atypical Nevus',
        confidence: 0.20,
        severity: 'moderate',
        category: 'Oncological',
        requiresAttention: true,
        description: 'Unusual mole that may have increased risk of malignancy'
      },
      {
        condition: 'Seborrheic Keratosis',
        confidence: 0.08,
        severity: 'mild',
        category: 'Benign Growth',
        requiresAttention: false,
        description: 'Benign skin growth'
      }
    ],
    topPrediction: 'Suspicious Melanocytic Lesion',
    overallConfidence: 0.72,
    riskLevel: 'high',
    processingInfo: {
      modelUsed: 'BiomedCLIP-Demo',
      imageProcessed: true,
      symptomsIncluded: true,
      processingTime: 5.4
    }
  },
  'acne-sample': {
    predictions: [
      {
        condition: 'Acne Vulgaris',
        confidence: 0.88,
        severity: 'moderate',
        category: 'Dermatological',
        requiresAttention: true,
        description: 'Common skin condition causing pimples, blackheads, and whiteheads'
      },
      {
        condition: 'Folliculitis',
        confidence: 0.08,
        severity: 'mild',
        category: 'Infectious',
        requiresAttention: false,
        description: 'Inflammation of hair follicles'
      },
      {
        condition: 'Rosacea',
        confidence: 0.04,
        severity: 'mild',
        category: 'Inflammatory',
        requiresAttention: false,
        description: 'Chronic inflammatory skin condition'
      }
    ],
    topPrediction: 'Acne Vulgaris',
    overallConfidence: 0.88,
    riskLevel: 'low',
    processingInfo: {
      modelUsed: 'BiomedCLIP-Demo',
      imageProcessed: true,
      symptomsIncluded: true,
      processingTime: 2.1
    }
  },
  'healthy-sample': {
    predictions: [
      {
        condition: 'Healthy Skin',
        confidence: 0.92,
        severity: 'none',
        category: 'Normal',
        requiresAttention: false,
        description: 'Normal, healthy skin with no signs of pathology'
      },
      {
        condition: 'Mild Dryness',
        confidence: 0.05,
        severity: 'mild',
        category: 'Dermatological',
        requiresAttention: false,
        description: 'Slight skin dryness, normal variation'
      },
      {
        condition: 'Age-related Changes',
        confidence: 0.03,
        severity: 'mild',
        category: 'Normal',
        requiresAttention: false,
        description: 'Normal aging-related skin changes'
      }
    ],
    topPrediction: 'Healthy Skin',
    overallConfidence: 0.92,
    riskLevel: 'low',
    processingInfo: {
      modelUsed: 'BiomedCLIP-Demo',
      imageProcessed: true,
      symptomsIncluded: true,
      processingTime: 1.5
    }
  }
}

/**
 * POST /api/demo
 * Simulates analysis for demo samples with realistic results
 */
export async function POST(request: NextRequest) {
  try {
    const { sampleId, symptoms, sessionId } = await request.json()

    if (!sampleId || !DEMO_ANALYSIS_RESULTS[sampleId]) {
      return NextResponse.json({
        success: false,
        error: 'Invalid sample ID'
      }, { status: 400 })
    }

    // Simulate processing time
    const processingTime = DEMO_ANALYSIS_RESULTS[sampleId].processingInfo.processingTime * 1000
    await new Promise(resolve => setTimeout(resolve, processingTime))

    const analysisResult = DEMO_ANALYSIS_RESULTS[sampleId]

    console.log(`🎭 Demo analysis for sample: ${sampleId}`)
    console.log(`📊 Top prediction: ${analysisResult.topPrediction} (${(analysisResult.overallConfidence * 100).toFixed(1)}%)`)
    console.log(`⏱️ Simulated processing time: ${processingTime}ms`)

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
      metadata: {
        isDemoMode: true,
        sampleId,
        processingTime,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Demo analysis error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Demo analysis failed'
    }, { status: 500 })
  }
}

/**
 * GET /api/demo
 * Returns available demo samples
 */
export async function GET() {
  const samples = Object.keys(DEMO_ANALYSIS_RESULTS).map(id => ({
    id,
    available: true,
    expectedCondition: DEMO_ANALYSIS_RESULTS[id].topPrediction,
    riskLevel: DEMO_ANALYSIS_RESULTS[id].riskLevel,
    confidence: DEMO_ANALYSIS_RESULTS[id].overallConfidence
  }))

  return NextResponse.json({
    success: true,
    samples,
    totalSamples: samples.length
  })
}