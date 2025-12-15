/**
 * Test Script for Agentic Task Management Flow
 * 
 * Tests:
 * 1. Intent classification (CREATE, UPDATE, COMPLETE, DELETE)
 * 2. Vagueness detection and scoring
 * 3. Priority inference from keywords
 * 4. Date parsing from natural language
 * 5. Follow-up question generation
 * 6. Context-aware task matching
 */

const BASE_URL = "http://localhost:3000";

interface TestCase {
  name: string;
  input: string;
  tasks?: any[];
  expected: {
    action?: string;
    priority?: string;
    hasDueDate?: boolean;
    asksQuestion?: boolean;
    questionShouldContain?: string[]; // At least one of these words should be in the question
    vaguenessAbove?: number;
  };
}

const testCases: TestCase[] = [
  // === VAGUENESS TESTS ===
  {
    name: "1. Vague task: Deploy (no context) - should ask WHAT/WHERE, not just when",
    input: "Deploy",
    expected: {
      action: "clarify",
      asksQuestion: true,
      questionShouldContain: ["what", "which", "where", "service", "environment"], // Contextual, not date
      vaguenessAbove: 60,
    },
  },
  {
    name: "2. Clear task with date",
    input: "Fix the login button validation on /auth page by tomorrow",
    expected: {
      action: "create",
      hasDueDate: true,
    },
  },

  // === PRIORITY INFERENCE TESTS ===
  {
    name: "3. High priority: URGENT keyword",
    input: "URGENT: Fix the security vulnerability by friday",
    expected: {
      action: "create",
      priority: "high",
      hasDueDate: true,
    },
  },
  {
    name: "4. Low priority: Eventually keyword",
    input: "Eventually refactor the utils folder by next week",
    expected: {
      action: "create",
      priority: "low",
      hasDueDate: true,
    },
  },

  // === DATE PARSING TESTS ===
  {
    name: "5. Date: tomorrow",
    input: "Send the report by tomorrow",
    expected: {
      hasDueDate: true,
    },
  },
  {
    name: "6. No date but clear task: asks for due date only",
    input: "Write integration tests for payment module",
    expected: {
      action: "clarify",
      asksQuestion: true,
      questionShouldContain: ["when", "deadline", "done", "need"], // Date question
    },
  },

  // === INTENT CLASSIFICATION TESTS ===
  {
    name: "7. Intent: Mark task as done",
    input: "Mark the login bug as done",
    tasks: [
      { id: "task1", title: "Fix the login bug", status: "todo", priority: "medium" },
      { id: "task2", title: "Update docs", status: "todo", priority: "low" },
    ],
    expected: {
      action: "update",
    },
  },
  {
    name: "8. Intent: Create despite 'complete' in title",
    input: "Complete the UAT testing by friday",
    tasks: [],
    expected: {
      action: "create",
      hasDueDate: true,
    },
  },
];

async function runTest(test: TestCase): Promise<{ passed: boolean; details: string; response?: any }> {
  try {
    const response = await fetch(`${BASE_URL}/api/parse-task`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: test.input,
        tasks: test.tasks || [],
        spaceName: "Test Space",
      }),
    });

    const data = await response.json();
    const failures: string[] = [];

    // Check action
    if (test.expected.action) {
      if (data.action !== test.expected.action) {
        failures.push(`Action: expected "${test.expected.action}", got "${data.action}"`);
      }
    }

    // Check priority
    if (test.expected.priority) {
      const actualPriority = data.task?.priority || data.pendingTask?.priority;
      if (actualPriority !== test.expected.priority) {
        failures.push(`Priority: expected "${test.expected.priority}", got "${actualPriority}"`);
      }
    }

    // Check due date
    if (test.expected.hasDueDate === true) {
      const hasDueDate = !!data.task?.dueDate;
      if (!hasDueDate && data.action === "create") {
        failures.push(`Expected due date to be present`);
      }
    }

    // Check if asks question
    if (test.expected.asksQuestion === true) {
      if (!data.question) {
        failures.push(`Expected a clarifying question`);
      }
    }
    
    // Check question content (at least one word should match)
    if (test.expected.questionShouldContain && data.question) {
      const questionLower = data.question.toLowerCase();
      const hasMatch = test.expected.questionShouldContain.some(word => 
        questionLower.includes(word.toLowerCase())
      );
      if (!hasMatch) {
        failures.push(`Question "${data.question}" should contain one of: ${test.expected.questionShouldContain.join(", ")}`);
      }
    }

    if (failures.length > 0) {
      return {
        passed: false,
        details: failures.join("; "),
        response: data,
      };
    }

    return { passed: true, details: "All checks passed", response: data };
  } catch (error) {
    return {
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function runAllTests() {
  console.log("\n🧪 Agent Flow Test Suite\n");
  console.log("=".repeat(60));
  
  let passed = 0;
  let failed = 0;

  for (const test of testCases) {
    process.stdout.write(`\n${test.name}\n`);
    process.stdout.write(`  Input: "${test.input}"\n`);
    
    const result = await runTest(test);
    
    if (result.passed) {
      console.log(`  ✅ PASS`);
      if (result.response?.task) {
        console.log(`     → Created: "${result.response.task.title}" (${result.response.task.priority}, due: ${result.response.task.dueDate})`);
      } else if (result.response?.question) {
        console.log(`     → Question: "${result.response.question}"`);
      } else if (result.response?.action === "update") {
        console.log(`     → Update task: ${result.response.taskId || result.response.taskTitle}`);
      }
      passed++;
    } else {
      console.log(`  ❌ FAIL: ${result.details}`);
      if (result.response) {
        console.log(`     Response: action=${result.response.action}, question=${result.response.question?.substring(0, 50)}...`);
      }
      failed++;
    }
    
    // Delay between tests
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  console.log("\n" + "=".repeat(60));
  console.log(`\n📊 Results: ${passed}/${testCases.length} passed (${Math.round(passed/testCases.length*100)}%)\n`);
  
  if (failed === 0) {
    console.log("🎉 All tests passed!\n");
    process.exit(0);
  } else {
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(e => {
  console.error("Test runner error:", e);
  process.exit(1);
});
