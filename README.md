# LiquidTodo - AI-Powered Task Management

An intelligent task management app that understands natural language and provides JIRA-like activity tracking.

## Features

### 🤖 AI-Powered Task Creation
Just type naturally - the AI understands what you mean:
- "Buy milk tomorrow" → Creates task with due date
- "High priority meeting with John next Tuesday at 3pm" → Sets priority, date, and time
- "Remind me to call mom" → Creates reminder task
- "URGENT: fix the production bug" → Automatically sets high priority

### 🧠 LLM-Powered Intent Classification
The AI uses Gemini 3.0 Flash to understand your intent:
- **CREATE**: "buy groceries tomorrow" → Creates new task
- **UPDATE**: "add note to groceries" → Updates existing task
- **COMPLETE**: "groceries is done" → Marks task complete
- **Priority inference**: "urgent", "ASAP" → high | "eventually", "when free" → low
- **Date parsing**: "friday", "next week", "Dec 25" → Proper dates

### 💡 Smart Follow-up Questions
The AI asks smart questions only when needed:
- Clear tasks are created immediately
- Vague tasks get ONE combined question (not multiple rounds)
- Suggested improvements stored for optional enrichment later

### 🎯 Smart Context Awareness
The AI remembers your tasks and updates them intelligently:
- "DI only drinks A2 milk" → Adds note to existing "Get milk" task
- "Pipeline 2 is done" → Marks the correct pipeline task as complete
- "Make it high priority" → Updates the most recent task

### 📋 Activity Timeline
JIRA-like activity feed for every task:
- ✓ Status changes (green)
- 📝 Progress notes (blue)
- ⚡ Field updates (orange)
- Relative timestamps ("2 hours ago")

### 🔍 Fuzzy Task Matching
The AI finds the right task even with partial names:
- "milk" → Finds "Get milk tomorrow"
- "agent 1" → Finds "Development of Agent 1"
- "pipeline 2" → Finds "Pipeline 2 Testing"

---

## Quick Start

### Prerequisites
- Node.js 18+
- Firebase account
- Google Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd liquid-todo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create `.env.local`:
   ```bash
   # Firebase
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

   # Gemini API
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

---

## Usage Guide

### Creating Tasks

Simply type what you need to do:

```
"Buy groceries tomorrow"
"Meeting with team next Monday at 2pm"
"High priority: Fix production bug"
```

The AI will:
- Extract the task title
- Detect due dates and times
- Set priority if mentioned
- Ask for missing information

### Updating Tasks

Add progress notes or change task details:

```
"Completed the database setup"
"Make it high priority"
"Change deadline to Friday"
"Mark as done"
```

The AI will:
- Find the correct task (even with partial names)
- Update the relevant fields
- Add entries to the activity timeline
- Ask for confirmation when ambiguous

### Viewing Task History

Click any task to see:
- Full task details
- Activity timeline with all changes
- When each update was made
- Who changed what

---

## Example Workflows

### Project Management

```
You: "Development of Agent 1"
AI: Creates task

You: "Completed the embedding setup"
AI: Adds note to timeline

You: "Make it high priority"
AI: Updates priority, adds to timeline

You: "Agent 1 is done"
AI: Marks as complete
```

### Shopping List

```
You: "Buy milk tomorrow"
AI: Creates task with due date

You: "DI only drinks A2 milk"
AI: Adds note to existing milk task

You: "Also get eggs and bread"
AI: Creates new task or updates existing
```

### Team Coordination

```
You: "Pipeline 2 testing"
AI: Creates task

You: "Pipeline 2 is done"
AI: Marks correct pipeline as complete

You: "Start pipeline 3"
AI: Creates new task
```

---

## Features in Detail

### Multi-Agent AI System

LiquidTodo uses a sophisticated multi-agent architecture:

1. **Orchestrator** - Classifies your intent
2. **Creator** - Handles new task creation
3. **Updater** - Manages task updates
4. **Timeline Generator** - Creates activity entries

### Smart Features

- **Fuzzy Matching**: Finds tasks even with typos or partial names
- **Context Awareness**: Remembers all your tasks
- **Confidence Scoring**: AI knows when to ask for clarification
- **Multi-Field Updates**: Change multiple things at once
- **Natural Language**: No rigid commands needed

### Data Storage

- **Primary**: localStorage (instant, offline-capable)
- **Backup**: Firebase Firestore (cloud sync)
- **Hybrid**: Best of both worlds

---

## Keyboard Shortcuts

- `Enter` - Submit task/update
- `Esc` - Close task detail modal
- Click task - Open details

---

## Known Issues

### Firebase Auth Error

**Issue**: `auth/unauthorized-domain` in development

**Fix**: 
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Authentication → Settings → Authorized domains
4. Add `localhost`

**Workaround**: App works without authentication using localStorage

---

## Tips & Tricks

### Be Natural
Don't overthink it - just type what you're thinking:
- ✅ "Buy milk tomorrow"
- ❌ "CREATE TASK: milk DUE: 2025-11-26"

### Use Task Names
Reference tasks by name for updates:
- "Pipeline 2 is done"
- "Make the milk task high priority"

### Ask for Confirmation
If unsure, the AI will ask:
- You: "completed"
- AI: "Do you want to mark 'Task Name' as completed?"

### Check the Timeline
Every change is logged - click a task to see full history

---

## Troubleshooting

### Tasks Not Saving
- Check browser console for errors
- Verify localStorage isn't full
- Check Firebase connection

### AI Not Understanding
- Be more specific
- Use task names for updates
- Check if Gemini API key is set

### Timeline Not Showing
- Refresh the page
- Check if task has updates
- Verify task detail modal opens

---

## Development

See [DEVELOPER.md](./DEVELOPER.md) for:
- Architecture details
- Agent system documentation
- API reference
- Contributing guidelines

---

## Roadmap

### Current (Phase 9)
- [ ] Fix timeline date bug
- [ ] Separate description from timeline
- [ ] Add Description Agent
- [ ] Improve AI personality

### Future
- [ ] Vector search (Pinecone)
- [ ] Collaborative spaces
- [ ] Mobile app
- [ ] Voice input
- [ ] Integrations (Slack, Email)

---

## Tech Stack

- **Frontend**: Next.js 16, React, TypeScript, Tailwind CSS
- **AI**: Google Gemini API
- **Database**: Firebase Firestore + localStorage
- **Deployment**: Vercel (planned)

---

## License

MIT

---

## Support

For issues or questions:
- Check [DEVELOPER.md](./DEVELOPER.md)
- Review [PROGRESS.md](./PROGRESS.md)
- Open an issue on GitHub

---

**Built with ❤️ using AI**
