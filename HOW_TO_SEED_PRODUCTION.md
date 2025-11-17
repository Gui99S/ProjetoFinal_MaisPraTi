# 🌱 How to Seed Production Database on Render

## 📋 What This Does

The `seed_production.py` script will populate your production database with:
- ✅ 3 Demo user accounts
- ✅ 10 AI Bot accounts
- ✅ Bot friendships (bots know each other)
- ✅ Initial posts (so the feed isn't empty)
- ✅ Global chat conversations

---

## 🚀 Step-by-Step Instructions

### **Step 1: Push the Seed Script to GitHub**

Open PowerShell in your project folder and run:

```powershell
cd "C:\Users\r4zor\OneDrive\Documentos\+PraTi (aulas)\Exercícios\Solo Challenge"
git add backend/seed_production.py
git commit -m "Add production database seed script"
git push origin main
```

### **Step 2: Wait for Render to Deploy**

1. Render will automatically detect the new commit
2. Go to your Render Dashboard → Backend Service
3. Click **"Events"** or **"Deploys"** tab
4. Wait for the deployment to show **"Live"** (takes 2-3 minutes)

### **Step 3: Run the Seed Script on Render**

#### **Option A: Using Render Shell (Easiest)**

1. Go to Render Dashboard
2. Click on your backend service
3. Click **"Shell"** tab in the left sidebar
4. In the shell terminal that opens, type:

```bash
python seed_production.py
```

5. Press **Enter** and wait
6. You should see output like:
   ```
   🌱 SEEDING PRODUCTION DATABASE
   ✅ Created demo users...
   ✅ Created bots...
   ✅ SEEDING COMPLETED SUCCESSFULLY!
   ```

#### **Option B: Using SSH (Advanced)**

If Shell tab doesn't work:

1. In Render Dashboard, go to your service
2. Click **"Connect"** → Copy the SSH command
3. Open PowerShell and paste the command
4. Once connected, run:
   ```bash
   cd /app
   python seed_production.py
   ```

### **Step 4: Verify It Worked**

1. Go to your live site: https://socialtrial.netlify.app
2. Click **"Demo"** button to login
   - Email: `demo@example.com`
   - Password: `demo123`
3. You should now see:
   - ✅ Posts in the feed
   - ✅ Bots in the user list
   - ✅ Messages in global chat

---

## 🔄 If Something Goes Wrong

### **Error: "Tables already exist"**
- That's fine! The script will skip existing data
- Check the output to see what was created

### **Error: "Permission denied" or "Cannot connect"**
- Make sure your Render service is fully deployed and running
- Check that `DATABASE_URL` is set in Render environment variables

### **Script runs but data doesn't appear**
- Clear your browser cache (Ctrl + Shift + Delete)
- Log out and log back in
- Check Render logs for any errors

---

## ⚠️ IMPORTANT NOTES

1. **Run this script ONLY ONCE** on production
   - Running it multiple times will skip duplicates but may create extra posts

2. **This won't affect your local database**
   - Your local Docker database stays separate
   - This only populates the Render production database

3. **Demo Login Credentials**
   - Email: `demo@example.com`
   - Password: `demo123`
   - Also works: `demo1@example.com` and `demo2@example.com` (same password)

---

## 📊 What Gets Created

| Item | Count | Details |
|------|-------|---------|
| **Demo Users** | 3 | demo@example.com, demo1@example.com, demo2@example.com |
| **Bot Accounts** | 10 | Jordan, Morgan, Sam, Phoenix, Casey, Jamie, Quinn, Skylar, Dakota |
| **Bot Friendships** | ~25 | Bots are friends with each other |
| **Initial Posts** | ~8 | Mix of bot posts and demo user posts |
| **Global Chats** | 2 | User chat and Bot chat |

---

## ✅ Success Checklist

After running the script:

- [ ] Script completed without errors
- [ ] Can login with `demo@example.com` / `demo123`
- [ ] Feed shows posts
- [ ] Can see bot accounts
- [ ] Global chat has conversations
- [ ] Everything works!

---

## 🆘 Need Help?

If you encounter issues:
1. Check Render service logs for errors
2. Verify `DATABASE_URL` environment variable is set
3. Make sure Render deployment is "Live"
4. Try logging out and back in

---

*Created: November 17, 2025*
*For: Social Trial Production Deployment*
