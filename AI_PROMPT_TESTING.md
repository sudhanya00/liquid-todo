# AI Agent Prompt Testing - Edge Cases

This document contains edge cases for testing improved AI agent prompts.

## Intent Classifier Edge Cases

### 1. Task Title Contains Completion Words
**Input:** "Complete the API integration"
**Expected:** CREATE intent, title="Complete the API integration"
**Why:** "Complete" is the task title, not an operation on existing task

### 2. Task Title Contains "Update"
**Input:** "Update dependencies to latest versions"
**Expected:** CREATE intent, title="Update dependencies to latest versions"
**Why:** "Update" describes the work to do, not an operation on existing task

### 3. Ambiguous Completion Statement
**Input:** "I finished the setup"
**Existing tasks:** ["Database setup", "Environment setup", "Auth setup"]
**Expected:** CLARIFY intent
**Why:** Multiple tasks could match "setup"

### 4. Similar but Not Identical Task
**Input:** "Fix the authentication bug"
**Existing tasks:** ["Fix login bug"]
**Expected:** CREATE intent
**Why:** Different bugs, should create separate task

### 5. Vague Single Word Input
**Input:** "Deploy"
**Expected:** CREATE with high vagueness score (70+)
**Why:** No context about what to deploy

### 6. Urgent + Vague Input
**Input:** "URGENT: Fix the bug"
**Expected:** CREATE with priority="high", vagueness=60-70
**Why:** Has urgency (high priority) but lacks specifics (which bug?)

### 7. Natural Language Date
**Input:** "Review PR by Friday"
**Expected:** CREATE with dueDate=[next Friday's date]
**Why:** Should parse "Friday" to actual date

### 8. Multiple Tasks in One Input
**Input:** "Fix the login bug and update the docs"
**Expected:** Could be two CREATE actions OR one task with description
**Why:** Depends on voice vs text interface

### 9. Complete Existing Task
**Input:** "I finished the login bug fix"
**Existing tasks:** ["Fix login bug"]
**Expected:** COMPLETE intent, targetTask.id=[login bug task id]
**Why:** Clear reference to existing task + completion

### 10. Update Priority of Existing Task
**Input:** "Change the deployment task to high priority"
**Existing tasks:** ["Deploy to staging"]
**Expected:** UPDATE intent with updates.priority="high"
**Why:** Clear reference + modification request

### 11. Query Intent
**Input:** "What tasks are due today?"
**Expected:** QUERY intent
**Why:** Question format, asking for information

### 12. Delete with No Reference
**Input:** "Delete it"
**Expected:** CLARIFY intent
**Why:** No clear task reference

### 13. Very Long Description
**Input:** "Create a task to implement the new authentication system using OAuth 2.0 with Google and GitHub providers, including the database schema migration for user sessions and refresh tokens, and updating all API endpoints to use the new auth middleware"
**Expected:** 
- CREATE with title="Implement OAuth 2.0 authentication"
- description=full context
- vagueness=20-30 (actually quite specific)

### 14. Duplicate Task Title
**Input:** "Fix login bug"
**Existing tasks:** ["Fix login bug"]
**Expected:** CLARIFY or CREATE
**Why:** Could be updating existing or creating similar task

### 15. Status Change to In-Progress
**Input:** "Started working on the API task"
**Existing tasks:** ["API integration"]
**Expected:** UPDATE with status="in-progress"
**Why:** Status change, not completion

## Task Updater Edge Cases

### 1. Progress Note (Not Completion)
**Input:** "Completed the database schema design"
**Task:** "Implement user management system"
**Expected:** Timeline NOTE, no status change
**Why:** Schema design is a subtask, not the entire task

### 2. Task Actually Complete
**Input:** "The user management system is done"
**Task:** "Implement user management system"
**Expected:** status="done"
**Why:** Refers to the entire task by name

### 3. Reschedule Request
**Input:** "Move this to next Monday"
**Task:** "Deploy to production"
**Expected:** dueDate=[next Monday], timeline entry
**Why:** Date change request

### 4. Add Context Note
**Input:** "Blocked by database migration issue"
**Task:** "Deploy to production"
**Expected:** Timeline NOTE, no status change
**Why:** Adding context, not changing fields

### 5. Multiple Field Changes
**Input:** "Make this urgent and move to tomorrow"
**Task:** "Fix security vulnerability"
**Expected:** 
- priority="high"
- dueDate=[tomorrow]
- Timeline field_update entry

### 6. Ambiguous "It"
**Input:** "That's done"
**Expected:** Need to verify task context, possibly timeline note
**Why:** Pronoun reference needs context

### 7. Partial Completion
**Input:** "Finished phase 1 of the migration"
**Task:** "Database migration"
**Expected:** Timeline NOTE, no status change
**Why:** Partial progress, not complete task

### 8. Reopen Completed Task
**Input:** "Need to reopen this task"
**Task:** "Bug fix" (status: done)
**Expected:** status="todo", timeline status_change
**Why:** Moving from done back to todo

## Voice Log Parsing Edge Cases

### 1. Multiple Tasks in Natural Speech
**Voice:** "Um, I need to fix the login bug, and also, uh, remind me to call John about the project tomorrow"
**Expected:** 
- CREATE "Fix login bug"
- CREATE "Call John about project" with dueDate=tomorrow

### 2. Task with Completion Word as Title
**Voice:** "Create a task to complete the UAT testing"
**Expected:** CREATE "Complete UAT testing"
**Why:** "Complete" is part of task title

### 3. Complete Existing Task via Voice
**Voice:** "I finished the database setup task"
**Existing:** ["Database setup"]
**Expected:** COMPLETE action for "Database setup"

### 4. Run-on Sentence
**Voice:** "Fix the API bug and make sure to test it and then deploy to staging and notify the team"
**Expected:** Multiple CREATE actions:
- "Fix API bug"
- "Test API fix"
- "Deploy to staging"
- "Notify team about deployment"

### 5. Priority in Natural Language
**Voice:** "This is urgent, fix the production error"
**Expected:** CREATE "Fix production error" with priority="high"

### 6. Filler Words
**Voice:** "Like, you know, I need to, um, review the PR, like, today"
**Expected:** CREATE "Review PR" with dueDate=today

### 7. Implied Actions
**Voice:** "Deployment for client demo Friday"
**Expected:** CREATE "Deployment for client demo" with dueDate=Friday

### 8. Update via Voice
**Voice:** "Change the API task to high priority"
**Existing:** ["API integration"]
**Expected:** UPDATE for "API integration" with priority="high"

## Priority Detection Edge Cases

| Input | Expected Priority | Reasoning |
|-------|------------------|-----------|
| "urgent bug fix" | high | "urgent" keyword |
| "ASAP deploy" | high | "ASAP" keyword |
| "critical security patch" | high | "critical" keyword |
| "fix when you get a chance" | low | "when you get a chance" |
| "eventually update docs" | low | "eventually" |
| "review PR" | medium | no urgency indicators |
| "important meeting" | high | "important" keyword |
| "low priority refactor" | low | explicit "low priority" |

## Vagueness Scoring Edge Cases

| Input | Expected Score | Expected Action |
|-------|---------------|-----------------|
| "Deploy service X to prod" | 15-25 | Create immediately, ask for date |
| "Fix bug" | 75-85 | Ask: Which bug? Where? What error? |
| "Update the thing" | 85-95 | Ask: What needs updating? |
| "URGENT: Deploy" | 55-65 | Has urgency but missing what/where |
| "Write tests for UserService" | 20-30 | Specific class, clear action |
| "Review PR #42" | 10-20 | Very specific reference |
| "Setup" | 90-95 | No context at all |
| "Fix login on /auth page" | 15-25 | Specific location and issue |

## Expected Behaviors

### Consistency
- Same input should produce same output (deterministic)
- Similar inputs should produce similar outputs

### Safety
- When uncertain: CREATE > UPDATE/DELETE
- Ambiguous references: CLARIFY before destructive operations
- Missing context: High vagueness score + follow-up questions

### User Experience
- Clear, actionable follow-up questions
- Not asking for information already provided
- Smart date parsing (Friday, tomorrow, next week)
- Natural language priority detection

### Robustness
- Handle typos gracefully
- Parse natural speech patterns
- Ignore filler words in voice
- Split compound requests appropriately

## Testing Methodology

1. **Unit Test Each Agent** - Test each prompt in isolation
2. **Integration Test** - Test full flow (text input → classifier → updater)
3. **Voice Flow Test** - Test voice → transcription → parsing
4. **Edge Case Coverage** - Test all scenarios above
5. **Regression Test** - Ensure old functionality still works

## Success Criteria

- ✅ 95%+ accuracy on intent classification
- ✅ Correct vagueness scoring (±10 points)
- ✅ Safe defaults (CREATE when uncertain)
- ✅ No false positives on UPDATE/DELETE/COMPLETE
- ✅ Proper handling of edge cases
- ✅ Consistent behavior across similar inputs
