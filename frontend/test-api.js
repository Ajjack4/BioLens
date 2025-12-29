/**
 * Simple test script to verify the BiomedCLIP API integration
 */

const testApiCall = async () => {
  const testData = {
    data: [
      "https://samples.clario.com/dermatology/rash.jpg",
      "itchy circular rash spreading for 2 weeks"
    ]
  };

  try {
    console.log('🧪 Testing BiomedCLIP API...');
    console.log('📤 Request data:', testData);

    const response = await fetch('https://huggingface.co/spaces/Ajjack404/BioLens/run/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log('📡 Response status:', response.status, response.statusText);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ API Response:', result);

    // Test the mapping function
    if (result.data && Array.isArray(result.data)) {
      console.log('\n📊 Predictions:');
      result.data.forEach((pred, index) => {
        console.log(`${index + 1}. ${pred.label}: ${(pred.score * 100).toFixed(1)}%`);
      });
    }

  } catch (error) {
    console.error('❌ API Test Failed:', error);
  }
};

// Run the test if this is executed directly
if (typeof window === 'undefined') {
  testApiCall();
}

module.exports = { testApiCall };