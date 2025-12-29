/**
 * Test script for the consultation API endpoint
 * Tests both successful consultation and fallback scenarios
 */

const mockAnalysisResult = {
  predictions: [
    {
      condition: 'Eczema (Atopic Dermatitis)',
      confidence: 0.75,
      severity: 'moderate',
      category: 'Dermatological',
      requiresAttention: true,
      description: 'Inflammatory skin condition causing itchy, red, swollen skin patches.'
    },
    {
      condition: 'Dermatitis',
      confidence: 0.15,
      severity: 'mild',
      category: 'Dermatological',
      requiresAttention: true,
      description: 'General term for skin inflammation.'
    }
  ],
  topPrediction: 'Eczema (Atopic Dermatitis)',
  overallConfidence: 0.75,
  riskLevel: 'moderate',
  recommendations: [
    'Apply fragrance-free moisturizer regularly',
    'Avoid known triggers and use gentle products',
    'Consider consulting a healthcare provider'
  ],
  processingInfo: {
    imageProcessed: true,
    symptomsIncluded: true,
    modelUsed: 'BiomedCLIP',
    processingTime: 1500
  }
}

const testConsultationRequest = {
  analysisResult: mockAnalysisResult,
  symptoms: 'I have itchy, red patches on my arms that have been bothering me for about a week. The skin feels dry and sometimes burns.',
  sessionId: `test-session-${Date.now()}`
}

async function testConsultationAPI() {
  console.log('🧪 Testing Consultation API...')
  console.log('📊 Mock Analysis Result:', mockAnalysisResult.topPrediction)
  console.log('📝 Test Symptoms:', testConsultationRequest.symptoms)
  
  try {
    // Test the consultation endpoint
    const response = await fetch('http://localhost:3000/api/consultation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testConsultationRequest)
    })

    const result = await response.json()
    
    console.log('\n📋 API Response Status:', response.status)
    console.log('✅ Success:', result.success)
    
    if (result.success) {
      console.log('\n🤖 Consultation Generated:')
      console.log('📈 Model Used:', result.metadata.modelUsed)
      console.log('🔄 Fallback Used:', result.metadata.fallbackUsed)
      console.log('🛡️ Safety Validated:', result.metadata.safetyValidated)
      console.log('⏱️ Processing Time:', result.metadata.processingTime, 'ms')
      
      console.log('\n📝 Consultation Content:')
      console.log('🔍 Assessment:', result.consultation.conditionAssessment.substring(0, 200) + '...')
      console.log('🔗 Symptom Correlation:', result.consultation.symptomCorrelation.substring(0, 150) + '...')
      console.log('📋 Recommendations Count:', result.consultation.recommendations.length)
      console.log('⚠️ Urgency Level:', result.consultation.urgencyLevel)
      console.log('📚 Educational Info Available:', !!result.consultation.educationalInfo)
      console.log('⚖️ Medical Disclaimer Present:', !!result.consultation.medicalDisclaimer)
      
      if (result.emergencyContacts) {
        console.log('🚨 Emergency Contacts:', result.emergencyContacts.length)
      }
      
    } else {
      console.log('❌ Error:', result.error)
      
      if (result.fallbackConsultation) {
        console.log('🔄 Fallback consultation provided')
        console.log('📈 Fallback Model:', result.fallbackConsultation.metadata.modelUsed)
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    
    // Test if it's a connection error (server not running)
    if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch')) {
      console.log('\n💡 Note: Make sure the Next.js development server is running:')
      console.log('   cd frontend && npm run dev')
    }
  }
}

async function testHealthEndpoint() {
  console.log('\n🏥 Testing Health Endpoint...')
  
  try {
    const response = await fetch('http://localhost:3000/api/consultation', {
      method: 'GET'
    })

    const result = await response.json()
    
    console.log('📋 Health Status:', result.status)
    console.log('✅ Service Healthy:', result.health?.healthy)
    console.log('🔄 Circuit Breaker State:', result.health?.circuitBreakerState)
    console.log('📊 Recent Errors:', result.statistics?.recentErrors)
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message)
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Consultation API Tests\n')
  
  await testHealthEndpoint()
  await testConsultationRequest()
  
  console.log('\n✅ Tests completed!')
}

// Check if running directly
if (require.main === module) {
  runTests().catch(console.error)
}

module.exports = {
  testConsultationAPI,
  testHealthEndpoint,
  mockAnalysisResult,
  testConsultationRequest
}