# Production Deployment Checklist

## Current Status
- ✅ Local works perfectly
- ❌ Production: "client is offline" + very slow
- ❌ Google sign-in not working

## Root Cause
Production environment is likely still using cached/old Firebase config or rules aren't propagated.

## Quick Fixes to Try (in order)

### 1. Verify Firebase Authorized Domain
Go to: https://console.firebase.google.com/project/liquid-todo/authentication/settings

Under **Authorized domains**, make sure these are listed:
- `localhost`
- `liquid-todo.firebaseapp.com`
- `liquid-todo.vercel.app` ← **Add this if missing!**

### 2. Verify Firestore Rules
Go to: https://console.firebase.google.com/project/liquid-todo/firestore/rules

Make sure rules are:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /userPlans/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /spaces/{spaceId} {
      allow create: if request.auth != null && request.resource.data.ownerId == request.auth.uid;
      allow read, update, delete: if request.auth != null && resource.data.ownerId == request.auth.uid;
      
      match /tasks/{taskId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

### 3. Check Environment Variables
```powershell
vercel env ls
```

Verify all these are set for **Production**:
- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_APP_ID
- FIREBASE_SERVICE_ACCOUNT_KEY
- GEMINI_API_KEY
- NODE_ENV

### 4. Nuclear Option - Redeploy from Scratch
```powershell
# Clear everything
git add .
git commit -m "Production deployment fixes"
git push

# Redeploy
vercel --prod --force
```

### 5. Alternative: Use Preview Deployment First
```powershell
# Deploy to preview (not production)
vercel

# Test the preview URL
# If it works, then promote to production
```

---

## What's Happening?

**"Client is offline"** = Firestore can't connect, likely:
1. Service account key is wrong
2. Firestore rules are blocking
3. Network/CORS issue (unlikely since local works)

**Slowness** = Probably repeated failed Firebase connection attempts

Since local works perfectly, the issue is 100% environment configuration in production.
