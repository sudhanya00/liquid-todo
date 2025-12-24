# 🚀 DEPLOY NOW - Quick Start Guide

**Time to go live!** Follow these steps in order:

---

## ✅ Prerequisites Checklist

Before running deployment commands, you need:

### 1. Firebase Project (15 minutes)
- [ ] Create project at https://console.firebase.google.com/
- [ ] Enable **Email/Password** authentication
- [ ] Enable **Google** authentication  
- [ ] Create **Firestore Database** (production mode)
- [ ] Copy Firebase config values (6 values starting with `NEXT_PUBLIC_`)
- [ ] Download **Service Account Key** JSON (Project Settings → Service Accounts)

### 2. Gemini API Key (2 minutes)
- [ ] Get API key from https://makersuite.google.com/app/apikey
- [ ] Copy the key

### 3. Vercel Account (2 minutes)
- [ ] Sign up at https://vercel.com/ (free tier is fine)
- [ ] Remember your login credentials

---

## 🎯 Deployment Steps

### STEP 1: Login to Vercel
```bash
vercel login
```
- Choose your login method (GitHub, GitLab, Bitbucket, Email)
- Complete authentication in browser

### STEP 2: Link Project
```bash
vercel link
```
Answer prompts:
- "Set up and deploy?" → **Yes**
- "Which scope?" → Choose your account
- "Link to existing project?" → **No** (creating new one)
- "What's your project's name?" → `smera` (or your choice)
- "In which directory is your code located?" → `./` (press Enter)

### STEP 3: Set Environment Variables

**Option A: Using CLI (Recommended)**
```bash
# Public Firebase Config (6 variables)
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
# Paste: Your Firebase API Key from step 1

vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
# Paste: your-project-id.firebaseapp.com

vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID
# Paste: your-project-id

vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
# Paste: your-project-id.appspot.com

vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
# Paste: Your sender ID (numbers)

vercel env add NEXT_PUBLIC_FIREBASE_APP_ID
# Paste: Your app ID (1:123:web:abc format)

# Server Secrets (2 variables)
vercel env add FIREBASE_SERVICE_ACCOUNT_KEY
# Paste: ENTIRE JSON from service account key file
# Example: {"type":"service_account","project_id":"..."}

vercel env add GEMINI_API_KEY
# Paste: Your Gemini API key from step 2

vercel env add NODE_ENV
# Type: production
```

**Option B: Using Vercel Dashboard**
1. Go to https://vercel.com/dashboard
2. Select your project → Settings → Environment Variables
3. Add each variable one by one
4. Set for: Production, Preview, Development

### STEP 4: Deploy to Production! 🚀
```bash
vercel --prod
```

This will:
- Build your app
- Upload to Vercel
- Deploy to production
- Give you a live URL!

**Expected output:**
```
🔍  Inspect: https://vercel.com/your-project/...
✅  Production: https://your-project.vercel.app [copied to clipboard]
```

---

## 🔧 Post-Deployment Setup

### STEP 5: Update Firebase Authorized Domains
1. Go to Firebase Console → Authentication → Settings → Authorized domains
2. Click "Add domain"
3. Add: `your-project.vercel.app` (from Step 4 output)

### STEP 6: Update Google OAuth
1. Go to https://console.cloud.google.com/
2. APIs & Services → Credentials
3. Click your OAuth 2.0 Client ID
4. Under "Authorized redirect URIs", add:
   - `https://your-project.vercel.app/__/auth/handler`
   - `https://YOUR-PROJECT-ID.firebaseapp.com/__/auth/handler`
5. Save

### STEP 7: Test Your Live App! 🎉
Visit your Vercel URL and test:
- [ ] Sign up with email
- [ ] Sign in with Google
- [ ] Create a space
- [ ] Create a task via text
- [ ] Create a task via voice
- [ ] Complete a task
- [ ] Check offline mode

---

## 📊 What to Monitor

After deployment, keep an eye on:

1. **Vercel Dashboard**: https://vercel.com/dashboard
   - Check deployment status
   - View function logs
   - Monitor bandwidth usage

2. **Firebase Console**: https://console.firebase.google.com/
   - Authentication users
   - Firestore reads/writes
   - Quota usage

3. **Google AI Studio**: https://makersuite.google.com/
   - API quota usage
   - Request counts

---

## 🆘 Quick Troubleshooting

### Build Failed
```bash
# Test locally first
npm run build

# If it works locally, check Vercel logs
vercel logs
```

### Can't Sign In
- Verify environment variables are set correctly
- Check Firebase authorized domains include your Vercel URL
- Check browser console for errors

### AI Features Not Working
- Verify `GEMINI_API_KEY` is set in Vercel
- Check API quota at Google AI Studio
- View function logs: `vercel logs`

### "Permission Denied" in Firestore
- Check Firestore security rules (see DEPLOYMENT_GUIDE.md)
- Verify user is authenticated
- Check browser console for details

---

## 🎊 You're Live!

Once Steps 1-7 are complete, your app is live and accessible worldwide!

**Next steps:**
- Share with friends/users
- Monitor usage
- Collect feedback
- Iterate quickly!

---

## 💡 Pro Tips

1. **Custom Domain**: Add in Vercel Dashboard → Settings → Domains
2. **Analytics**: Enable Vercel Analytics for free traffic insights
3. **Preview Deployments**: Just run `vercel` (without --prod) for staging
4. **Rollback**: Use `vercel rollback` if something breaks
5. **Local Testing**: Always test with `npm run dev` before deploying

---

**Questions?** See DEPLOYMENT_GUIDE.md for detailed explanations.

**Ready?** Start with Step 1! 🚀
