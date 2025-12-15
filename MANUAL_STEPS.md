# Smera - Manual Steps & Testing Guide

**Last Updated**: December 15, 2025

This document tracks all manual steps, testing requirements, and user actions needed to move the project forward.

---

## 🎯 What You Need To Do Next

### Immediate Actions (Priority Order)

#### 1. Restart Dev Server & Retest Voice Logging
```
Time: ~5 minutes
```
The voice action parsing has been fixed. Please retest:
- [ ] Restart: `npm run dev`
- [ ] Navigate to a Space
- [ ] Click the microphone button
- [ ] Say: *"Create a task called fix the login bug with high priority"*
- [ ] Verify actions appear in preview modal (should now work!)
- [ ] Confirm the action creates the task

#### 2. Test Updated Signup Flow
```
Time: ~3 minutes
```
- [ ] Try creating a new account (or use incognito)
- [ ] Verify "Your Name" field now appears on signup
- [ ] Test that name shows correctly on the account page

#### 3. Test Name Editing on Account Page
```
Time: ~2 minutes
```
- [ ] Go to Account page (click profile icon)
- [ ] Click the pencil icon next to your name
- [ ] Edit your name and save
- [ ] Verify it updates

---

## ✅ Completed Testing (Dec 15, 2025)

### Authentication Tests
| Test Case | Status | Notes |
|-----------|--------|-------|
| Email/password sign up | ✅ | Working |
| Email/password sign in | ✅ | Working |
| Google Sign-In | ✅ | Working |
| Password reset email | ✅ | Working |
| Email verification | ✅ | Working |
| Verification banner for unverified users | ✅ | Working |

### Cloud Storage Tests
| Test Case | Status | Notes |
|-----------|--------|-------|
| Tasks save to Firestore | ✅ | Working |
| Tasks load from Firestore | ✅ | Working |
| Real-time sync between tabs | ✅ | Working - "love it!" |

### Voice Recording Tests
| Test Case | Status | Notes |
|-----------|--------|-------|
| Microphone permission request | ✅ | Working |
| Recording starts/stops correctly | ✅ | Working |
| Transcription returns text | ✅ | Working |

---

## 🔧 Issues Fixed This Session

1. **Voice action parsing not working** → Fixed prompt and JSON parsing
2. **Audio waveform static** → Fixed by calling `emitStateChange()` in level monitor  
3. **No display name field on signup** → Added "Your Name" field
4. **Can't edit name on account page** → Added pencil icon + edit mode

---

## ⚠️ Known Limitations

### Firebase Password Reset
The "Forgot Password" flow uses Firebase's built-in password reset page. This page **only asks for the new password** (no confirm field). This is a Firebase limitation - they handle the email verification and password validation internally.

**Why we can't customize it:**
- Firebase sends an email with a secure link
- The link goes to Firebase's hosted action page
- Custom password reset would require Firebase Hosting with custom action handlers

**Workaround options (future):**
1. Accept Firebase's default UI (current)
2. Deploy Firebase Hosting with custom action URL handler
3. Use Firebase Admin SDK for completely custom flow

---

## ✅ Completed Manual Steps

| Step | Date | Status |
|------|------|--------|
| Firebase CLI login (`firebase login`) | Dec 15, 2025 | ✅ Done |
| Deploy Firestore rules (`firebase deploy --only firestore:rules`) | Dec 15, 2025 | ✅ Done |

---

## ⏳ Pending Manual Steps

### Firebase Configuration

| Step | Priority | Notes |
|------|----------|-------|
| Add `localhost` to Firebase Authorized Domains | High | Firebase Console → Authentication → Settings → Authorized domains |
| Deploy Firestore indexes | Medium | `firebase deploy --only firestore:indexes` |
| Set up Firebase Hosting | Low | For production deployment |

### Environment Setup

| Step | Priority | Notes |
|------|----------|-------|
| Verify `GEMINI_API_KEY` is set in `.env.local` | High | Required for voice transcription |
| Set up production environment variables | Low | For deployment |

---

## 🧪 Testing Checklist

### Authentication (Milestone 2)

| Test Case | Status | Notes |
|-----------|--------|-------|
| Email/password sign up | ⏳ | |
| Email/password sign in | ⏳ | |
| Google Sign-In | ⏳ | |
| Password reset email | ⏳ | |
| Email verification | ⏳ | |
| Auth state persists on refresh | ⏳ | |
| Redirect to login when not authenticated | ⏳ | |
| Error messages display correctly | ⏳ | |

### Cloud Storage (Milestone 3)

| Test Case | Status | Notes |
|-----------|--------|-------|
| Tasks save to Firestore | ⏳ | |
| Tasks load from Firestore | ⏳ | |
| Real-time sync between tabs | ⏳ | |
| Migration from localStorage works | ⏳ | |
| Offline indicator shows when disconnected | ⏳ | |
| Tasks persist after page refresh | ⏳ | |

### Voice Logging (Milestone 4)

| Test Case | Status | Notes |
|-----------|--------|-------|
| Microphone permission request | ⏳ | |
| Recording starts/stops correctly | ⏳ | |
| Audio level visualization works | ⏳ | |
| Transcription returns text | ⏳ | |
| Single action parsing (create) | ⏳ | |
| Single action parsing (update) | ⏳ | |
| Single action parsing (complete) | ⏳ | |
| Multi-action parsing | ⏳ | |
| Preview modal shows actions | ⏳ | |
| Action removal works | ⏳ | |
| Confirm executes actions | ⏳ | |

### Entitlements (Milestone 1)

| Test Case | Status | Notes |
|-----------|--------|-------|
| Free user limited to 2 spaces | ⏳ | |
| Upgrade prompt appears at limit | ⏳ | |
| Quota display shows usage | ⏳ | |

---

## 🔧 Commands Reference

### Development
```powershell
# Start dev server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint
```

### Firebase
```powershell
# Login to Firebase
firebase login

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes

# Deploy everything
firebase deploy

# View Firebase logs
firebase functions:log
```

### Testing Voice Logs
Example voice commands to test:
- *"Create a task called review pull request"*
- *"Mark the auth task as done"*
- *"Set the database migration to high priority"*
- *"I finished the login bug, and I need to start working on the dashboard tomorrow"*

---

## 🐛 Known Issues to Watch For

1. **Auth on localhost** - May need to add localhost to Firebase authorized domains
2. **Voice in Safari** - MediaRecorder API may behave differently
3. **First load migration** - Watch for localStorage → Firestore migration on first cloud load

---

## 📋 Browser Compatibility

| Browser | Auth | Voice | Storage |
|---------|------|-------|---------|
| Chrome | ✅ | ✅ | ✅ |
| Firefox | ✅ | ✅ | ✅ |
| Safari | ✅ | ⚠️ Test | ✅ |
| Edge | ✅ | ✅ | ✅ |

---

## 🚀 When Ready for Production

1. [ ] All tests pass
2. [ ] Firebase Hosting configured
3. [ ] Production environment variables set
4. [ ] Custom domain configured (optional)
5. [ ] SSL certificate active
6. [ ] Error monitoring set up (optional)
