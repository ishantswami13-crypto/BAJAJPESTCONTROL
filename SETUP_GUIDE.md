# 🚀 Bajaj Pest Control — Firebase + SendGrid + Twilio Setup Guide

> **Stack:** Express.js + Vanilla JS (not Next.js)
> All three services are **optional** — the site works without them using local JSON + Nodemailer fallbacks.

---

## 📋 What Each Service Does

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| **Firebase Firestore** | Cloud database for leads (replaces leads.json) | 1GB storage, 50K reads/day |
| **SendGrid** | Reliable email delivery (replaces Nodemailer) | 100 emails/day free forever |
| **Twilio WhatsApp** | WhatsApp alerts to admin + customer | Pay-as-you-go (~₹0.5/message) |

---

## 🔥 STEP 1: Firebase Setup (5 minutes)

### 1.1 Create Firebase Project
1. Go to **[console.firebase.google.com](https://console.firebase.google.com)**
2. Click **"Add project"**
3. Name it: `bajaj-pest-control`
4. Disable Google Analytics (optional)
5. Click **Create project**

### 1.2 Enable Firestore
1. In left sidebar → **Build → Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in production mode"**
4. Select region: **`asia-south1` (Mumbai)**
5. Click **Enable**

### 1.3 Set Firestore Security Rules
In Firestore → Rules tab, paste:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /leads/{leadId} {
      allow read, write: if false; // Server-only access via Admin SDK
    }
  }
}
```
Click **Publish**.

### 1.4 Get Service Account Key
1. Project Settings (⚙️ gear icon) → **Service accounts**
2. Click **"Generate new private key"**
3. Download the JSON file

### 1.5 Add to Environment Variables

**Option A — Paste entire JSON (recommended for Vercel):**
```bash
# Convert the downloaded JSON to a single line and add to .env:
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"bajaj-pest-control",...}
```

**Option B — Individual fields:**
```env
FIREBASE_PROJECT_ID=bajaj-pest-control
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@bajaj-pest-control.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"
```

**Add to Vercel:**
- vercel.com → bajajpestcontrol1 → Settings → Environment Variables
- Add `FIREBASE_SERVICE_ACCOUNT` (paste entire JSON as value)

---

## 📧 STEP 2: SendGrid Setup (3 minutes)

### 2.1 Create Account
1. Go to **[sendgrid.com](https://sendgrid.com)** → Sign up free
2. Verify your email

### 2.2 Get API Key
1. Settings → **API Keys**
2. Click **"Create API Key"**
3. Name: `Bajaj Pest Control`
4. Permission: **Full Access**
5. Copy the key (shown only once!)

### 2.3 Verify Sender Email
1. Settings → **Sender Authentication**
2. Click **"Verify a Single Sender"**
3. Enter: `bajajpeastcontol1@gmail.com`
4. Check email and click verify link

### 2.4 Add to Environment
```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=bajajpeastcontol1@gmail.com
```

**Add to Vercel:**
- Settings → Environment Variables → Add `SENDGRID_API_KEY`

> ⚠️ **If you don't set SendGrid**, the system automatically falls back to your Gmail SMTP (Nodemailer). No downtime.

---

## 💬 STEP 3: Twilio WhatsApp Setup (10 minutes)

### 3.1 Create Twilio Account
1. Go to **[twilio.com](https://twilio.com)** → Sign up free
2. Verify your phone number

### 3.2 Get Credentials
1. Dashboard → **Account Info** section
2. Copy:
   - **Account SID**: `ACxxxxxxxxxxxxxxxx`
   - **Auth Token**: click eye to reveal

### 3.3 Enable WhatsApp Sandbox (for testing)
1. Messaging → **Try it out → Send a WhatsApp message**
2. Follow instructions to join the sandbox:
   - Save Twilio number: **+1 415 523 8886**
   - Send WhatsApp message: `join <your-sandbox-word>`
3. You can now receive WhatsApp messages in the sandbox

### 3.4 Production WhatsApp (optional)
For production, apply for **WhatsApp Business API**:
1. Messaging → Senders → WhatsApp Senders
2. Apply with business details
3. Takes 2-7 days to approve

### 3.5 Add to Environment
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=+14155238886   # sandbox number
ADMIN_PHONE=+919818390810              # your WhatsApp number
```

**Add to Vercel:**
- Settings → Environment Variables → Add all 4 vars

> ⚠️ **If you don't set Twilio**, WhatsApp messages are silently skipped. Everything else still works.

---

## 🚀 STEP 4: Deploy to Vercel

After adding all environment variables in Vercel dashboard:

```bash
cd C:\Users\Dell\Desktop\bajaj-final
npx vercel --prod
```

Or push to GitHub and Vercel auto-deploys.

---

## ✅ Testing Checklist

After setup, test each service:

### Firebase
```bash
# Submit a form on the website, then check:
# console.firebase.google.com → Firestore → leads collection
# You should see the new lead document
```

### SendGrid
- Submit the form with a real email
- Check inbox for confirmation email
- Check spam if not in inbox
- Check SendGrid Activity Feed: app.sendgrid.com → Activity

### Twilio WhatsApp
- Make sure you've joined the sandbox (see Step 3.3)
- Submit a form
- Check WhatsApp on your phone for the admin alert
- Check the lead's phone for customer confirmation

---

## 🔄 Fallback Behavior

The system **never goes down** — it degrades gracefully:

```
Firebase available? → Save to Firestore ✅
Firebase down?      → Save to leads.json (local) ✅

SendGrid available? → Send via SendGrid ✅
SendGrid not set?   → Send via Gmail SMTP ✅
No SMTP either?     → Log warning, skip email ✅

Twilio available?   → Send WhatsApp ✅
Twilio not set?     → Log warning, skip ✅
```

---

## 💰 Cost Estimate

| Service | Free Tier | Paid |
|---------|-----------|------|
| Firebase | 50K reads + 20K writes/day | $0.06/100K reads |
| SendGrid | 100 emails/day | $19.95/month (40K emails) |
| Twilio WhatsApp | $0 (pay per message) | ~₹0.50/message |

**For 100 leads/month:** Likely **$0** total cost.

---

## 🆘 Troubleshooting

**Firebase: "Could not load the default credentials"**
→ Make sure `FIREBASE_SERVICE_ACCOUNT` or `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` are all set in Vercel.

**SendGrid: "The from address does not match a verified Sender Identity"**
→ Complete sender verification in SendGrid dashboard (Step 2.3).

**Twilio: "Channel not found"**
→ You need to join the WhatsApp sandbox first (send the join message from your phone).

**Twilio: "Invalid 'To' address"**
→ Phone numbers must include country code: `+919818390810` not `9818390810`.
