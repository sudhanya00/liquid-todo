/**
 * AI Retry Logic Test
 * 
 * Tests the retry utility with various error scenarios
 * Run: npx tsx scripts/test-ai-retry.ts
 */

import { retryWithBackoff, AIError, getUserFriendlyErrorMessage } from "../src/lib/aiRetry.js";

// Test 1: Success on first attempt
async function testSuccessFirstAttempt() {
  console.log("\n🧪 Test 1: Success on First Attempt");
  console.log("─".repeat(50));
  
  const result = await retryWithBackoff(
    async () => {
      console.log("  → Attempting operation...");
      return "Success!";
    },
    { maxRetries: 2 },
    "Test Success"
  );
  
  console.log(`  ✅ Result: ${result}`);
}

// Test 2: Failure then success (retryable error)
async function testRetryableError() {
  console.log("\n🧪 Test 2: Retryable Error (Success on 2nd Attempt)");
  console.log("─".repeat(50));
  
  let attemptCount = 0;
  
  try {
    const result = await retryWithBackoff(
      async () => {
        attemptCount++;
        if (attemptCount === 1) {
          console.log("  → Attempt 1: Simulating timeout...");
          throw new Error("timeout");
        }
        console.log("  → Attempt 2: Success!");
        return "Success after retry!";
      },
      { maxRetries: 2, initialDelayMs: 500 },
      "Test Retry"
    );
    
    console.log(`  ✅ Result: ${result}`);
  } catch (error) {
    console.log(`  ❌ Failed: ${error}`);
  }
}

// Test 3: Non-retryable error (should fail immediately)
async function testNonRetryableError() {
  console.log("\n🧪 Test 3: Non-Retryable Error (Immediate Failure)");
  console.log("─".repeat(50));
  
  let attemptCount = 0;
  
  try {
    await retryWithBackoff(
      async () => {
        attemptCount++;
        console.log(`  → Attempt ${attemptCount}: Invalid API key...`);
        throw new Error("API key invalid");
      },
      { maxRetries: 2, initialDelayMs: 500 },
      "Test Non-Retryable"
    );
  } catch (error) {
    if (error instanceof AIError) {
      console.log(`  ✅ Correctly failed fast after ${attemptCount} attempt(s)`);
      console.log(`  → Error Type: ${error.type}`);
      console.log(`  → Retryable: ${error.retryable}`);
      console.log(`  → Message: ${getUserFriendlyErrorMessage(error)}`);
    }
  }
}

// Test 4: Max retries exhausted
async function testMaxRetriesExhausted() {
  console.log("\n🧪 Test 4: Max Retries Exhausted");
  console.log("─".repeat(50));
  
  let attemptCount = 0;
  
  try {
    await retryWithBackoff(
      async () => {
        attemptCount++;
        console.log(`  → Attempt ${attemptCount}: Rate limit error...`);
        throw new Error("429 too many requests");
      },
      { maxRetries: 2, initialDelayMs: 500, maxDelayMs: 2000 },
      "Test Max Retries"
    );
  } catch (error) {
    if (error instanceof AIError) {
      console.log(`  ✅ Exhausted all retries after ${attemptCount} attempts`);
      console.log(`  → Error Type: ${error.type}`);
      console.log(`  → Message: ${getUserFriendlyErrorMessage(error)}`);
    }
  }
}

// Test 5: Timeout protection
async function testTimeout() {
  console.log("\n🧪 Test 5: Timeout Protection");
  console.log("─".repeat(50));
  
  try {
    await retryWithBackoff(
      async () => {
        console.log("  → Starting slow operation (will timeout)...");
        // Simulate a slow operation
        await new Promise(resolve => setTimeout(resolve, 3000));
        return "Should not reach here";
      },
      { maxRetries: 0, timeoutMs: 1000 },
      "Test Timeout"
    );
  } catch (error) {
    if (error instanceof AIError) {
      console.log(`  ✅ Correctly timed out`);
      console.log(`  → Error Type: ${error.type}`);
      console.log(`  → Message: ${getUserFriendlyErrorMessage(error)}`);
    }
  }
}

// Test 6: Exponential backoff timing
async function testBackoffTiming() {
  console.log("\n🧪 Test 6: Exponential Backoff Timing");
  console.log("─".repeat(50));
  
  const delays: number[] = [];
  let lastTime = Date.now();
  let attemptCount = 0;
  
  try {
    await retryWithBackoff(
      async () => {
        attemptCount++;
        const now = Date.now();
        if (attemptCount > 1) {
          const delay = now - lastTime;
          delays.push(delay);
          console.log(`  → Attempt ${attemptCount}: Delay was ${delay}ms`);
        } else {
          console.log(`  → Attempt ${attemptCount}: First attempt`);
        }
        lastTime = now;
        throw new Error("503 service unavailable");
      },
      { 
        maxRetries: 3, 
        initialDelayMs: 1000,
        backoffMultiplier: 2,
        timeoutMs: 500, // Short timeout to fail fast
      },
      "Test Backoff"
    );
  } catch (error) {
    console.log(`  ✅ Backoff delays: ${delays.map(d => `${d}ms`).join(", ")}`);
    console.log(`  → Expected pattern: ~1000ms, ~2000ms, ~4000ms (with ±20% jitter)`);
  }
}

// Run all tests
async function runAllTests() {
  console.log("\n");
  console.log("═".repeat(50));
  console.log("  AI Retry Logic Test Suite");
  console.log("═".repeat(50));
  
  try {
    await testSuccessFirstAttempt();
    await testRetryableError();
    await testNonRetryableError();
    await testMaxRetriesExhausted();
    await testTimeout();
    await testBackoffTiming();
    
    console.log("\n");
    console.log("═".repeat(50));
    console.log("  ✅ All tests completed!");
    console.log("═".repeat(50));
    console.log("\n");
  } catch (error) {
    console.error("\n❌ Test suite failed:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

export { runAllTests };
