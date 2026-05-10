# 📦 Installation Guide - Gemini Flash API Enhanced

## Prerequisites

- **Node.js** v18 atau lebih baru
- **npm** v9 atau lebih baru
- **Gemini API Key** dari [Google AI Studio](https://makersuite.google.com/app/apikey)

---

## Step-by-Step Installation

### 1. Clone atau Download Project

```bash
cd gemini-flash-api
```

### 2. Install Dependencies

```bash
npm install
```

Ini akan menginstall semua dependencies yang diperlukan:
- express, multer, @google/genai (core)
- express-rate-limit, helmet (security)
- node-cache, compression (performance)
- winston, winston-daily-rotate-file (logging)
- bcryptjs, jsonwebtoken (authentication)
- socket.io (real-time)
- archiver, node-schedule (backup)
- sharp (image processing)

### 3. Setup Environment Variables

```bash
# Copy example file
cp .env.example .env

# Edit .env file
nano .env  # atau gunakan text editor favorit Anda
```

**Minimal configuration:**
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
JWT_SECRET=generate_random_secret_key_here
```

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Verify Installation

```bash
# Check Node version
node --version  # Should be v18+

# Check npm version
npm --version   # Should be v9+

# List installed packages
npm list --depth=0
```

### 5. Create Required Directories

Directories akan dibuat otomatis saat server start, tapi Anda bisa membuatnya manual:

```bash
mkdir -p logs backups uploads
```

### 6. Start Server

```bash
# Production mode
npm start

# Development mode (with auto-reload)
npm run dev
```

### 7. Verify Server is Running

Open browser dan akses:
- **Main App**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **System Info**: http://localhost:3000/api/system/info

Atau gunakan curl:
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "success": true,
  "status": "healthy",
  "uptime": 12.345,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "2.0.0",
  "features": {
    "rateLimiting": true,
    "caching": true,
    "analytics": true,
    "backup": true,
    "auth": true,
    "websocket": true,
    "contextManagement": true
  }
}
```

---

## Post-Installation Setup

### 1. Create First User (Optional)

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "securepassword123"
  }'
```

Save the returned `apiKey` for future use.

### 2. Test Basic Functionality

```bash
# Test text generation
curl -X POST http://localhost:3000/generate-text \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Hello, how are you?"}'

# Test analytics
curl http://localhost:3000/api/analytics/summary?days=7

# Test cache stats
curl http://localhost:3000/api/analytics/cache
```

### 3. Setup Backup (Optional)

Backup otomatis sudah terjadwal (default: 2 AM daily).

Untuk manual backup:
```bash
curl -X POST http://localhost:3000/api/backup/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Troubleshooting

### Issue: "Cannot find module"

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: "GEMINI_API_KEY is not defined"

**Solution:**
1. Check `.env` file exists
2. Verify `GEMINI_API_KEY` is set
3. Restart server after changing `.env`

### Issue: "Port 3000 already in use"

**Solution:**
```bash
# Change port in .env
echo "PORT=3001" >> .env

# Or kill process using port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:3000 | xargs kill -9
```

### Issue: "Database locked"

**Solution:**
```bash
# Stop server
# Delete WAL files
rm chatbot.db-wal chatbot.db-shm analytics.db-wal analytics.db-shm
# Restart server
```

### Issue: "Permission denied" on logs/backups

**Solution:**
```bash
# Fix permissions
chmod -R 755 logs backups uploads
```

---

## Verification Checklist

- [ ] Node.js v18+ installed
- [ ] All dependencies installed (`npm install`)
- [ ] `.env` file created with GEMINI_API_KEY
- [ ] Server starts without errors
- [ ] Health check returns 200 OK
- [ ] Can generate text response
- [ ] Logs are being created in `logs/` folder
- [ ] WebSocket connection works
- [ ] Analytics endpoints accessible

---

## Next Steps

1. **Read Documentation**: Check `README_ENHANCED.md` for full feature list
2. **Test Endpoints**: Use Postman or curl to test all endpoints
3. **Configure Backup**: Adjust backup schedule if needed
4. **Setup Monitoring**: Check logs regularly
5. **Secure API**: Set strong JWT_SECRET and API_KEY

---

## Optional: Production Deployment

### Using PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start index.js --name gemini-api

# Auto-restart on reboot
pm2 startup
pm2 save

# Monitor
pm2 monit

# View logs
pm2 logs gemini-api
```

### Using Docker (Coming Soon)

```bash
# Build image
docker build -t gemini-api .

# Run container
docker run -d -p 3000:3000 --env-file .env gemini-api
```

---

## Support

If you encounter any issues:

1. Check logs in `logs/` folder
2. Verify environment variables
3. Check system requirements
4. Review error messages
5. Create GitHub issue with details

---

**Installation Complete! 🎉**

Your Gemini Flash API Enhanced Edition is ready to use!
