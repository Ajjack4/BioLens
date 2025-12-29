import { NextRequest, NextResponse } from 'next/server'
import { getConsultationEngine } from '@/lib/consultation-engine'
import { AnalysisResult } from '@/lib/api-client'

// Types for consultation request
interface ConsultationRequest {
  analysisResult: AnalysisResult
  symptoms: string
  sessionId: string
}

interface ConsultationErrorResponse {
  success: false
  error: string
  fallbackConsultation?: any
}

interface ConsultationSuccessResponse {
  success: true
  consultation: any
  metadata: any
  emergencyContacts?: any[]
  sessionId: string
}

/**
 * POST /api/consultation
 * Generates intelligent medical consultation based on BiomedCLIP analysis results and user symptoms
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Parse and validate request body
    const body: ConsultationRequest = await request.json()
    const { analysisResult, symptoms = '', sessionId } = body

    // Validate required fields
    if (!analysisResult) {
      return NextResponse.json({
        success: false,
        error: 'Analysis result is required'
      } as ConsultationErrorResponse, { status: 400 })
    }

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID is required'
      } as ConsultationErrorResponse, { status: 400 })
    }

    // Validate analysis result structure
    if (!analysisResult.predictions || !Array.isArray(analysisResult.predictions) || analysisResult.predictions.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Analysis result must contain valid predictions'
      } as ConsultationErrorResponse, { status: 400 })
    }

    if (typeof analysisResult.overallConfidence !== 'number' || 
        analysisResult.overallConfidence < 0 || 
        analysisResult.overallConfidence > 1) {
      return NextResponse.json({
        success: false,
        error: 'Analysis result must contain valid confidence score (0-1)'
      } as ConsultationErrorResponse, { status: 400 })
    }

    // Validate symptoms if provided
    if (symptoms && typeof symptoms !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Symptoms must be a string'
      } as ConsultationErrorResponse, { status: 400 })
    }

    // Limit symptoms length for safety
    const sanitizedSymptoms = symptoms ? symptoms.substring(0, 2000) : ''

    console.log('🤖 Starting consultation generation...')
    console.log('📊 Analysis result:', analysisResult.topPrediction, `(${(analysisResult.overallConfidence * 100).toFixed(1)}%)`)
    console.log('📝 Symptoms provided:', sanitizedSymptoms ? 'Yes' : 'No')
    console.log('🔑 Session ID:', sessionId)

    // Get consultation engine instance
    const consultationEngine = getConsultationEngine()

    // Check if consultation engine is healthy
    const healthStatus = consultationEngine.getHealthStatus()
    if (!healthStatus.healthy) {
      console.warn('⚠️ Consultation engine not healthy:', healthStatus.recommendedAction)
    }

    // Generate consultation
    const consultationResponse = await consultationEngine.generateConsultation(
      analysisResult,
      sanitizedSymptoms,
      sessionId
    )

    const processingTime = Date.now() - startTime

    console.log('✅ Consultation generated successfully')
    console.log('⏱️ Processing time:', processingTime, 'ms')
    console.log('🔄 Fallback used:', consultationResponse.metadata.fallbackUsed)
    console.log('🛡️ Safety validated:', consultationResponse.metadata.safetyValidated)

    // Return successful response
    return NextResponse.json({
      success: true,
      consultation: consultationResponse.consultation,
      metadata: {
        ...consultationResponse.metadata,
        processingTime
      },
      emergencyContacts: consultationResponse.emergencyContacts,
      sessionId
    } as ConsultationSuccessResponse)

  } catch (error) {
    console.error('❌ Consultation generation error:', error)
    
    const processingTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

    // Try to provide fallback consultation if we have analysis data
    let fallbackConsultation = null
    try {
      const body = await request.clone().json()
      if (body.analysisResult) {
        const consultationEngine = getConsultationEngine()
        
        // Use offline consultation for seamless fallback experience
        if (consultationEngine.isOfflineConsultationAvailable()) {
          fallbackConsultation = consultationEngine.generateOfflineConsultation(
            body.analysisResult,
            body.symptoms || '',
            body.sessionId || `fallback-${Date.now()}`
          )
          console.log('🔄 Offline consultation generated for seamless fallback')
        } else {
          // Use enhanced fallback if offline consultation unavailable
          fallbackConsultation = consultationEngine.handleFallback(
            error instanceof Error ? error : new Error(errorMessage),
            {
              analysisResult: body.analysisResult,
              symptoms: body.symptoms || '',
              sessionId: body.sessionId || `fallback-${Date.now()}`,
              timestamp: new Date()
            }
          )
          console.log('🔄 Enhanced fallback consultation generated')
        }
      }
    } catch (fallbackError) {
      console.error('❌ Fallback consultation also failed:', fallbackError)
    }

    // Return error response with optional fallback
    const errorResponse: ConsultationErrorResponse = {
      success: false,
      error: 'Consultation generation failed',
      ...(fallbackConsultation && { fallbackConsultation })
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

/**
 * GET /api/consultation
 * Returns consultation service health status
 */
export async function GET() {
  try {
    const consultationEngine = getConsultationEngine()
    const healthStatus = consultationEngine.getHealthStatus()
    const errorStats = consultationEngine.getErrorStatistics()

    return NextResponse.json({
      success: true,
      status: 'Consultation service operational',
      health: healthStatus,
      statistics: {
        totalErrors: errorStats.totalErrors,
        recentErrors: errorStats.recentErrors,
        circuitBreakerState: errorStats.circuitBreakerState,
        lastError: errorStats.lastError
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Health check failed:', error)
    
    return NextResponse.json({
      success: false,
      status: 'Consultation service unavailable',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 503 })
  }
}