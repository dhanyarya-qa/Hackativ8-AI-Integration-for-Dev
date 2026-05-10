# ⚡ Quick Start Guide - 5 Minutes to Running

## 🎯 Goal
Get your enhanced Gemini Flash API running in 5 minutes!

---

## Step 1: Check Prerequisites (30 seconds)

```bash
# Check Node.js version (need v18+)
node --version

# Check npm version (need v9+)
npm --version
```

✅ If both commands work, you're good to go!

---

## Step 2: Install Dependencies (2 minutes)

```bash
# Navigate to project folder
cd "c:\HACKATIV8\gemini-flash-api - kiro"

# Install all dependencies
npm install
```

Wait for installation to complete...

---

## Step 3: Setup Environment (1 minute)

```bash
# Copy example env file
copy .env.example .env

# Edit .env file
notepad .env
```

**Minimal setup - just add these two:**
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
JWT_SECRET=any_random_long_string_here
```

**Generate JWT Secret (optional):**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste as JWT_SECRET.

---

## Step 4: Start Server (30 seconds)

```bash
npm start
```

You should see:
```
╔═══════════════════════════════════════════════════════════╗
║   🚀 Gemini Flash API - Enhanced Edition v2.0.0          ║
║   Server: http://localhost:3000                          ║
╚═══════════════════════════════════════════════════════════╝
```

---

## Step 5: Test It! (1 minute)

### Test 1: Health Check
Open browser: http://localhost:3000/health

Or use curl:
```bash
curl http://localhost:3000/health
```

Expected: `{"success":true,"status":"healthy",...}`

### Test 2: Generate Text
```bash
curl -X POST http://localhost:3000/generate-text ^
  -H "Content-Type: application/json" ^
  -d "{\"prompt\":\"Hello, how are you?\"}"
```

Expected: AI response in JSON format

### Test 3: Open Web UI
Open browser: http://localhost:3000

You should see the beautiful chat interface!

---

## 🎉 Success!

If all tests passed, your API is running with ALL enhanced features:

✅ Rate Limiting  
✅ Caching  
✅ Analytics  
✅ Context Management  
✅ Auto Backup  
✅ Authentication  
✅ WebSocket  
✅ Logging  
✅ Security  
✅ Compression  

---

## 🚀 Next Steps

### 1. Create Your First User
```bash
curl -X POST http://localhost:3000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"admin\",\"email\":\"admin@example.com\",\"password\":\"admin123\"}"
```

Save the returned `apiKey` and `token`!

### 2. Check Analytics
```bash
curl http://localhost:3000/api/analytics/summary?days=7
```

### 3. Test Caching
```bash
# First request (slow)
curl -X POST http://localhost:3000/generate-text ^
  -H "Content-Type: application/json" ^
  -d "{\"prompt\":\"What is AI?\"}"

# Second request (fast - cached!)
curl -X POST http://localhost:3000/generate-text ^
  -H "Content-Type: application/json" ^
  -d "{\"prompt\":\"What is AI?\"}"
```

### 4. Create Manual Backup
```bash
curl -X POST http://localhost:3000/api/backup/create ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 📚 Learn More

- **Full Features**: Read `README_ENHANCED.md`
- **API Reference**: Read `API_DOCUMENTATION.md`
- **Troubleshooting**: Read `INSTALLATION.md`

---

## 🐛 Common Issues

### Issue: "Cannot find module"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: "GEMINI_API_KEY is not defined"
Check your `.env` file has:
```env
GEMINI_API_KEY=your_key_here
```

### Issue: "Port 3000 already in use"
Change port in `.env`:
```env
PORT=3001
```

Or kill the process:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

## 💡 Pro Tips

1. **Use the Web UI**: Open http://localhost:3000 for a beautiful interface
2. **Check Logs**: Look in `logs/` folder for debugging
3. **Monitor Costs**: Check `/api/analytics/costs` regularly
4. **Use Context**: Pass `chatId` for conversation memory
5. **Cache Hits**: Identical queries return instantly

---

## 🎯 Quick Commands Reference

```bash
# Start server
npm start

# Check health
curl http://localhost:3000/health

# Generate text
curl -X POST http://localhost:3000/generate-text -H "Content-Type: application/json" -d "{\"prompt\":\"test\"}"

# Get analytics
curl http://localhost:3000/api/analytics/summary?days=7

# Register user
curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d "{\"username\":\"user\",\"email\":\"user@example.com\",\"password\":\"pass123\"}"

# Create backup
curl -X POST http://localhost:3000/api/backup/create -H "Authorization: Bearer TOKEN"
```

---

## 🎊 You're All Set!

Your Gemini Flash API Enhanced Edition is now running with:
- 🔒 Enterprise-grade security
- ⚡ Real-time capabilities
- 📊 Advanced analytics
- 💾 Automated backups
- 🧠 Smart context management
- 💰 Cost optimization

**Start building amazing AI applications!**

---

**Need help?** Check the documentation files or create an issue.

**Happy coding! 🚀**
