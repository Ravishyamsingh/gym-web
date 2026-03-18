const axios = require('axios');

// Test the OTP endpoint directly
const testOtpEndpoint = async () => {
  try {
    console.log('\n=== Testing OTP Endpoint ===\n');
    
    const API_URL = 'http://localhost:5000/api';
    
    // First, login to get a valid session
    console.log('[TEST] Step 1: Attempting to call OTP endpoint directly...\n');
    
    const config = {
      timeout: 10000, // 10 second timeout for debugging
      validateStatus: () => true, // Don't throw on any status
    };
    
    const startTime = Date.now();
    
    try {
      const response = await axios.post(
        `${API_URL}/attendance/request-fallback-otp`,
        {
          email: 'm.srikarthika@klu.ac.in',
          action: 'entry',
        },
        config
      );
      
      const elapsed = Date.now() - startTime;
      
      console.log(`[TEST] Response received in ${elapsed}ms`);
      console.log(`[TEST] Status: ${response.status}`);
      console.log(`[TEST] Response Data:`, JSON.stringify(response.data, null, 2));
      
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`[TEST] Error after ${elapsed}ms:`);
      console.error(`[TEST] Code: ${error.code}`);
      console.error(`[TEST] Message: ${error.message}`);
      
      if (error.response) {
        console.error(`[TEST] Response Status: ${error.response.status}`);
        console.error(`[TEST] Response Data:`, error.response.data);
      }
    }
    
  } catch (error) {
    console.error('[TEST] Unexpected error:', error.message);
  }
};

testOtpEndpoint();
