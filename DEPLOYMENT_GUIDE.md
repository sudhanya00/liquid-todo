# Deployment Guide - Smera (LiquidTodo)

**Date**: December 23, 2025  
**Target**: Vercel Production Deployment

---

## Pre-Deployment Checklist

### ✅ Code Ready
- [x] All features complete (M1-M6)
- [x] Build passes without errors
- [x] TypeScript compilation clean
- [x] No runtime errors
- [x] AI prompts optimized
- [x] Error handling robust

### ✅ Environment Setup
- [ ] Firebase project created
- [ ] Firebase Authentication enabled (Email + Google)
- [ ] Firestore database created
- [ ] Firebase service account key generated
- [ ] Gemini API key obtained
- [ ] Environment variables documented

---

## Step 1: Firebase Setup

### 1.1 Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Name: `smera-production` (or your choice)
4. Enable Google Analytics (optional)
5. Create project

### 1.2 Enable Authentication
1. In Firebase Console → Authentication → Get Started
2. Enable **Email/Password** sign-in method
3. Enable **Google** sign-in provider
   - Add your OAuth client ID
   - Add authorized domains (will add Vercel domain later)

### 1.3 Create Firestore Database
1. In Firebase Console → Firestore Database → Create Database
2. Start in **production mode**
3. Choose location closest to your users
4. Wait for database to be provisioned

### 1.4 Set Firestore Security Rules
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

### 1.5 Get Firebase Config
1. Project Settings → General → Your apps
2. Click Web app icon (</>) to add web app
3. Register app name: "Smera Web"
4. Copy the config object - you'll need these values:
   ```javascript
   apiKey: "..."
   authDomain: "..."
   projectId: "..."
   storageBucket: "..."
   messagingSenderId: "..."
   appId: "..."
   ```

### 1.6 Generate Service Account Key (CRITICAL!)
1. Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Download JSON file
4. **⚠️ KEEP THIS SECRET!** Never commit to git
5. You'll paste this entire JSON as `FIREBASE_SERVICE_ACCOUNT_KEY` in Vercel

---

## Step 2: Gemini API Setup

### 2.1 Get API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Select project or create new one
4. Copy the API key
5. **⚠️ KEEP THIS SECRET!**

### 2.2 Test API Key (Optional)
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOUR_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

---

## Step 3: Vercel Deployment

### 3.1 Install Vercel CLI (if not installed)
```bash
npm install -g vercel
```

### 3.2 Login to Vercel
```bash
vercel login
```

### 3.3 Link Project
```bash
cd C:\venv\repos\VibeRoute\liquid-todo
vercel link
```
- Choose your account
- Link to existing project or create new one
- Project name: `smera` or your choice

### 3.4 Set Environment Variables
```bash
# Set all environment variables in Vercel
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
# Paste the value when prompted

vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID
vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
vercel env add NEXT_PUBLIC_FIREBASE_APP_ID

# Server-side secrets
vercel env add FIREBASE_SERVICE_ACCOUNT_KEY
# Paste the ENTIRE JSON object (must be valid JSON string)

vercel env add GEMINI_API_KEY
# Paste your Gemini API key

vercel env add NODE_ENV
# Enter: production
```

**Alternative: Set via Vercel Dashboard**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Settings → Environment Variables
4. Add each variable:
   - Name: `NEXT_PUBLIC_FIREBASE_API_KEY`
   - Value: (paste value)
   - Environments: Production, Preview, Development

### 3.5 Deploy to Production
```bash
vercel --prod
```

This will:
1. Build your application
2. Upload to Vercel
3. Deploy to production domain
4. Return the production URL

---

## Step 4: Post-Deployment Configuration

### 4.1 Update Firebase Authorized Domains
1. Firebase Console → Authentication → Settings → Authorized Domains
2. Add your Vercel domain(s):
   - `your-project.vercel.app`
   - Any custom domains

### 4.2 Update Google OAuth Authorized URLs
1. [Google Cloud Console](https://console.cloud.google.com/)
2. APIs & Services → Credentials
3. Find your OAuth 2.0 Client ID
4. Add Authorized redirect URIs:
   - `https://your-project.vercel.app/__/auth/handler`
   - `https://your-firebase-project.firebaseapp.com/__/auth/handler`

### 4.3 Test Production Deployment
Visit your Vercel URL and test:
- [ ] Homepage loads
- [ ] Sign up with email works
- [ ] Sign in with Google works
- [ ] Create a space
- [ ] Create a task (text)
- [ ] Create a task (voice)
- [ ] Update a task
- [ ] Complete a task
- [ ] Delete a task
- [ ] Offline mode works
- [ ] Data syncs across devices

---

## Step 5: Custom Domain (Optional)

### 5.1 Add Custom Domain
1. Vercel Dashboard → Your Project → Settings → Domains
2. Add domain: `yourdomain.com`
3. Follow DNS configuration instructions
4. Wait for DNS propagation (up to 48 hours)

### 5.2 Update Firebase & OAuth
Repeat Step 4.1 and 4.2 with your custom domain

---

## Step 6: Monitoring & Alerts

### 6.1 Set Up Vercel Analytics
1. Vercel Dashboard → Your Project → Analytics
2. Enable Web Analytics (free tier available)

### 6.2 Set Up Sentry (Recommended)
1. Sign up at [Sentry.io](https://sentry.io/)
2. Create new project → Next.js
3. Install Sentry:
   ```bash
   npm install @sentry/nextjs
   npx @sentry/wizard -i nextjs
   ```
4. Add `SENTRY_DSN` to Vercel environment variables

### 6.3 Set Up Firestore Usage Alerts
1. Firebase Console → Usage → Set up billing alerts
2. Set alert threshold (e.g., 80% of free tier)

---

## Environment Variables Reference

### Client-Side (Public - NEXT_PUBLIC_*)
| Variable | Where to Get | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Console → Project Settings | `AIzaSyC...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Console → Project Settings | `project-id.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Console → Project Settings | `project-id-123` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Console → Project Settings | `project-id.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Console → Project Settings | `123456789` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase Console → Project Settings | `1:123:web:abc` |

### Server-Side (Secret)
| Variable | Where to Get | Notes |
|----------|-------------|-------|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Firebase Console → Service Accounts → Generate Key | **CRITICAL** - Full JSON object as string |
| `GEMINI_API_KEY` | Google AI Studio | **SECRET** - Never expose to client |
| `NODE_ENV` | Manual | Set to `production` |

---

## Troubleshooting

### Build Fails
```bash
# Check locally first
npm run build

# If passes locally but fails on Vercel:
# - Check Node.js version (should be 18+)
# - Verify all dependencies in package.json
# - Check build logs in Vercel dashboard
```

### Authentication Not Working
- Verify Firebase config variables are correct
- Check authorized domains in Firebase
- Verify OAuth redirect URLs
- Check browser console for errors

### Firestore Permission Denied
- Verify security rules are correct
- Check user is authenticated
- Verify userId matches document owner

### AI Features Not Working
- Verify `GEMINI_API_KEY` is set correctly
- Check API quota in Google Cloud Console
- Verify API key has correct permissions
- Check server logs for error details

### Offline Mode Issues
- Check IndexedDB is enabled in browser
- Verify service worker is registered
- Clear browser cache and test again

---

## Security Checklist

- [ ] `FIREBASE_SERVICE_ACCOUNT_KEY` is secret (not in git)
- [ ] `GEMINI_API_KEY` is secret (not in git)
- [ ] `.env.local` is in `.gitignore`
- [ ] Firestore security rules are production-ready
- [ ] Authentication requires email verification (optional but recommended)
- [ ] Rate limiting enabled (Vercel provides this)
- [ ] HTTPS only (Vercel provides this)

---

## Scaling Considerations

### Free Tier Limits
- **Vercel**: 100GB bandwidth/month, 100 serverless function executions/day
- **Firebase Auth**: Unlimited
- **Firestore**: 1GB storage, 50K reads/day, 20K writes/day
- **Gemini API**: Check your quota at Google Cloud Console

### When to Upgrade
- Monitor usage in Vercel dashboard
- Set up alerts at 80% of free tier limits
- Plan to upgrade before hitting limits

---

## Quick Deploy Commands

```bash
# Deploy to production
vercel --prod

# Deploy preview (staging)
vercel

# Check deployment status
vercel ls

# View logs
vercel logs

# Roll back to previous deployment
vercel rollback

# Check current environment variables
vercel env ls
```

---

## Post-Launch Checklist

### Day 1
- [ ] Monitor error rates in Vercel dashboard
- [ ] Check Firebase quota usage
- [ ] Test all critical flows
- [ ] Verify AI features working
- [ ] Check offline sync

### Week 1
- [ ] Analyze user behavior (if analytics enabled)
- [ ] Review error logs
- [ ] Check API quota usage
- [ ] Collect user feedback
- [ ] Iterate on pain points

### Month 1
- [ ] Review scaling needs
- [ ] Optimize slow queries
- [ ] Update documentation
- [ ] Plan next features

---

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Firebase Docs**: https://firebase.google.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Gemini API Docs**: https://ai.google.dev/docs

---

## Success Metrics

Track these KPIs:
- User sign-ups per day
- Tasks created per user
- Voice log usage rate
- Offline sync success rate
- API error rate
- Average response time

---

**🎉 Congratulations! You're live!**

Your AI-powered task management app is now in production. Monitor closely, iterate quickly, and ship fast! 🚀

---

**Version**: 1.0  
**Last Updated**: December 23, 2025  
**Status**: Production Deployment Ready ✅
