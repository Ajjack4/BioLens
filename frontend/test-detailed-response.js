/**
 * Detailed test to examine the full consultation response structure
 */

async function testDetailedResponse() {
  console.log('🔍 Testing Detailed Consultation Response...\n');

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
  const sessionId = `detailed-test-${Date.now()}`;

  try {
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
      console.log('📋 FULL CONSULTATION RESPONSE:');
      console.log('=====================================\n');
      
      console.log('🏥 CONDITION ASSESSMENT:');
      console.log(result.consultation.conditionAssessment);
      console.log('\n🔗 SYMPTOM CORRELATION:');
      console.log(result.consultation.symptomCorrelation);
      console.log('\n💡 RECOMMENDATIONS:');
      if (result.consultation.recommendations && result.consultation.recommendations.length > 0) {
        result.consultation.recommendations.forEach((rec, index) => {
          console.log(`${index + 1}. ${rec}`);
        });
      } else {
        console.log('⚠️  No recommendations found in response');
      }
      console.log('\n⏰ URGENCY LEVEL:');
      console.log(result.consultation.urgencyLevel);
      console.log('\n📚 EDUCATIONAL INFO:');
      console.log(result.consultation.educationalInfo);
      console.log('\n⚠️  MEDICAL DISCLAIMER:');
      console.log(result.consultation.medicalDisclaimer);
      
      if (result.emergencyContacts && result.emergencyContacts.length > 0) {
        console.log('\n🚨 EMERGENCY CONTACTS:');
        result.emergencyContacts.forEach((contact, index) => {
          console.log(`${index + 1}. ${contact.name} (${contact.type}): ${contact.phone}`);
          console.log(`   ${contact.description}`);
        });
      }

      console.log('\n📊 METADATA:');
      console.log(`   - Model: ${result.metadata.modelUsed}`);
      console.log(`   - Processing Time: ${result.metadata.processingTime}ms`);
      console.log(`   - Fallback Used: ${result.metadata.fallbackUsed}`);
      console.log(`   - Safety Validated: ${result.metadata.safetyValidated}`);
      console.log(`   - Confidence Score: ${(result.metadata.confidenceScore * 100).toFixed(1)}%`);

    } else {
      console.log('❌ Test failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testDetailedResponse();