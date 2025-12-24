# 🔥 URGENT: Fix Firestore Security Rules

## Problem
Firestore is reporting "client is offline" which means security rules are blocking all access.

## Solution

### Go to Firebase Console - Security Rules
1. Open: https://console.firebase.google.com/project/liquid-todo/firestore/rules
2. Replace the rules with this:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User data - owner only
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Spaces - owner only  
    match /spaces/{spaceId} {
      allow read, write: if request.auth != null && 
                            request.auth.uid == resource.data.userId;
      
      // Tasks within spaces
      match /tasks/{taskId} {
        allow read, write: if request.auth != null && 
                              request.auth.uid == get(/databases/$(database)/documents/spaces/$(spaceId)).data.userId;
      }
    }
  }
}
```

3. Click **"Publish"**

### Temporary Fix (if you need to test NOW)

For testing only, you can temporarily use these permissive rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**⚠️ WARNING**: These rules allow any authenticated user to access all data. Only use for testing, then replace with the secure rules above!

### After Publishing Rules

Wait 30 seconds, then test again at https://liquid-todo.vercel.app

The "client is offline" error should disappear!
