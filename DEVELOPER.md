# LiquidTodo - Developer Documentation

## Architecture Overview

LiquidTodo is an AI-powered task management application built with Next.js, featuring a multi-agent AI system for intelligent task handling.

### Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes
- **AI**: Google Gemini 2.0 Flash (multi-agent architecture)
- **Database**: Firebase Firestore + localStorage (hybrid)
- **Authentication**: Firebase Auth

---

## Project Structure

```
liquid-todo/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/
│   │   │   ├── parse-task/    # AI task parsing endpoint
│   │   │   └── enhance-description/  # AI description enhancement
│   │   ├── space/[id]/        # Task space page
│   │   ├── login/             # Authentication
│   │   └── page.tsx           # Home/dashboard
│   ├── components/            # React components
│   │   ├── TaskInput.tsx      # AI input field
│   │   ├── TaskDetailModal.tsx # Task details with timeline
│   │   └── SpaceCard.tsx      # Space list item
│   ├── lib/                   # Core utilities
│   │   ├── agents/            # AI Agent system
│   │   │   ├── classifier.ts   # LLM-powered intent classification
│   │   │   ├── orchestrator.ts # Intent routing (uses classifier)
│   │   │   ├── creator.ts      # Task creation
│   │   │   └── updater.ts      # Task updates
│   │   ├── gemini.ts          # Gemini API client
│   │   ├── firebase.ts        # Firebase config
│   │   ├── taskMatcher.ts     # Fuzzy task matching
│   │   ├── timeUtils.ts       # Relative time formatting
│   │   └── loadingMessages.ts # Witty loading messages
│   ├── types/
│   │   └── index.ts           # TypeScript interfaces
│   └── context/
│       └── AuthContext.tsx    # Firebase auth provider
├── scripts/
│   └── test-agent-flow.ts     # AI classification test suite
└── .env.local                 # Environment variables
```

---

## Multi-Agent AI System

### Agent Architecture

```
User Input
    ↓
Classifier Agent (LLM-powered intent + vagueness scoring)
    ↓
Orchestrator Agent (Routes to appropriate agent)
    ↓
├─→ Creator Agent (CREATE intent)
├─→ Updater Agent (UPDATE intent)
├─→ Completer Agent (COMPLETE intent)
└─→ Deleter Agent (DELETE intent)
```

### 1. Classifier Agent (`classifier.ts`) - NEW

**Purpose**: LLM-powered intent classification with vagueness scoring

**Input:**
- User text
- All existing tasks
- Current date

**Output:**
```typescript
{
  intent: "create" | "update" | "complete" | "delete",
  confidence: number (0-100),
  reasoning: string,
  suggestedTaskId?: string,
  vaguenessScore: number (0-100),  // LLM-assessed vagueness
  contextQuestions?: string[],     // Questions for vague tasks
  dateQuestions?: string,          // Date clarification
  taskDetails: {
    title: string,       // Short, 3-7 words max
    description?: string, // All details here
    dueDate?: string,
    dueTime?: string,
    priority?: "low" | "medium" | "high"
  },
  suggestedImprovements?: string[] // Optional follow-up questions
}
```

**Key Features:**
- LLM-based vagueness scoring (0-100)
- Priority inference from keywords (URGENT→high, eventually→low)
- Natural language date parsing
- Short title extraction (details → description)
- Suggested improvements for task enrichment

**Vagueness Thresholds:**
- 0-30: Clear task - create immediately
- 31-60: Medium - ask for due date only
- 61-100: Vague - ask ONE combined question

### 2. Orchestrator Agent (`orchestrator.ts`)

**Purpose**: Route to appropriate agent based on classifier output

**Input:**
- User text
- All existing tasks
- Current date

**Output:**
```typescript
{
  intent: "create" | "update" | "complete" | "delete",
  reasoning: string,
  confidence: number (0-100),
  suggestedTaskId?: string,
  vaguenessScore?: number  // Passed through from classifier
}
```

**Key Features:**
- Uses Classifier Agent for LLM-powered intent detection
- Passes through vaguenessScore for follow-up decisions
- Full task context awareness

### 3. Creator Agent (`creator.ts`)

**Purpose**: Parse task creation requests

**Input:**
- User text
- Tasks context
- Current date

**Output:**
```typescript
{
  title: string,
  description?: string,
  dueDate?: string,
  dueTime?: string,
  priority?: "low" | "medium" | "high",
  missingInfo?: string
}
```

**Key Features:**
- Concise title extraction (max 3-7 words)
- Natural language date parsing
- Missing information detection

### 4. Updater Agent (`updater.ts`)

**Purpose**: Handle task updates and generate timeline entries

**Input:**
- User text
- All tasks
- Current date
- Suggested task ID (from Orchestrator)

**Output:**
```typescript
{
  taskId: string,
  updates: {
    status?: "todo" | "in-progress" | "done",
    priority?: "low" | "medium" | "high",
    dueDate?: string,
    description?: string
  },
  timeline: {
    timestamp: number,
    type: "status_change" | "note" | "field_update",
    content: string,
    field?: string,
    oldValue?: string,
    newValue?: string
  },
  missingInfo?: string
}
```

**Key Features:**
- Fuzzy task matching
- Multi-field updates
- Timeline entry generation
- Smart status change detection
- Confirmation for ambiguous completions

### 5. Description Enhancement API (`/api/enhance-description`)

**Purpose**: Enhance (not replace) existing task descriptions with new context

**Input:**
```typescript
{
  existingDescription: string;
  newContext: string;
  taskTitle: string;
}
```

**Output:**
```typescript
{
  enhancedDescription: string;
}
```

**Key Features:**
- Integrates new information naturally into existing description
- Preserves existing context
- Called on task updates and suggestion answers
- No "Polish" button (cost protection)

---

## Data Models

### Task Interface

```typescript
interface Task {
  id: string;
  spaceId: string;
  title: string;
  description?: string;
  dueDate?: string | null;
  dueTime?: string;
  priority?: "low" | "medium" | "high";
  status: "todo" | "in-progress" | "done";
  createdAt: number;
  updatedAt: number;
  updates?: TaskUpdate[];           // Activity timeline
  suggestedImprovements?: string[]; // Optional follow-up questions
}
```

### TaskUpdate Interface

```typescript
interface TaskUpdate {
  id: string;
  timestamp: number;
  type: "status_change" | "note" | "field_update";
  content: string;
  field?: string;       // For field_update type
  oldValue?: string;    // For field_update type
  newValue?: string;    // For field_update type
}
```

---

## Key Features

### 1. Activity Timeline (JIRA-like)

**Location**: `TaskDetailModal.tsx` (lines 191-266)

**Visual Design:**
- Color-coded update types:
  - ✓ Green: Status changes
  - 📝 Blue: Notes
  - ⚡ Orange: Field updates
- Timeline connector line
- Relative timestamps ("2 hours ago")
- Hover effects

### 2. Fuzzy Task Matching

**Location**: `taskMatcher.ts`

**Library**: Fuse.js

**Configuration:**
```typescript
{
  keys: [
    { name: 'title', weight: 0.7 },
    { name: 'description', weight: 0.3 }
  ],
  threshold: 0.6,
  includeScore: true
}
```

**Usage:**
```typescript
const match = findBestTaskMatch("milk", tasks);
// Matches "Get milk tomorrow" with confidence score
```

### 3. Smart Context Awareness

**How it works:**
1. Orchestrator receives ALL tasks in space
2. Fuzzy matches user input to existing tasks
3. Determines if it's a new task or update to existing
4. Routes to appropriate agent with context

**Example:**
```
User: "DI only drinks A2 milk"
Tasks: ["Get milk"]
→ Orchestrator: UPDATE intent, taskId: "milk-task-id"
→ Updater: Adds note to existing "Get milk" task
```

---

## Environment Setup

### Required Environment Variables

Create `.env.local`:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Gemini API
GEMINI_API_KEY=your_gemini_api_key
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

---

## API Routes

### POST `/api/parse-task`

**Purpose**: Parse user input and create/update tasks

**Request Body:**
```typescript
{
  text: string,
  tasks?: Task[]
}
```

**Response:**
```typescript
{
  action: "create" | "update",
  newTask?: {...},      // For CREATE
  taskId?: string,      // For UPDATE
  updates?: {...},      // For UPDATE
  timeline?: {...},     // For UPDATE
  missingInfo?: string  // If more info needed
}
```

**Flow:**
1. Call Orchestrator to classify intent
2. Route to Creator or Updater
3. Return structured response
4. Frontend updates UI

---

## Known Issues & Limitations

### 1. Firebase Auth Domain Error

**Issue**: `auth/unauthorized-domain` in development

**Fix**: Add `localhost` to Firebase Console → Authentication → Settings → Authorized domains

**Workaround**: App works without auth (uses localStorage)

### 2. Timeline Date Bug

**Issue**: First timeline entry may show due date instead of relative time

**Status**: Under investigation

**Location**: `TaskDetailModal.tsx` timeline rendering

### 3. Description vs Timeline Redundancy

**Issue**: Progress notes currently added to both description and timeline

**Planned Fix**: 
- Timeline = Raw activity log
- Description = Polished summary only
- Add Description Agent for auto-summarization

---

## Testing

### Manual Test Scenarios

1. **Task Creation**
   ```
   "Buy milk tomorrow"
   → Creates task with due date
   ```

2. **Context-Aware Update**
   ```
   Tasks: ["Get milk"]
   User: "DI only drinks A2 milk"
   → Updates existing milk task
   ```

3. **Multi-Field Update**
   ```
   "Make it high priority and mark as done"
   → Updates priority AND status
   → Generates 2 timeline entries
   ```

4. **Fuzzy Matching**
   ```
   Tasks: ["Pipeline 2 Testing"]
   User: "pipeline 2 is done"
   → Correctly identifies and updates
   ```

5. **Completion Confirmation**
   ```
   User: "completed"
   → AI asks: "Do you want to mark 'Task Name' as completed?"
   ```

---

## Performance Considerations

### Token Usage

**Current Approach**: Pass all tasks to Orchestrator

**Optimization Needed** (for large task lists):
- Pagination
- Summarization
- Vector search (Pinecone integration planned)

### Caching

**Current**: No caching

**Recommendation**: 
- Cache Gemini responses for identical inputs
- Implement request debouncing

---

## Future Enhancements

### Phase 9: AI Personality & Description Polish
- [ ] Fix timeline date bug
- [ ] Separate description from timeline
- [ ] Add Description Agent
- [ ] Conversational AI responses
- [ ] Varied questions

### Phase 10: Vector Search (Pinecone)
- [ ] Semantic task matching
- [ ] Embeddings generation
- [ ] Intelligent task retrieval

### Phase 11: Deployment
- [ ] Firebase Hosting setup
- [ ] Production build optimization
- [ ] Domain configuration

---

## Contributing

### Code Style

- TypeScript strict mode
- ESLint + Prettier
- Functional components with hooks
- Tailwind for styling

### Agent Development

When adding/modifying agents:

1. **Define clear purpose** - What does this agent do?
2. **Structured output** - Always return JSON
3. **Error handling** - Graceful fallbacks
4. **Context awareness** - Pass relevant task data
5. **Examples in prompt** - Show expected behavior

### Testing Agents

```typescript
// Test orchestrator
const result = await orchestrateIntent(
  "buy milk tomorrow",
  tasks,
  "2025-11-25"
);
console.log(result.intent); // "create"
console.log(result.confidence); // 95
```

---

## Troubleshooting

### Agent Not Responding Correctly

1. Check console for JSON parse errors
2. Verify Gemini API key is set
3. Review agent prompt for clarity
4. Add more examples to prompt

### Tasks Not Saving

1. Check localStorage quota
2. Verify Firebase connection
3. Check browser console for errors

### Timeline Not Showing

1. Verify `task.updates` array exists
2. Check timestamp format (milliseconds)
3. Inspect TaskDetailModal rendering

---

## Contact & Support

For questions or issues:
- Check implementation_plan.md for design decisions
- Review walkthrough.md for feature documentation
- See task.md for development roadmap
