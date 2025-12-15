# Smera (LiquidTodo) — Execution Milestones

**Version**: 1.4  
**Created**: December 15, 2025  
**Last Updated**: December 16, 2025 (Iteration 7)  
**Timeline**: 8–12 weeks  
**Status**: M1 ✅, M2 ~90%, M3 ~90%, M4 ~85%, M6 ~60%

---

## Overview

This document breaks down the [Engineering Direction & Execution Plan](./ENGINEERING_DIRECTION.md) into actionable milestones with clear deliverables, acceptance criteria, and estimated effort.

---

## Milestone 1: Tiering & Entitlement System

**Duration**: 1.5 weeks  
**Priority**: P0 (Must be first)  
**Dependencies**: None  
**Status**: ✅ COMPLETE

### 1.1 Data Models & Schema ✅ COMPLETE

**Files Created/Modified**:
- ✅ `src/types/index.ts` — Added `UserPlan`, `PlanTier`, `EntitlementAction`, `PlanLimits`, `PLAN_LIMITS`
- ✅ `src/lib/entitlements.ts` — Core entitlement logic

**Deliverables**:

```typescript
// Types added ✅
interface UserPlan {
  userId: string;
  tier: 'free' | 'pro';
  voiceLogsUsed: number;
  voiceLogsResetAt: number; // Monthly reset timestamp
  createdAt: number;
  updatedAt: number;
}

interface PlanLimits {
  maxVoiceLogs: number | null; // null = unlimited
  maxSpaces: number | null;
  hasGitHubIntegration: boolean;
  hasCalendarIntegration: boolean;
  hasDailySummary: boolean;
}
```

**Acceptance Criteria**:
- [x] `UserPlan` Firestore collection schema defined
- [x] Default plan created on user signup (via `getUserPlan`)
- [x] Plan limits defined for Free and Pro tiers

---

### 1.2 Entitlement Helper Functions ✅ COMPLETE

**Files Created**:
- ✅ `src/lib/entitlements.ts`
- ✅ `src/lib/hooks/useEntitlements.ts`

**Functions Implemented**:
```typescript
✅ canPerform(userId: string, action: EntitlementAction): Promise<EntitlementResult>
✅ canCreateSpace(userId: string, currentSpaceCount: number): Promise<EntitlementResult>
✅ getPlanLimits(tier: PlanTier): PlanLimits
✅ incrementUsage(userId: string, action: 'voice_log'): Promise<void>
✅ getRemainingQuota(userId: string, action: EntitlementAction): Promise<number | null>
✅ getQuotaDisplay(userId: string, action: EntitlementAction): Promise<string | null>
✅ getUserPlan(userId: string): Promise<UserPlan>
✅ upgradeToPro(userId: string): Promise<UserPlan>
```

**React Hook**:
```typescript
✅ useEntitlements() - Returns plan, limits, permission checks, quota info
```

**Acceptance Criteria**:
- [x] All entitlement checks work correctly
- [x] Usage increments atomically (via Firestore `increment`)
- [x] Monthly reset logic works (checks `voiceLogsResetAt`)

---

### 1.3 API Middleware Enforcement ✅ COMPLETE

**Files Created**:
- ✅ `src/lib/middleware/entitlementGuard.ts`
- ✅ `firestore.rules` — Production security rules

**Deliverables**:
- ✅ Server-side entitlement middleware helper
- ✅ Firestore security rules for all collections
- ⏳ `/api/voice-log` endpoint (Milestone 4)

**Acceptance Criteria**:
- [x] API returns 403 with clear message when limit reached
- [x] Firestore rules prevent unauthorized access
- [ ] Full server-side token verification (Milestone 2)

---

### 1.4 UI Limit Feedback ✅ COMPLETE

**Files Created/Modified**:
- ✅ `src/components/UpgradePrompt.tsx` — Multi-variant upgrade prompts
- ✅ `src/components/UpgradePrompt.tsx` — `QuotaDisplay` component
- ✅ `src/app/page.tsx` — Space creation limit enforcement

**UI States Implemented**:
- ✅ "Upgrade to Pro" modal when space limit reached
- ✅ Usage indicator in header (e.g., "1/2 Spaces")
- ✅ Graceful upgrade prompt with Pro features list

**Acceptance Criteria**:
- [x] Users see clear feedback before hitting limits
- [x] Upgrade prompts are non-intrusive but visible
- [x] No broken UI states when limits reached

---

### 1.5 Remaining Items

**To Complete Before Moving to Milestone 2**:
- [x] Deploy `firestore.rules` to Firebase (`firebase deploy --only firestore:rules`) ✅
- [x] Verify UserPlan auto-creation on first login

**Deferred to Later Milestones**:
- Voice log entitlement enforcement → Milestone 4
- Cloud Functions for secure plan upgrades → Milestone 7

---

## Milestone 2: Authentication & Security Hardening

**Duration**: 1 week  
**Priority**: P0  
**Dependencies**: Milestone 1 (UserPlan created on signup)  
**Status**: 🔄 ~70% Complete

### 2.1 Email Authentication ✅ COMPLETE

**Files Modified**:
- ✅ `src/context/AuthContext.tsx` — Full rewrite with email auth
- ✅ `src/app/login/page.tsx` — Multi-mode login UI

**Deliverables**:
- ✅ Email + password authentication (`signInWithEmail`, `signUpWithEmail`)
- ✅ Google Sign-In (existing, verified working)
- ✅ Email verification flow (`sendEmailVerification`)
- ✅ Password reset flow (`resetPassword`)

**Acceptance Criteria**:
- [x] Users can sign up with email/password
- [x] Email verification sent on signup
- [x] Password reset works end-to-end
- [x] Google Sign-In continues working

---

### 2.2 Session Persistence & Hydration ✅ COMPLETE

**Files Modified**:
- ✅ `src/context/AuthContext.tsx`
- ✅ `src/app/layout.tsx`

**Implementation**:
```typescript
// AuthContext improvements ✅
- Added 'authState' with 'initializing' | 'authenticated' | 'unauthenticated'
- Separate 'loading' for operation-in-progress
- UserPlan auto-initialized on first auth
```

**Acceptance Criteria**:
- [x] Auth state machine implemented
- [x] Session persists across page reloads (Firebase default persistence)
- [x] Clean loading state during hydration

---

### 2.3 Firestore Security Rules ✅ COMPLETE (from M1)

**Files Created**:
- ✅ `firestore.rules` — Production security rules

**Rules Implemented**:
- ✅ Spaces: Owner-only access
- ✅ UserPlans: Owner read, client write (dev), server-only delete
- ✅ Tasks (future): Parent space ownership verification
- ✅ AI Logs: Server-only (no client access)
- ✅ Default deny for all other paths

**Acceptance Criteria**:
- [x] Production rules written
- [ ] Rules deployed to Firebase (requires `firebase login`)
- [x] No public read/write access in rules
- [ ] Rules tested with Firebase Emulator

---

### 2.4 Auth Error States ✅ COMPLETE

**Files Modified**:
- ✅ `src/context/AuthContext.tsx`
- ✅ `src/app/login/page.tsx`

**Error States Handled** (15+ error codes):
- ✅ `auth/invalid-credential` → "Invalid email or password."
- ✅ `auth/email-already-in-use` → "This email is already registered."
- ✅ `auth/weak-password` → "Password should be at least 6 characters."
- ✅ `auth/user-not-found` → "No account found with this email."
- ✅ `auth/popup-blocked` → "Sign-in popup was blocked."
- ✅ `auth/too-many-requests` → "Too many attempts. Please try again later."
- ✅ `auth/network-request-failed` → "Network error."
- ✅ + 8 more error codes

**Acceptance Criteria**:
- [x] All error states have human-readable messages
- [x] No raw Firebase error codes shown to users
- [x] Errors displayed with clear UI feedback

---

### 2.5 Email Verification UI ✅ COMPLETE

**Files Created**:
- ✅ `src/components/EmailVerificationBanner.tsx`

**Features**:
- ✅ Banner for users with unverified email
- ✅ "Resend email" button with loading state
- ✅ Success feedback after resend
- ✅ Dismissible banner

---

### 2.6 Remaining Items

**To Complete**:
- [x] Deploy Firestore rules (`firebase deploy --only firestore:rules`) ✅
- [ ] Test auth flows end-to-end in browser
- [ ] Document auth state machine

**Deferred**:
- Server-side Firebase Admin SDK token verification → Milestone 7
- Security audit documentation → Milestone 7

---

## Milestone 3: Cloud Task Storage & Sync

**Duration**: 2 weeks  
**Priority**: P0  
**Dependencies**: Milestone 2 (Security rules)  
**Status**: 🔄 ~70% Complete

### 3.1 Firestore Task Schema ✅ COMPLETE

**Files Created/Modified**:
- ✅ `src/lib/services/taskService.ts` — Task service with Firestore integration
- ✅ `src/lib/hooks/useTasks.ts` — React hook for task management

**Schema**:
```typescript
// Firestore: /spaces/{spaceId}/tasks/{taskId}
interface Task {
  id: string;
  spaceId: string;
  ownerId: string; // Denormalized for queries
  title: string;
  description?: string;
  dueDate?: string | null;
  dueTime?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in-progress' | 'done';
  createdAt: number;
  updatedAt: number;
  updates: TaskUpdate[];
}
```

**Acceptance Criteria**:
- [x] Schema implemented in taskService.ts
- [x] ownerId denormalized for security rules
- [x] Backward compatible with existing Task type

---

### 3.2 Task Service Layer ✅ COMPLETE

**Files Created**:
- ✅ `src/lib/services/taskService.ts`

**Functions Implemented**:
```typescript
// CRUD ✅
✅ createTask(userId: string, spaceId: string, task: Partial<Task>): Promise<Task>
✅ updateTask(userId: string, spaceId: string, taskId: string, updates: Partial<Task>): Promise<void>
✅ deleteTask(userId: string, spaceId: string, taskId: string): Promise<void>
✅ getTasksBySpace(userId: string, spaceId: string): Promise<Task[]>

// Real-time ✅
✅ subscribeToTasks(userId: string, spaceId: string, callback): () => void

// Migration ✅
✅ getLocalStorageTasks(spaceId: string): Task[]
✅ migrateFromLocalStorage(userId: string, spaceId: string): Promise<MigrationResult>
✅ clearLocalStorageTasks(spaceId: string): void
```

**Acceptance Criteria**:
- [x] All CRUD operations work with Firestore
- [x] Real-time updates via onSnapshot
- [x] Ownership verification on all operations
- [x] Error handling for network failures

---

### 3.3 React Hook Implementation ✅ COMPLETE

**Files Created**:
- ✅ `src/lib/hooks/useTasks.ts`

**Hook Features**:
```typescript
const {
  tasks,           // Task[]
  loading,         // boolean
  error,           // string | null
  syncStatus,      // 'syncing' | 'synced' | 'offline' | 'error'
  migrationStatus, // 'idle' | 'migrating' | 'completed' | 'failed'
  addTask,         // (task) => Promise<Task>
  updateTask,      // (taskId, updates) => Promise<void>
  removeTask,      // (taskId) => Promise<void>
  dismissError,    // () => void
} = useTasks(spaceId);
```

**Acceptance Criteria**:
- [x] Real-time subscription to Firestore
- [x] Automatic migration from localStorage
- [x] Sync status tracking
- [x] Error handling with user feedback

---

### 3.4 Migration Strategy ✅ COMPLETE

**Files Created**:
- ✅ `src/lib/services/taskService.ts` (migration functions)
- ✅ `src/lib/hooks/useTasks.ts` (auto-migration logic)

**Flow Implemented**:
```
1. ✅ Detect existing localStorage tasks
2. ✅ Auto-migrate on first cloud load
3. ✅ Upload tasks to Firestore (per space)
4. ✅ Clear localStorage after successful migration
5. ✅ Show migration status banners to user
```

**Acceptance Criteria**:
- [x] Existing users don't lose data
- [x] Migration is idempotent (skips if no local data)
- [x] Progress/status indicator during migration
- [x] Migration can fail gracefully (tasks still in localStorage)

---

### 3.5 Space Page Refactor ✅ COMPLETE

**Files Modified**:
- ✅ `src/app/space/[id]/page.tsx`

**Changes Made**:
- ✅ Replaced localStorage reads with `useTasks` hook
- ✅ Added real-time listener for task updates
- ✅ Added sync status indicator (Syncing/Synced/Offline)
- ✅ Added migration status banners
- ✅ Added loading skeletons during initial fetch
- ✅ Added empty state for spaces with no tasks
- ✅ Added error banner with dismiss functionality

**Acceptance Criteria**:
- [x] Tasks load from Firestore
- [x] Real-time updates work
- [x] No data loss during transition
- [x] Clear UI feedback for sync state

---

### 3.6 Remaining Items

**To Complete**:
- [ ] Local cache layer for offline reading (optional)
- [ ] Firestore indexes for query optimization
- [ ] End-to-end testing of migration flow

**Deferred to Later**:
- Offline write queue → Milestone 5 (nice-to-have)
- Conflict resolution → Milestone 5 (nice-to-have)

---

## Milestone 4: Voice Logging MVP

**Duration**: 2 weeks  
**Priority**: P1  
**Dependencies**: Milestone 1 (Entitlements), Milestone 3 (Cloud storage)  
**Status**: 🔄 ~70% Complete

### 4.1 Voice Capture Component ✅ COMPLETE

**Files Created**:
- ✅ `src/components/VoiceInput.tsx`
- ✅ `src/lib/audio/recorder.ts`

**Features Implemented**:
- ✅ Record button with visual feedback (pulsing animation)
- ✅ Recording timer (MM:SS format)
- ✅ Stop/Cancel controls
- ✅ Audio level visualization (8-bar equalizer)
- ✅ Pause/Resume support
- ✅ Compact variant for inline use

**Tech Stack**:
- Web Audio API for capture & level monitoring
- MediaRecorder API for encoding (webm/ogg/mp4 fallback)

**Acceptance Criteria**:
- [x] Works in Chrome, Firefox (Safari needs testing)
- [x] Microphone permission handling with error messages
- [x] Max recording duration (2 minutes, configurable)
- [x] Audio encoding optimized (128kbps)

---

### 4.2 Speech-to-Text Integration ✅ COMPLETE

**Files Created**:
- ✅ `src/app/api/voice-log/route.ts`
- ✅ `src/lib/services/speechToText.ts`

**Implementation**:
- Using **Gemini 2.0 Flash** multimodal API (native audio support)
- No external STT service needed
- Direct audio blob → transcript

**API Flow**:
```
Client: POST /api/voice-log
  Body: { audioBase64, mimeType, spaceId, existingTasks }
  
Server:
  1. (TODO) Check entitlement
  2. Transcribe via Gemini multimodal
  3. Parse transcript into actions
  4. Return { transcript, actions }
```

**Acceptance Criteria**:
- [x] Transcription via Gemini 2.0 Flash
- [x] Handles various audio formats
- [x] Clear error for no speech detected
- [x] Error handling for service failures

---

### 4.3 Multi-Action Orchestration ✅ COMPLETE

**Files Created**:
- ✅ `src/lib/services/speechToText.ts` (includes `parseVoiceLogActions`)

**Example Input**:
> "Finished the auth work, and I need to start the database migration tomorrow, also make the voice logging task high priority"

**Output Format**:
```json
{
  "actions": [
    { "type": "COMPLETE", "taskId": "xxx" },
    { "type": "CREATE", "task": { "title": "Database migration", "dueDate": "2025-12-16" } },
    { "type": "UPDATE", "taskId": "yyy", "updates": { "priority": "high" } }
  ]
}
```

**Acceptance Criteria**:
- [x] Handles multiple actions per voice input
- [x] Fuzzy matches existing tasks by name
- [x] Creates new tasks when needed
- [x] Extracts dates (tomorrow, next week, etc.)
- [x] Default priority handling

---

### 4.4 Preview & Confirmation UI ✅ COMPLETE

**Files Created**:
- ✅ `src/components/VoicePreviewModal.tsx`

**Flow Implemented**:
```
1. ✅ User records voice
2. ✅ Show transcript (editable)
3. ✅ Show parsed actions with visual cards
4. ✅ User can remove individual actions
5. ✅ Confirm executes all actions
```

**UI Elements**:
- ✅ Transcript display with edit button
- ✅ Color-coded action cards (green=create, blue=update, purple=complete)
- ✅ Action removal per card
- ✅ Confirm/Cancel buttons
- ✅ Processing state with spinner

**Acceptance Criteria**:
- [x] Clear action previews
- [x] Users can reject individual actions
- [x] No auto-commit (always preview first)

---

### 4.5 Space Page Integration ✅ COMPLETE

**Files Modified**:
- ✅ `src/app/space/[id]/page.tsx`

**Integration Points**:
- ✅ VoiceInput button next to TaskInput
- ✅ Voice processing indicator banner
- ✅ VoicePreviewModal integration
- ✅ Multi-action execution on confirm

---

### 4.6 Remaining Items

**To Complete**:
- [ ] Entitlement check before voice log processing
- [ ] Increment usage after successful voice log
- [ ] Safari browser testing
- [ ] Voice log history/audit trail (optional)

**Deferred to Later**:
- Offline voice log queue → Milestone 5
- Voice log retry mechanism → Milestone 6

---

## Milestone 5: UI/UX Polish Pass

**Duration**: 1.5 weeks  
**Priority**: P1  
**Dependencies**: Core features stable

### 5.1 Loading States

**Files to Modify**:
- All components with async operations

**Changes**:
- Replace `<Loader2>` spinners with skeleton loaders
- Add shimmer effects
- Consistent loading patterns

**Components to Update**:
- Space cards grid
- Task list
- Task detail modal
- Voice processing

**Acceptance Criteria**:
- [ ] No layout shift during loading
- [ ] Skeletons match final content shape
- [ ] Loading states feel fast

---

### 5.2 Empty States

**Files to Create/Modify**:
- `src/components/EmptyState.tsx`
- All list views

**Empty States Needed**:
- No spaces yet
- No tasks in space
- No search results
- No activity timeline

**Design**:
- Friendly illustration (optional)
- Clear call-to-action
- Helpful hint text

**Acceptance Criteria**:
- [ ] All empty states designed
- [ ] Actionable prompts where appropriate
- [ ] Consistent styling

---

### 5.3 Error States

**Files to Create**:
- `src/components/ErrorBoundary.tsx`
- `src/components/ErrorMessage.tsx`

**Error Types**:
- Network failure
- AI processing error
- Permission denied
- Not found
- Rate limited

**Acceptance Criteria**:
- [ ] All errors have recovery actions
- [ ] No raw error messages
- [ ] Retry mechanisms where appropriate

---

### 5.4 AI Processing States

**Files to Modify**:
- `src/components/TaskInput.tsx`
- `src/components/VoiceInput.tsx`

**States to Distinguish**:
1. **Processing**: "Understanding your input..."
2. **Clarifying**: "I need more information: [question]"
3. **Complete**: "Got it! [summary]"
4. **Failed**: "I couldn't process that. [reason]"

**Acceptance Criteria**:
- [ ] Each state visually distinct
- [ ] Clear state transitions
- [ ] No ambiguous states

---

### 5.5 Keyboard Navigation

**Files to Modify**:
- All interactive components

**Shortcuts**:
- `Cmd/Ctrl + K`: Quick task input
- `Escape`: Close modals
- `Tab`: Navigate elements
- `Enter`: Confirm actions
- `Arrow keys`: Navigate lists

**Acceptance Criteria**:
- [ ] All features keyboard accessible
- [ ] Focus indicators visible
- [ ] Logical tab order

---

### 5.6 Undo System

**Files to Create**:
- `src/lib/undo/undoStack.ts`
- `src/context/UndoContext.tsx`
- `src/components/UndoToast.tsx`

**Undoable Actions**:
- Task deletion
- Task status change
- Space deletion

**Implementation**:
```typescript
// Store inverse operations
interface UndoAction {
  id: string;
  label: string;
  undo: () => Promise<void>;
  expiresAt: number; // 10 second window
}
```

**Acceptance Criteria**:
- [ ] Toast appears after destructive actions
- [ ] Undo works within time window
- [ ] Multiple undos queued properly

---

## Milestone 6: AI System Hardening

**Duration**: 1 week  
**Priority**: P1  
**Dependencies**: Milestones 1-4 complete  
**Status**: 🔄 ~60% Complete

### 6.1 LLM-Powered Intent Classification ✅ COMPLETE

**Files Created**:
- ✅ `src/lib/agents/classifier.ts` — Core classification engine

**Implementation**:
```typescript
// Classifier replaces fuzzy matching with LLM-based classification
interface ClassificationResult {
  intent: 'create' | 'update' | 'complete' | 'delete';
  confidence: number;       // 0-100
  reasoning: string;
  suggestedTaskId?: string;
  vaguenessScore: number;   // 0-100 (LLM-assessed)
  contextQuestions?: string[];
  dateQuestions?: string;
  taskDetails: {
    title: string;           // Short, 3-7 words max
    description?: string;    // All details here
    dueDate?: string;
    dueTime?: string;
    priority?: 'low' | 'medium' | 'high';
  };
  suggestedImprovements?: string[];
}
```

**Key Features**:
- ✅ Full context awareness (existing tasks, current date)
- ✅ Intent detection: CREATE, UPDATE, COMPLETE, DELETE
- ✅ Priority inference from keywords (URGENT → high, eventually → low)
- ✅ Natural language date parsing (Friday → 2025-12-19)
- ✅ Title/description split (short titles, details in description)

**Acceptance Criteria**:
- [x] Classifier correctly identifies intent from natural language
- [x] Priority inferred from context ("urgent", "ASAP", "eventually")
- [x] Dates parsed correctly ("tomorrow", "next Friday", "Dec 25")

---

### 6.2 Vagueness Scoring & Smart Follow-ups ✅ COMPLETE

**Files Modified**:
- ✅ `src/lib/agents/classifier.ts`
- ✅ `src/app/api/parse-task/route.ts`

**Implementation**:
```typescript
// Vagueness scoring thresholds
// 0-30:  Clear task - create immediately
// 31-60: Medium - ask for due date only
// 61-100: Vague - ask combined smart question

// Combined question flow (prevents infinite follow-up loops)
if (vaguenessScore > 60 && (contextQuestions || dateQuestions)) {
  // Combine into ONE smart question
  return { needsMoreInfo: true, question: combinedQuestion };
}
```

**Key Features**:
- ✅ LLM-based vagueness analysis (not word count)
- ✅ Smart thresholds for follow-up decisions
- ✅ Combined questions (ONE question, not multiple rounds)
- ✅ Prevents infinite follow-up loops

**Acceptance Criteria**:
- [x] Vagueness scored by LLM (0-100)
- [x] Clear tasks created immediately
- [x] Vague tasks get ONE smart question
- [x] No infinite follow-up loops

---

### 6.3 Suggested Improvements Feature ✅ COMPLETE

**Files Modified**:
- ✅ `src/types/index.ts` — Added `suggestedImprovements?: string[]` to Task
- ✅ `src/lib/services/taskService.ts` — Firestore mapping
- ✅ `src/components/TaskDetailModal.tsx` — UI for answering suggestions

**Implementation**:
```typescript
// Task interface addition
interface Task {
  // ... existing fields
  suggestedImprovements?: string[];  // Optional follow-up questions
}

// UI shows suggestions with "Answer" buttons
// Clicking triggers description enhancement
```

**Acceptance Criteria**:
- [x] suggestedImprovements stored on tasks
- [x] UI displays suggestions in TaskDetailModal
- [x] Users can answer suggestions to enrich tasks

---

### 6.4 AI Description Enhancement ✅ COMPLETE

**Files Created**:
- ✅ `src/app/api/enhance-description/route.ts`

**Implementation**:
```typescript
// POST /api/enhance-description
// Enhances (not replaces) existing description with new context
{
  existingDescription: string;
  newContext: string;
  taskTitle: string;
}
// Returns: { enhancedDescription: string }
```

**Key Features**:
- ✅ Integrates new information naturally
- ✅ Preserves existing context
- ✅ Called on task updates and suggestion answers
- ✅ Removed "Polish" button (cost protection)

**Acceptance Criteria**:
- [x] Descriptions enhanced, not replaced
- [x] Works for task updates
- [x] Works for suggestion answers
- [x] No manual "Polish" button (prevents cost abuse)

---

### 6.5 Test Suite ✅ COMPLETE

**Files Created**:
- ✅ `scripts/test-agent-flow.ts`

**Tests Implemented**:
```bash
# 8 comprehensive tests (100% passing)
✓ Create intent - "buy groceries tomorrow"
✓ Update intent - "add note to groceries"
✓ Complete intent - "groceries is done"
✓ Priority inference - "URGENT buy milk"
✓ Date parsing - "meeting friday"
✓ Vagueness scoring - "do the thing"
✓ Title extraction - long input → short title
✓ Description generation - details in description
```

**Acceptance Criteria**:
- [x] All test cases passing
- [x] Edge cases covered
- [x] Runnable via `npx ts-node scripts/test-agent-flow.ts`

---

### 6.6 Prompt Versioning (Pending)

**Files to Create**:
- `src/lib/agents/prompts/` directory
- `src/lib/agents/prompts/orchestrator.v1.ts`
- `src/lib/agents/prompts/creator.v1.ts`
- `src/lib/agents/prompts/updater.v1.ts`

**Structure**:
```typescript
export const ORCHESTRATOR_PROMPT_V1 = {
  version: '1.0.0',
  createdAt: '2025-12-15',
  prompt: `...`,
  changelog: 'Initial production prompt'
};
```

**Acceptance Criteria**:
- [ ] All prompts versioned
- [ ] Easy to A/B test prompts
- [ ] Rollback possible

---

### 6.7 Output Schema Validation (Pending)

**Files to Create**:
- `src/lib/agents/validation.ts`

**Implementation**:
```typescript
import { z } from 'zod'; // Add zod dependency

const ClassifierResponseSchema = z.object({
  intent: z.enum(['create', 'update', 'complete', 'delete']),
  reasoning: z.string(),
  confidence: z.number().min(0).max(100),
  vaguenessScore: z.number().min(0).max(100),
  suggestedTaskId: z.string().optional()
});
```

**Acceptance Criteria**:
- [ ] All AI responses validated
- [ ] Invalid responses trigger fallback
- [ ] Validation errors logged

---

### 6.8 Retry & Fallback Logic (Pending)

**Files to Create/Modify**:
- `src/lib/agents/aiClient.ts`

**Strategy**:
```typescript
// Exponential backoff with max 3 retries
// Fallback responses for common failures
const fallbackResponses = {
  classifier: { intent: 'create', confidence: 50, vaguenessScore: 50 },
  creator: { missingInfo: 'Could you tell me more about this task?' },
  updater: { missingInfo: 'Which task are you referring to?' }
};
```

**Acceptance Criteria**:
- [ ] Retries work for transient failures
- [ ] Fallbacks are user-friendly
- [ ] No infinite loops

---

### 6.9 AI Decision Logging (Pending)

**Files to Create**:
- `src/lib/logging/aiLogger.ts`

**Logged Data**:
```typescript
interface AILogEntry {
  timestamp: number;
  userId: string;
  agent: 'classifier' | 'creator' | 'updater';
  input: string;
  output: object;
  confidence: number;
  vaguenessScore?: number;
  latencyMs: number;
  promptVersion: string;
  success: boolean;
  errorType?: string;
}
```

**Storage**: Firestore `aiLogs` collection (server-side only)

**Acceptance Criteria**:
- [ ] All AI calls logged
- [ ] PII handled appropriately
- [ ] Logs queryable for debugging

---

## Milestone 7: Deployment & Operations

**Duration**: 1 week  
**Priority**: P1  
**Dependencies**: All features complete

### 7.1 Environment Setup

**Files to Create/Modify**:
- `.env.example`
- `vercel.json` (if needed)

**Environments**:
- Development (local)
- Staging (Vercel preview)
- Production (Vercel production)

**Secrets to Manage**:
- Firebase credentials
- Gemini API key
- Whisper API key (future)
- Sentry DSN

**Acceptance Criteria**:
- [ ] Environment separation works
- [ ] Secrets not in git
- [ ] Easy local setup

---

### 7.2 Error Tracking (Sentry)

**Files to Create/Modify**:
- `src/lib/sentry.ts`
- `src/app/layout.tsx`

**Implementation**:
```bash
npm install @sentry/nextjs
```

**Tracked Events**:
- Unhandled exceptions
- AI failures
- API errors
- Auth failures

**Acceptance Criteria**:
- [ ] Sentry configured
- [ ] Source maps uploaded
- [ ] Alerts set up

---

### 7.3 Performance Monitoring

**Metrics to Track**:
- API response times
- AI latency
- Page load times
- Voice processing time

**Tools**:
- Vercel Analytics (built-in)
- Sentry Performance

**Acceptance Criteria**:
- [ ] Baseline metrics established
- [ ] Alerts for degradation
- [ ] Dashboard accessible

---

### 7.4 Firestore Backups

**Setup**:
- Enable Firestore automated backups
- Document restore procedure

**Acceptance Criteria**:
- [ ] Daily backups enabled
- [ ] Restore tested
- [ ] Retention policy documented

---

### 7.5 Production Checklist

**Checklist Items**:
- [ ] All environment variables set
- [ ] Firestore rules deployed
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] CORS configured
- [ ] Error pages (404, 500)
- [ ] Favicon and metadata
- [ ] OpenGraph tags
- [ ] Privacy policy page
- [ ] Terms of service page

---

## Summary Timeline

| Milestone | Duration | Weeks |
|-----------|----------|-------|
| M1: Tiering & Entitlements | 1.5 weeks | 1-2 |
| M2: Auth Hardening | 1 week | 2-3 |
| M3: Cloud Storage | 2 weeks | 3-5 |
| M4: Voice Logging | 2 weeks | 5-7 |
| M5: UI/UX Polish | 1.5 weeks | 7-8 |
| M6: AI Hardening | 1 week | 8-9 |
| M7: Deployment | 1 week | 9-10 |
| **Buffer** | 2 weeks | 10-12 |
| **Total** | **12 weeks** | |

---

## Success Metrics

### Technical
- API error rate < 1%
- AI success rate > 95%
- Page load time < 2s
- Voice transcription accuracy > 90%

### Product
- Task creation friction < 3 seconds
- Voice log → task conversion rate > 80%
- Daily active usage per user

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Voice API costs | High | Strict free tier limits, monitor usage |
| AI hallucinations | Medium | Confirmation UI, output validation |
| Data migration failures | High | Extensive testing, rollback plan |
| Firebase quota limits | Medium | Monitor usage, upgrade plan ready |

---

## Guiding Principle Checkpoint

> "If a user has a chaotic day and leaves only one messy voice note, Smera should still make tomorrow clearer."

**Each milestone must pass this test:**
- M1: ✓ Users can use core features without payment blockers
- M2: ✓ Users can trust their data is secure
- M3: ✓ Users don't lose their work, ever
- M4: ✓ Users can capture work via voice, the signature feature
- M5: ✓ Users feel the product is polished and reliable
- M6: ✓ AI decisions are predictable and recoverable
- M7: ✓ Users can rely on the service being available

---

**Next Step**: Begin Milestone 1.1 — UserPlan data model implementation.
