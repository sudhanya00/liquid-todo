# LiquidTodo — Engineering Direction & Execution Plan

**Audience**: Core developers maintaining the current LiquidTodo codebase  
**Goal**: Transition from a feature-complete prototype into a polished, production-grade product (now branded as **Smera**)  
**Scope**: Next 8–12 weeks  
**Product Type**: B2C / B2T (Solo developers)

---

## 1. Product Re-definition (Internal Alignment)

### What this product is

LiquidTodo (product name: **Smera**) is **not** a todo app.

It is:

> **An AI-powered work intake and work memory system for solo developers.**

The system's responsibility is to:

* Capture work with minimal friction (text + voice)
* Maintain an accurate execution log
* Reduce cognitive overhead
* Surface what matters *without dashboards or micromanagement*

This definition should guide all architectural, UX, and AI decisions.

---

## 2. Tiering & Entitlement Model (Must Be Implemented First)

Before expanding features, formalize **product limits and enforcement**.

### Free Tier

* Unlimited text logs
* Limited voice logs (e.g. 10 per month)
* Maximum 2 spaces
* No integrations
* No daily AI summary

### Pro Tier

* Unlimited voice logs
* Unlimited spaces
* GitHub (read-only) integration
* Calendar (read-only) integration
* Daily "What should I work on today?" AI summary
* Proactive AI nudges (later phase)

### Engineering Requirements

* Introduce a centralized **Plan / Entitlement layer**
* Enforce limits both:

  * UI-side (UX feedback)
  * Server-side (hard API enforcement)

**Deliverables**:

* `UserPlan` model
* `canPerform(action)` entitlement helper
* Middleware checks for protected API routes

---

## 3. Authentication & Identity Hardening

### Current State

* Firebase Auth (Google Sign-In)
* Development-grade configuration

### Direction

Retain Firebase Auth, but harden it for production.

#### Required Improvements

* Email + Google authentication
* Verified email enforcement
* Stable session persistence across reloads
* Graceful auth hydration (no UI flicker)
* Clear, human-readable auth error states

#### Security

* Strict Firestore security rules
* Server-side ownership enforcement
* Zero trust in client-only checks

**Deliverables**:

* Auth state machine documentation
* Production Firestore rules deployed
* Audit of unauthenticated access paths

---

## 4. Storage Architecture Cleanup

### Current State

* Tasks stored in `localStorage`
* Spaces stored in Firestore
* No cross-device sync

This is acceptable for prototyping, **not for a paid product**.

### Direction

Adopt **cloud as the source of truth**, with local caching.

#### Phase 1

* Store tasks in Firestore per space
* Use `localStorage` as cache / offline fallback
* Background sync on app load

#### Phase 2 (Later)

* Offline-first behavior
* Conflict resolution strategy
* Task versioning

**Deliverables**:

* Firestore task schema
* Migration strategy for existing local users
* Sync & consistency documentation

---

## 5. Voice Logging (Primary Feature Expansion)

Voice logging is the **signature feature** of Smera.

### MVP Scope

* Single "Log my work" voice input
* Record → transcribe → orchestrate
* One voice input can produce:

  * New tasks
  * Task updates
  * Progress notes
* User confirmation before commit

### Technical Pipeline

1. Voice capture (Web Audio API)
2. Speech-to-text (Whisper or Google STT)
3. Feed transcript to Orchestrator Agent
4. Support multi-action responses
5. Preview → Confirm → Persist

### Constraints

* No real-time streaming required initially
* No auto-commit without confirmation
* Enforce free-tier voice limits

**Deliverables**:

* `/api/voice-log` endpoint
* Transcript preview UI
* Multi-action confirmation modal

---

## 6. UI / UX Polish Pass (Non-negotiable)

To feel business-grade, the UI must be calm, predictable, and forgiving.

### Required Improvements

* Skeleton loaders instead of spinners
* Meaningful empty states
* Clear AI / network / system error states
* Keyboard-first interaction support
* Undo for destructive actions

### Visual Consistency

* Standardized spacing & typography scale
* Reduced visual noise
* Accessibility contrast checks

### AI UX Clarity

* Distinct states for:

  * AI processing
  * AI asking for clarification
  * AI decision completed

**Deliverables**:

* UI polish checklist
* Accessibility review
* Zero-layout-shift interactions

---

## 7. AI System Hardening

The AI system is conceptually strong and now needs reliability.

### Required Improvements

* Prompt versioning
* Strict output schema validation
* Confidence threshold documentation
* Retry & fallback logic
* Graceful degradation when AI fails

### Observability

* Log AI decisions (intent, confidence, outcome)
* Track misclassification events
* Internal debug mode (future)

**Deliverables**:

* AI decision logging
* Prompt version control
* Error taxonomy & handling guide

---

## 8. Deployment & Operations

### Deployment

* Vercel (or equivalent)
* Environment separation (dev / prod)
* Secrets management

### Monitoring

* Error tracking (e.g. Sentry)
* API latency monitoring
* AI failure rate tracking

### Backups

* Firestore backups enabled
* Rollback strategy documented

**Deliverables**:

* Production readiness checklist
* Basic incident response document

---

## 9. Explicitly Out of Scope (For Now)

To avoid dilution, the following are **not** to be built yet:

* Team collaboration features
* Comments & mentions
* Kanban boards
* Analytics dashboards
* Complex permissions

These come only after Smera is indispensable for solo developers.

---

## 10. Recommended Execution Order

1. Tiering & entitlement enforcement
2. Authentication & security hardening
3. Cloud task storage & sync
4. Voice logging MVP
5. UI/UX polish
6. AI reliability & observability
7. Deployment hardening

This order should not be changed.

---

## Guiding Engineering Principle

> If a user has a chaotic day and leaves only one messy voice note, Smera should still make tomorrow clearer.

Every feature, refactor, and decision should be evaluated against this principle.

---

**Status**: Approved internal direction  
**Next Step**: See [MILESTONES.md](./MILESTONES.md) for execution breakdown.
