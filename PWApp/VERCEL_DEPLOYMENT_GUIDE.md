# Vercel Deployment Guide - Weather Potato PWA

Complete step-by-step guide to deploy your PWA to Vercel via GitHub from VSCode.

## Prerequisites

- GitHub account
- Vercel account (free tier is fine)
- Git installed locally
- VSCode with the project open

---

## Part 1: Prepare Your Project

### Step 1: Create .gitignore (if not exists)

The PWApp folder already has a `.gitignore`. Verify it contains:

```
node_modules
dist
dist-ssr
*.local
.env
.env.local
```

### Step 2: Create Vercel Configuration

Create a new file in the **root** of your Weather_Potato project:

**File**: `/home/valentin/Documents/PlatformIO/Projects/Weather_Potato/vercel.json`

```json
{
  "buildCommand": "cd PWApp && npm install && npm run build",
  "outputDirectory": "PWApp/dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## Part 2: Initialize Git Repository

### Step 3: Open Terminal in VSCode

1. In VSCode, press **Ctrl+`** (backtick) to open integrated terminal
2. Make sure you're in the project root:
   ```bash
   cd /home/valentin/Documents/PlatformIO/Projects/Weather_Potato
   ```

### Step 4: Check Git Status

```bash
git status
```

You should see that the repo already exists (you have a `.git` folder).

### Step 5: Add PWApp Files to Git

```bash
# Add all PWApp files
git add PWApp/

# Check what will be committed
git status
```

### Step 6: Commit the PWA

```bash
git commit -m "Add Weather Potato PWA with BLE support and Android WiFi sharing"
```

---

## Part 3: Push to GitHub

### Step 7: Create GitHub Repository

**Option A: Via GitHub Website**
1. Go to https://github.com
2. Click the **+** icon (top right) → "New repository"
3. Repository name: `weather-potato`
4. Description: "Weather Potato IoT device PWA with BLE onboarding"
5. Make it **Public** (required for Vercel free tier)
6. **DO NOT** initialize with README (we already have code)
7. Click "Create repository"

**Option B: Via GitHub CLI (if installed)**
```bash
gh repo create weather-potato --public --source=. --remote=origin
```

### Step 8: Link Local Repo to GitHub

If you created via website, GitHub will show you commands like:

```bash
git remote add origin https://github.com/YOUR_USERNAME/weather-potato.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

**Example:**
```bash
git remote add origin https://github.com/valentin/weather-potato.git
git branch -M main
git push -u origin main
```

### Step 9: Verify on GitHub

Go to your repository URL and verify all files are there:
- `PWApp/` folder with all the PWA files
- `src/` folder with the firmware
- `vercel.json` in the root

---

## Part 4: Deploy to Vercel

### Step 10: Sign Up / Login to Vercel

1. Go to https://vercel.com
2. Click "Sign Up" (or "Login")
3. Choose "Continue with GitHub"
4. Authorize Vercel to access your GitHub account

### Step 11: Import Project

1. On Vercel dashboard, click **"Add New..."** → "Project"
2. You'll see a list of your GitHub repositories
3. Find `weather-potato` and click **"Import"**

### Step 12: Configure Project

Vercel will auto-detect Vite, but let's verify settings:

**Framework Preset**: Vite
**Root Directory**: `PWApp` (Click "Edit" to change if needed)
**Build Command**: `npm run build`
**Output Directory**: `dist`
**Install Command**: `npm install`

Click **"Deploy"**

### Step 13: Wait for Deployment

Vercel will:
1. Clone your repo
2. Install dependencies
3. Build the project
4. Deploy to their CDN

This takes ~2-3 minutes.

### Step 14: Get Your URL

Once deployed, you'll see:
- ✅ **Production URL**: Something like `https://weather-potato-xyz.vercel.app`
- This is your live PWA!

---

## Part 5: Configure Custom Domain (Optional)

### Step 15: Add Custom Domain

If you own a domain like `weatherpotato.com`:

1. Go to your Vercel project → **Settings** → **Domains**
2. Add domain: `app.weatherpotato.com`
3. Vercel will show DNS records to add
4. Add these records in your domain registrar (GoDaddy, Namecheap, etc.)
5. Wait for DNS propagation (~10 minutes to 24 hours)

**Recommended DNS Setup:**
```
Type: CNAME
Name: app
Value: cname.vercel-dns.com
```

---

## Part 6: Test Your PWA

### Step 16: Test on Mobile

1. Open your Vercel URL on your phone: `https://weather-potato-xyz.vercel.app`
2. Test BLE connection (Chrome/Edge on Android)
3. Try Android WiFi sharing
4. Install as PWA (Menu → "Add to Home screen")

### Step 17: Generate Device QR Codes

Create QR codes for your Weather Potato devices:

**Format**: `https://weather-potato-xyz.vercel.app/?device=AABBCCDD`

Where `AABBCCDD` is the device ID (from MAC address).

**Tools to generate QR codes:**
- https://qr-code-generator.com
- https://www.qrcode-monkey.com
- Use a library like `qrcode` in Node.js

---

## Part 7: Continuous Deployment

### Step 18: Automatic Deploys

Now whenever you push to GitHub, Vercel automatically deploys!

```bash
# Make changes to your PWA
cd PWApp
# Edit files...

# Commit and push
git add .
git commit -m "Update PWA feature"
git push

# Vercel automatically deploys within 2-3 minutes!
```

### Step 19: Production vs Preview

- **Main branch** → Production URL (`weather-potato-xyz.vercel.app`)
- **Other branches** → Preview URLs (for testing)

**Create a dev branch:**
```bash
git checkout -b dev
# Make changes
git push origin dev
```

Vercel creates a preview URL for the `dev` branch!

---

## Part 8: Environment Variables (If Needed Later)

### Step 20: Add Env Variables

If you need API keys or secrets:

1. Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
2. Add variables:
   - Name: `VITE_API_KEY`
   - Value: `your-api-key`
   - Environments: Production, Preview, Development
3. Redeploy for changes to take effect

---

## Troubleshooting

### Build Fails on Vercel

**Check build logs:**
1. Go to Deployments tab
2. Click the failed deployment
3. Check the build logs

**Common issues:**
- Missing dependencies: Check `package.json`
- TypeScript errors: Fix in local VSCode first
- Path issues: Verify `vercel.json` has correct paths

### Fix Locally First

```bash
cd PWApp
npm install
npm run build

# If this succeeds locally, commit and push
git add .
git commit -m "Fix build errors"
git push
```

### Can't Connect to BLE

- HTTPS is required for BLE (Vercel provides HTTPS automatically ✅)
- Use Chrome/Edge on Android
- Check browser console for errors

### Android WiFi Share Not Working

- PWA must be installed (not just opened in browser)
- Android 10+ required
- Try manually sharing from Android Settings

---

## Useful Commands Reference

### VSCode Terminal Commands

```bash
# Check current directory
pwd

# Navigate to project root
cd /home/valentin/Documents/PlatformIO/Projects/Weather_Potato

# Check git status
git status

# Add all changes
git add .

# Commit changes
git commit -m "Your commit message"

# Push to GitHub
git push

# Pull latest changes
git pull

# Create new branch
git checkout -b feature-name

# Switch branches
git checkout main

# View commit history
git log --oneline
```

### Vercel CLI (Optional)

Install Vercel CLI for local testing:

```bash
npm install -g vercel

# Deploy from terminal
cd /home/valentin/Documents/PlatformIO/Projects/Weather_Potato/PWApp
vercel

# Deploy to production
vercel --prod
```

---

## Summary Checklist

- ✅ Created `vercel.json` in project root
- ✅ Committed PWApp files to git
- ✅ Created GitHub repository
- ✅ Pushed code to GitHub
- ✅ Connected Vercel to GitHub
- ✅ Deployed to Vercel
- ✅ Got production URL
- ✅ Tested PWA on mobile
- ✅ (Optional) Configured custom domain

---

## Next Steps

1. **Test the full flow** with a real ESP32:
   - Flash the BLE firmware
   - Scan device QR code with phone
   - Complete onboarding via PWA

2. **Generate QR codes** for each device:
   - Format: `https://your-app.vercel.app/?device=AABBCCDD`
   - Print and stick on each Weather Potato

3. **Monitor deployments** in Vercel dashboard

4. **Add EEPROM support** to firmware (TODO)

---

## Resources

- **Vercel Docs**: https://vercel.com/docs
- **Vite Docs**: https://vitejs.dev/guide/
- **GitHub Docs**: https://docs.github.com
- **Web Bluetooth API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API

---

**Your PWA is now live! 🎉🥔**

Access it at: `https://your-project-name.vercel.app`
