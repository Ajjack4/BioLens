/**
 * Test script to verify that Gemini consultation responses are working properly
 * This tests the fix for the issue where some outputs don't give Gemini responses
 */

async function testConsultationAPI() {
  console.log('🧪 Testing Consultation API Fix...\n');

  // Sample analysis result for testing
  const testAnalysisResult = {
    predictions: [
      {
        condition: "Dermatitis",
        confidence: 0.192,
        severity: "moderate",
        category: "Dermatological",
        requiresAttention: true,
        description: "Inflammatory skin condition"
      }
    ],
    topPrediction: "Dermatitis",
    overallConfidence: 0.192,
    riskLevel: "moderate",
    processingInfo: {
      modelUsed: "BiomedCLIP",
      imageProcessed: true,
      symptomsIncluded: true
    }
  };

  const testSymptoms = "Itchy, red, inflamed skin that has been bothering me for a few days";
  const sessionId = `test-session-${Date.now()}`;

  try {
    console.log('1. Testing consultation generation...');
    console.log(`   - Analysis: ${testAnalysisResult.topPrediction} (${(testAnalysisResult.overallConfidence * 100).toFixed(1)}%)`);
    console.log(`   - Symptoms: ${testSymptoms}`);
    console.log(`   - Session ID: ${sessionId}\n`);

    const response = await fetch('http://localhost:3000/api/consultation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        analysisResult: testAnalysisResult,
        symptoms: testSymptoms,
        sessionId: sessionId
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Consultation generated successfully!');
      console.log(`   - Model used: ${result.metadata.modelUsed}`);
      console.log(`   - Processing time: ${result.metadata.processingTime}ms`);
      console.log(`   - Fallback used: ${result.metadata.fallbackUsed ? 'Yes' : 'No'}`);
      console.log(`   - Safety validated: ${result.metadata.safetyValidated ? 'Yes' : 'No'}`);
      console.log(`   - Confidence score: ${(result.metadata.confidenceScore * 100).toFixed(1)}%`);
      
      if (result.emergencyContacts && result.emergencyContacts.length > 0) {
        console.log(`   - Emergency contacts: ${result.emergencyContacts.length} provided`);
      }

      console.log('\n📋 Consultation Content:');
      console.log(`   - Condition Assessment: ${result.consultation.conditionAssessment.substring(0, 100)}...`);
      console.log(`   - Symptom Correlation: ${result.consultation.symptomCorrelation.substring(0, 100)}...`);
      console.log(`   - Recommendations: ${result.consultation.recommendations.length} items`);
      console.log(`   - Urgency Level: ${result.consultation.urgencyLevel}`);
      console.log(`   - Educational Info: ${result.consultation.educationalInfo.substring(0, 100)}...`);

      // Check if this is a real Gemini response or fallback
      if (!result.metadata.fallbackUsed && result.metadata.modelUsed.includes('gemini')) {
        console.log('\n🎉 SUCCESS: Real Gemini response received!');
      } else if (result.metadata.fallbackUsed) {
        console.log('\n⚠️  FALLBACK: Using fallback response (Gemini may be unavailable)');
      } else {
        console.log('\n🤔 UNCLEAR: Response generated but unclear if from Gemini');
      }

    } else {
      console.log('❌ Consultation generation failed:');
      console.log(`   - Error: ${result.error}`);
      
      if (result.fallbackConsultation) {
        console.log('   - Fallback consultation provided');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testConsultationAPI();