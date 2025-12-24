# 🔧 FIX: Environment Variables Have Line Breaks

## Problem
Your Firebase environment variables have hidden line breaks (`%0D%0A`) causing the "Illegal url for new iframe" error.

## Solution: Reset Environment Variables via Vercel Dashboard

### Step 1: Delete All Firebase Variables
1. Go to [Vercel Dashboard](https://vercel.com/sudhanyas-projects/liquid-todo/settings/environment-variables)
2. Delete these variables (click trash icon for each):
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`

### Step 2: Add Variables Correctly (Copy-Paste Carefully)

**IMPORTANT**: Copy each value as a SINGLE LINE with NO line breaks!

Add each variable one by one in Vercel Dashboard:

#### Variable 1: NEXT_PUBLIC_FIREBASE_API_KEY
- **Name**: `NEXT_PUBLIC_FIREBASE_API_KEY`
- **Value**: `AIzaSyChRz8vs9KoBtGs1YRItewpsu-X8xTpZyc`
- **Environments**: Production, Preview, Development
- Click **Save**

#### Variable 2: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- **Name**: `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- **Value**: `smera-production-ecf6c.firebaseapp.com`
- **Environments**: Production, Preview, Development
- Click **Save**

#### Variable 3: NEXT_PUBLIC_FIREBASE_PROJECT_ID
- **Name**: `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- **Value**: `smera-production-ecf6c`
- **Environments**: Production, Preview, Development
- Click **Save**

#### Variable 4: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- **Name**: `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- **Value**: `smera-production-ecf6c.firebasestorage.app`
- **Environments**: Production, Preview, Development
- Click **Save**

#### Variable 5: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- **Name**: `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- **Value**: `783128286162`
- **Environments**: Production, Preview, Development
- Click **Save**

#### Variable 6: NEXT_PUBLIC_FIREBASE_APP_ID
- **Name**: `NEXT_PUBLIC_FIREBASE_APP_ID`
- **Value**: `1:783128286162:web:dc05557e8755b376092e0b`
- **Environments**: Production, Preview, Development
- Click **Save**

### Step 3: Verify (Keep these as-is)
These should already be correct:
- `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON)
- `GEMINI_API_KEY`
- `NODE_ENV`

### Step 4: Redeploy
After updating all variables, run:
```bash
vercel --prod
```

---

## Quick Fix Commands (Alternative)

If you prefer CLI, paste each command one at a time:

```powershell
# First, remove all existing variables
vercel env rm NEXT_PUBLIC_FIREBASE_API_KEY production
vercel env rm NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production
vercel env rm NEXT_PUBLIC_FIREBASE_PROJECT_ID production
vercel env rm NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET production
vercel env rm NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID production
vercel env rm NEXT_PUBLIC_FIREBASE_APP_ID production

# Then add them back correctly (paste value when prompted)
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
# Paste: AIzaSyChRz8vs9KoBtGs1YRItewpsu-X8xTpZyc

vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production
# Paste: smera-production-ecf6c.firebaseapp.com

vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production
# Paste: smera-production-ecf6c

vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET production
# Paste: smera-production-ecf6c.firebasestorage.app

vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID production
# Paste: 783128286162

vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production
# Paste: 1:783128286162:web:dc05557e8755b376092e0b
```

---

**Root Cause**: The `echo` command in PowerShell adds line breaks. Using Vercel Dashboard or manual CLI input avoids this.
