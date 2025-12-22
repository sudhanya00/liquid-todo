/**
 * Comprehensive Agent Flow Tests
 * 
 * Tests multi-turn conversations, edge cases, and strict validation
 */

const BASE_URL = "http://localhost:3000";

export {};

interface ConversationStep {
  input: string;
  expectAction?: "create" | "update" | "clarify" | "delete";
  expectQuestion?: boolean;
  expectQuestionContains?: string[];
  expectTaskCreated?: boolean;
  expectPriority?: "low" | "medium" | "high";
  expectDueDate?: boolean;
  expectTitleContains?: string;
}

interface ConversationTest {
  name: string;
  description: string;
  initialTasks?: any[];
  steps: ConversationStep[];
}

const conversationTests: ConversationTest[] = [
  // === MULTI-TURN CONVERSATION TESTS ===
  {
    name: "Multi-turn: Vague task → Context → Date",
    description: "Should ask for context first, then date, then create",
    steps: [
      {
        input: "Deploy",
        expectAction: "clarify",
        expectQuestion: true,
        expectQuestionContains: ["which", "what", "environment", "service"],
      },
      {
        input: "The user auth service to production",
        expectAction: "clarify", // Should now ask for date
        expectQuestion: true,
        expectQuestionContains: ["when", "deadline", "date"],
      },
      {
        input: "by friday",
        expectAction: "create",
        expectTaskCreated: true,
        expectDueDate: true,
        expectTitleContains: "auth",
      },
    ],
  },
  {
    name: "Multi-turn: Context accumulation",
    description: "Answers should accumulate, not be lost",
    steps: [
      {
        input: "Fix bug",
        expectAction: "clarify",
        expectQuestion: true,
      },
      {
        input: "The login form validation bug",
        expectAction: "clarify", // Should ask for date, NOT repeat the context question
        expectQuestion: true,
      },
      {
        input: "tomorrow",
        expectAction: "create",
        expectTaskCreated: true,
        expectTitleContains: "login",
      },
    ],
  },
  
  // === SINGLE TURN COMPLETE TESTS ===
  {
    name: "Single turn: Complete task info",
    description: "Should create immediately with all info provided",
    steps: [
      {
        input: "URGENT: Fix the payment gateway timeout error in checkout by tomorrow",
        expectAction: "create",
        expectTaskCreated: true,
        expectPriority: "high",
        expectDueDate: true,
      },
    ],
  },
  {
    name: "Single turn: Specific PR review",
    description: "PR references should be clear enough",
    steps: [
      {
        input: "Review PR #1234 for the auth refactor by friday",
        expectAction: "create",
        expectTaskCreated: true,
        expectDueDate: true,
        expectTitleContains: "PR",
      },
    ],
  },

  // === PRIORITY DETECTION TESTS ===
  {
    name: "Priority: Multiple high keywords",
    description: "CRITICAL ASAP should be high priority",
    steps: [
      {
        input: "CRITICAL: Server is down, fix ASAP by today",
        expectAction: "create",
        expectPriority: "high",
        expectDueDate: true,
      },
    ],
  },
  {
    name: "Priority: Low priority with date",
    description: "Eventually/someday should be low priority",
    steps: [
      {
        input: "Someday we should refactor the database schema, maybe next month",
        expectAction: "create",
        expectPriority: "low",
      },
    ],
  },
  {
    name: "Priority: No keywords = medium",
    description: "Default should be medium priority",
    steps: [
      {
        input: "Add caching to the API endpoints by next week",
        expectAction: "create",
        expectPriority: "medium",
        expectDueDate: true,
      },
    ],
  },

  // === DATE PARSING TESTS ===
  {
    name: "Date: Specific date format",
    description: "Should parse December 25, 2025",
    steps: [
      {
        input: "Prepare Christmas release by December 25, 2025",
        expectAction: "create",
        expectDueDate: true,
      },
    ],
  },
  {
    name: "Date: Relative dates",
    description: "Should parse 'in 3 days'",
    steps: [
      {
        input: "Send the proposal in 3 days",
        expectAction: "create",
        expectDueDate: true,
      },
    ],
  },
  {
    name: "Date: EOD/End of day",
    description: "EOD should be today",
    steps: [
      {
        input: "Finish the report EOD",
        expectAction: "create",
        expectDueDate: true,
      },
    ],
  },

  // === INTENT CLASSIFICATION TESTS ===
  {
    name: "Intent: Update existing task status",
    description: "Should match and update existing task",
    initialTasks: [
      { id: "task-123", title: "Fix the authentication bug", status: "todo", priority: "medium" },
      { id: "task-456", title: "Update user documentation", status: "in-progress", priority: "low" },
    ],
    steps: [
      {
        input: "I finished the authentication bug fix",
        expectAction: "update",
      },
    ],
  },
  {
    name: "Intent: Update priority of existing task",
    description: "Should update priority without creating new",
    initialTasks: [
      { id: "task-789", title: "Refactor the payment module", status: "todo", priority: "low" },
    ],
    steps: [
      {
        input: "Make the payment module refactor high priority",
        expectAction: "update",
      },
    ],
  },
  {
    name: "Intent: Create despite similar existing task",
    description: "Different task should create new",
    initialTasks: [
      { id: "task-111", title: "Fix login page CSS", status: "done", priority: "medium" },
    ],
    steps: [
      {
        input: "Fix login page JavaScript validation by tomorrow",
        expectAction: "create",
        expectTaskCreated: true,
      },
    ],
  },

  // === EDGE CASES ===
  {
    name: "Edge: 'Complete' in title = CREATE",
    description: "Complete UAT should create, not mark done",
    initialTasks: [],
    steps: [
      {
        input: "Complete the UAT testing phase by next monday",
        expectAction: "create",
        expectTaskCreated: true,
        expectTitleContains: "UAT",
      },
    ],
  },
  {
    name: "Edge: Very long task description",
    description: "Should handle long input gracefully",
    steps: [
      {
        input: "We need to migrate the entire user database from PostgreSQL to MongoDB, including all user profiles, preferences, session data, and authentication tokens, ensuring zero downtime and full data integrity, by end of next week",
        expectAction: "create",
        expectDueDate: true,
      },
    ],
  },
  {
    name: "Edge: Task with special characters",
    description: "Should handle special chars in input",
    steps: [
      {
        input: "Fix the bug in /api/users/:id endpoint (returns 500 error) by tomorrow",
        expectAction: "create",
        expectDueDate: true,
      },
    ],
  },
  {
    name: "Edge: Ambiguous 'it' reference",
    description: "Should ask for clarification",
    initialTasks: [
      { id: "t1", title: "Fix login bug", status: "todo" },
      { id: "t2", title: "Update docs", status: "todo" },
    ],
    steps: [
      {
        input: "Mark it as done",
        expectAction: "clarify",
        expectQuestion: true,
      },
    ],
  },
];

// Simple single-request tests
interface SimpleTest {
  name: string;
  input: string;
  tasks?: any[];
  expect: {
    action: string;
    priority?: string;
    hasDueDate?: boolean;
    hasQuestion?: boolean;
  };
}

const simpleTests: SimpleTest[] = [
  // Vagueness tests
  { name: "Vague: Single word", input: "Deploy", tasks: [], expect: { action: "clarify", hasQuestion: true } },
  { name: "Vague: Two words", input: "Fix bug", tasks: [], expect: { action: "clarify", hasQuestion: true } },
  { name: "Vague: Generic update", input: "Update the system", tasks: [], expect: { action: "clarify", hasQuestion: true } },
  
  // Clear tasks (should create or ask only for date)
  { name: "Clear: With date", input: "Fix the auth token expiry bug in UserService.ts by friday", tasks: [], expect: { action: "create", hasDueDate: true } },
  { name: "Clear: Without date", input: "Fix the auth token expiry bug in UserService.ts", tasks: [], expect: { action: "clarify", hasQuestion: true } },
  
  // Priority tests
  { name: "Priority: URGENT", input: "URGENT deploy hotfix by today", tasks: [], expect: { action: "create", priority: "high", hasDueDate: true } },
  { name: "Priority: critical", input: "Critical: database migration by tomorrow", tasks: [], expect: { action: "create", priority: "high", hasDueDate: true } },
  { name: "Priority: eventually", input: "Eventually clean up the test data next month", tasks: [], expect: { action: "create", priority: "low" } },
  { name: "Priority: no rush", input: "Update the README, no rush, by next week", tasks: [], expect: { action: "create", priority: "low", hasDueDate: true } },
  { name: "Priority: default medium", input: "Add unit tests for PaymentService by friday", tasks: [], expect: { action: "create", priority: "medium", hasDueDate: true } },
  
  // Intent classification
  { 
    name: "Intent: mark done", 
    input: "I finished the login bug", 
    tasks: [{ id: "t1", title: "Fix the login bug", status: "in-progress" }], 
    expect: { action: "update" } 
  },
  { 
    name: "Intent: create new despite 'done' word", 
    input: "Get the report done by friday", 
    tasks: [], 
    expect: { action: "create", hasDueDate: true } 
  },
  { 
    name: "Intent: delete task", 
    input: "Delete the old migration task", 
    tasks: [{ id: "t1", title: "Old migration task", status: "todo" }], 
    expect: { action: "delete" } 
  },
  
  // Date parsing
  { name: "Date: tomorrow", input: "Send report by tomorrow", tasks: [], expect: { action: "create", hasDueDate: true } },
  { name: "Date: next week", input: "Review code next week", tasks: [], expect: { action: "create", hasDueDate: true } },
  { name: "Date: specific day", input: "Deploy to staging on monday", tasks: [], expect: { action: "create", hasDueDate: true } },
  { name: "Date: EOD", input: "Finish tests EOD", tasks: [], expect: { action: "create", hasDueDate: true } },
];

async function callAPI(input: string, tasks: any[] = []): Promise<any> {
  const response = await fetch(`${BASE_URL}/api/parse-task`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: input,
      tasks,
      spaceName: "Test Space",
    }),
  });
  return response.json();
}

async function runSimpleTests(): Promise<{ passed: number; failed: number }> {
  console.log("\n📋 SIMPLE TESTS (Single Request)\n");
  console.log("-".repeat(70));
  
  let passed = 0;
  let failed = 0;
  
  for (const test of simpleTests) {
    try {
      const data = await callAPI(test.input, test.tasks);
      const failures: string[] = [];
      
      // Check action
      if (data.action !== test.expect.action) {
        failures.push(`action: expected ${test.expect.action}, got ${data.action}`);
      }
      
      // Check priority
      if (test.expect.priority) {
        const actualPriority = data.task?.priority || data.pendingTask?.priority;
        if (actualPriority !== test.expect.priority) {
          failures.push(`priority: expected ${test.expect.priority}, got ${actualPriority}`);
        }
      }
      
      // Check due date
      if (test.expect.hasDueDate && !data.task?.dueDate) {
        failures.push(`expected due date but got none`);
      }
      
      // Check question
      if (test.expect.hasQuestion && !data.question) {
        failures.push(`expected question but got none`);
      }
      
      if (failures.length === 0) {
        console.log(`✅ ${test.name}`);
        passed++;
      } else {
        console.log(`❌ ${test.name}`);
        console.log(`   Failures: ${failures.join(", ")}`);
        console.log(`   Response: action=${data.action}, priority=${data.task?.priority || data.pendingTask?.priority}, date=${data.task?.dueDate}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} - Error: ${error}`);
      failed++;
    }
    
    await new Promise(r => setTimeout(r, 600));
  }
  
  return { passed, failed };
}

async function runConversationTests(): Promise<{ passed: number; failed: number }> {
  console.log("\n\n🔄 CONVERSATION TESTS (Multi-Turn)\n");
  console.log("-".repeat(70));
  
  let passed = 0;
  let failed = 0;
  
  for (const test of conversationTests) {
    console.log(`\n📝 ${test.name}`);
    console.log(`   ${test.description}`);
    
    let context = "";
    let testPassed = true;
    let stepNum = 0;
    
    for (const step of test.steps) {
      stepNum++;
      const input = context ? `${context}. User clarified: ${step.input}` : step.input;
      
      try {
        const data = await callAPI(input, test.initialTasks);
        const failures: string[] = [];
        
        // Check expected action
        if (step.expectAction && data.action !== step.expectAction) {
          failures.push(`action: expected ${step.expectAction}, got ${data.action}`);
        }
        
        // Check question exists
        if (step.expectQuestion && !data.question) {
          failures.push(`expected question but got none`);
        }
        
        // Check question content
        if (step.expectQuestionContains && data.question) {
          const q = data.question.toLowerCase();
          const found = step.expectQuestionContains.some(kw => q.includes(kw.toLowerCase()));
          if (!found) {
            failures.push(`question should contain one of [${step.expectQuestionContains.join(", ")}], got: "${data.question.substring(0, 50)}..."`);
          }
        }
        
        // Check task created
        if (step.expectTaskCreated && !data.task) {
          failures.push(`expected task to be created`);
        }
        
        // Check priority
        if (step.expectPriority) {
          const actualPriority = data.task?.priority || data.pendingTask?.priority;
          if (actualPriority !== step.expectPriority) {
            failures.push(`priority: expected ${step.expectPriority}, got ${actualPriority}`);
          }
        }
        
        // Check due date
        if (step.expectDueDate && data.task && !data.task.dueDate) {
          failures.push(`expected due date`);
        }
        
        // Check title
        if (step.expectTitleContains && data.task) {
          if (!data.task.title.toLowerCase().includes(step.expectTitleContains.toLowerCase())) {
            failures.push(`title should contain "${step.expectTitleContains}", got "${data.task.title}"`);
          }
        }
        
        if (failures.length > 0) {
          console.log(`   Step ${stepNum}: ❌ "${step.input.substring(0, 40)}..."`);
          failures.forEach(f => console.log(`      - ${f}`));
          testPassed = false;
          break;
        } else {
          const actionIcon = data.action === "create" ? "✨" : data.action === "clarify" ? "❓" : "🔄";
          console.log(`   Step ${stepNum}: ✅ ${actionIcon} ${data.action} ${data.question ? `"${data.question.substring(0, 40)}..."` : data.task?.title ? `→ "${data.task.title}"` : ""}`);
        }
        
        // Accumulate context for next step
        if (data.action === "clarify") {
          context = input;
        }
        
      } catch (error) {
        console.log(`   Step ${stepNum}: ❌ Error: ${error}`);
        testPassed = false;
        break;
      }
      
      await new Promise(r => setTimeout(r, 800));
    }
    
    if (testPassed) {
      passed++;
    } else {
      failed++;
    }
  }
  
  return { passed, failed };
}

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("🧪 COMPREHENSIVE AGENT FLOW TEST SUITE");
  console.log("=".repeat(70));
  
  const simple = await runSimpleTests();
  const conversation = await runConversationTests();
  
  const totalPassed = simple.passed + conversation.passed;
  const totalFailed = simple.failed + conversation.failed;
  const total = totalPassed + totalFailed;
  
  console.log("\n" + "=".repeat(70));
  console.log("📊 FINAL RESULTS");
  console.log("=".repeat(70));
  console.log(`\nSimple Tests:       ${simple.passed}/${simple.passed + simple.failed} passed`);
  console.log(`Conversation Tests: ${conversation.passed}/${conversation.passed + conversation.failed} passed`);
  console.log(`\n🎯 TOTAL: ${totalPassed}/${total} passed (${Math.round(totalPassed/total*100)}%)`);
  
  if (totalFailed === 0) {
    console.log("\n🎉 ALL TESTS PASSED!\n");
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${totalFailed} tests failed\n`);
    process.exit(1);
  }
}

main().catch(e => {
  console.error("Test runner error:", e);
  process.exit(1);
});
