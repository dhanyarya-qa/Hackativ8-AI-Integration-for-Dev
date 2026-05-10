# 🚀 Gemini Flash API - Enhanced Edition

## ✨ Fitur Baru yang Ditambahkan

### 1. **Rate Limiting & Security** 🔒
- Rate limiting untuk semua endpoint API
- Limiter khusus untuk AI generation (10 req/min)
- Upload limiter (20 uploads/15 min)
- Auth limiter untuk login (5 attempts/15 min)
- Helmet security headers
- Input sanitization otomatis
- Content moderation filter

### 2. **Caching System** 💾
- In-memory caching dengan Node-Cache
- Cache untuk response AI yang sama
- Auto-expiry setelah 1 jam
- Cache statistics endpoint
- Manual cache clearing

### 3. **Advanced Analytics** 📊
- Token usage tracking per model
- Cost estimation per request
- Response time metrics
- Popular queries tracking
- User activity logging
- Database: `analytics.db`

### 4. **Context Management** 🧠
- Conversation history context
- Smart token counting
- Context optimization
- Query complexity analysis
- Auto model suggestion based on complexity
- Max 10 messages history dengan 30K tokens limit

### 5. **Automated Backup** 💿
- Scheduled daily backups (2 AM)
- Manual backup trigger
- Keeps last 30 backups
- Compressed ZIP format
- Includes database + .env
- Backup management API

### 6. **Authentication System** 🔐
- User registration & login
- JWT token authentication
- API key per user
- Session management
- Role-based access (user/admin)
- Password hashing dengan bcrypt

### 7. **WebSocket Real-time** ⚡
- Real-time chat updates
- Typing indicators
- User presence tracking
- Live notifications
- Multi-user collaboration
- Broadcast messages

### 8. **Logging System** 📝
- Winston logger dengan daily rotation
- Separate error logs
- Request/response logging
- Performance tracking
- Log retention (14 days)

### 9. **Compression** 🗜️
- Response compression dengan gzip
- Reduced bandwidth usage
- Faster response times

### 10. **Enhanced Error Handling** ⚠️
- Detailed error messages
- Error tracking in analytics
- Retry mechanism dengan exponential backoff
- Graceful degradation

---

## 📁 Struktur Folder Baru

```
gemini-flash-api/
├── config/
│   └── config.js              # Centralized configuration
├── middleware/
│   ├── rateLimiter.js         # Rate limiting
│   ├── cache.js               # Caching middleware
│   ├── logger.js              # Winston logger
│   └── security.js            # Security middleware
├── services/
│   ├── analytics.js           # Analytics tracking
│   ├── contextManager.js      # Context management
│   ├── backup.js              # Backup service
│   ├── auth.js                # Authentication
│   └── websocket.js           # WebSocket server
├── routes/
│   ├── analytics.routes.js    # Analytics endpoints
│   ├── backup.routes.js       # Backup endpoints
│   └── auth.routes.js         # Auth endpoints
├── utils/
│   └── helpers.js             # Utility functions
├── logs/                      # Log files (auto-created)
├── backups/                   # Database backups (auto-created)
├── public/                    # Frontend files
├── uploads/                   # Temporary uploads
├── chatbot.db                 # Main database
├── analytics.db               # Analytics database
├── auth.db                    # Auth database
├── index.js                   # Main server (enhanced)
└── package.json
```

---

## 🔧 Environment Variables

Update your `.env` file:

```env
# API Keys
GEMINI_API_KEY=your_gemini_api_key_here

# Server
PORT=3000
NODE_ENV=development

# Security
JWT_SECRET=your_super_secret_jwt_key_change_this
API_KEY=your_optional_api_key_for_external_access

# Logging
LOG_LEVEL=info
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
```bash
cp .env.example .env
# Edit .env dengan API keys Anda
```

### 3. Start Server
```bash
npm start
```

Server akan berjalan di `http://localhost:3000`

---

## 📡 API Endpoints Baru

### **Analytics Endpoints**

#### Get Analytics Summary
```http
GET /api/analytics/summary?days=7
```

Response:
```json
{
  "success": true,
  "data": {
    "period": "Last 7 days",
    "tokenUsage": [...],
    "responseMetrics": [...],
    "popularQueries": [...],
    "userActivity": [...]
  }
}
```

#### Get Cost Summary
```http
GET /api/analytics/costs?days=30
```

#### Get Cache Stats
```http
GET /api/analytics/cache
```

#### Clear Cache
```http
POST /api/analytics/cache/clear
```

---

### **Backup Endpoints**

#### Create Manual Backup
```http
POST /api/backup/create
Authorization: Bearer <token>
```

#### List All Backups
```http
GET /api/backup/list
Authorization: Bearer <token>
```

#### Download Backup
```http
GET /api/backup/download/:filename
Authorization: Bearer <token>
```

---

### **Authentication Endpoints**

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

Response:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "username": "john_doe",
    "email": "john@example.com",
    "apiKey": "gsk_xxxxxxxxxxxxx"
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

Response:
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "user",
    "apiKey": "gsk_xxxxxxxxxxxxx"
  }
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

---

### **Enhanced Existing Endpoints**

#### Generate Text (Enhanced)
```http
POST /generate-text
Content-Type: application/json

{
  "prompt": "Jelaskan tentang AI",
  "chatId": 123  // Optional: untuk context
}
```

Response:
```json
{
  "success": true,
  "data": {
    "answer": "AI adalah...",
    "complexity": "medium",
    "modelUsed": "gemini-2.5-flash",
    "modelSuggestion": null
  },
  "meta": {
    "responseTime": "1234ms"
  },
  "cached": false
}
```

#### Streaming with Context
```http
POST /api/stream
Content-Type: application/json

{
  "prompt": "Lanjutkan cerita...",
  "chatId": 123
}
```

---

## 🔐 Authentication Methods

### 1. JWT Token (Recommended)
```http
Authorization: Bearer <jwt_token>
```

### 2. API Key
```http
X-API-Key: gsk_xxxxxxxxxxxxx
```

---

## 📊 Analytics Dashboard

### Token Usage Tracking
- Tracks prompt tokens & completion tokens
- Estimates cost per request
- Per-model breakdown
- Daily/weekly/monthly reports

### Response Metrics
- Average response time per endpoint
- Success/error rates
- Performance bottlenecks

### Popular Queries
- Most asked questions
- Query patterns
- User behavior insights

---

## 🔄 Context Management

### How It Works
1. **History Tracking**: Menyimpan 10 pesan terakhir
2. **Token Counting**: Estimasi token untuk optimasi
3. **Smart Context**: Hanya kirim context yang relevan
4. **Auto Summarization**: Ringkas percakapan lama (coming soon)

### Query Complexity Analysis
- **Simple**: Short queries, basic questions
- **Medium**: Code snippets, multiple questions
- **Complex**: Long analysis, complex reasoning

### Auto Model Suggestion
- Simple → `gemini-2.0-flash-lite` (hemat biaya)
- Medium → `gemini-2.5-flash` (balanced)
- Complex → `gemini-2.5-pro` (powerful)

---

## 💾 Backup System

### Automatic Backups
- Scheduled daily at 2 AM
- Keeps last 30 backups
- Auto-cleanup old backups

### Manual Backups
```bash
curl -X POST http://localhost:3000/api/backup/create \
  -H "Authorization: Bearer <token>"
```

### Backup Contents
- `chatbot.db` - Main database
- `analytics.db` - Analytics data
- `.env` - Environment variables

---

## ⚡ WebSocket Events

### Client → Server

```javascript
// Join chat
socket.emit('user:join', {
  userId: 'user123',
  username: 'John',
  chatId: 'chat456'
});

// Start typing
socket.emit('typing:start', {
  chatId: 'chat456',
  username: 'John'
});

// Send message
socket.emit('message:send', {
  chatId: 'chat456',
  message: { ... }
});
```

### Server → Client

```javascript
// User joined
socket.on('user:joined', (data) => {
  console.log(`${data.username} joined`);
});

// User typing
socket.on('user:typing', (data) => {
  console.log(`${data.username} is typing...`);
});

// New message
socket.on('message:new', (data) => {
  console.log('New message:', data);
});
```

---

## 🛡️ Security Features

### Rate Limiting
- General API: 100 req/15min
- AI Generation: 10 req/min
- Upload: 20 uploads/15min
- Auth: 5 attempts/15min

### Input Sanitization
- XSS prevention
- Script tag removal
- SQL injection protection

### Content Moderation
- Blocked keywords filter
- Inappropriate content detection

### Security Headers
- Helmet.js integration
- CSP policies
- XSS protection
- CSRF protection

---

## 📈 Performance Optimizations

### Caching
- Response caching untuk query yang sama
- 1 hour TTL
- Automatic cache invalidation

### Compression
- Gzip compression
- Reduced bandwidth by ~70%

### Database Optimization
- WAL mode untuk better concurrency
- Indexed queries
- Connection pooling

---

## 🔍 Monitoring & Debugging

### Logs Location
```
logs/
├── app-2024-01-15.log      # All logs
└── error-2024-01-15.log    # Error logs only
```

### Log Levels
- `error`: Critical errors
- `warn`: Warnings
- `info`: General info
- `debug`: Debug info

### View Logs
```bash
# Tail all logs
tail -f logs/app-*.log

# Tail errors only
tail -f logs/error-*.log
```

---

## 🧪 Testing

### Test Analytics
```bash
curl http://localhost:3000/api/analytics/summary?days=7
```

### Test Cache
```bash
# First request (cache miss)
curl -X POST http://localhost:3000/generate-text \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Hello"}'

# Second request (cache hit)
curl -X POST http://localhost:3000/generate-text \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Hello"}'
```

### Test Backup
```bash
curl -X POST http://localhost:3000/api/backup/create \
  -H "Authorization: Bearer <token>"
```

---

## 📦 Dependencies Added

```json
{
  "express-rate-limit": "Rate limiting",
  "node-cache": "In-memory caching",
  "compression": "Response compression",
  "helmet": "Security headers",
  "winston": "Logging",
  "winston-daily-rotate-file": "Log rotation",
  "node-schedule": "Task scheduling",
  "archiver": "Backup compression",
  "bcryptjs": "Password hashing",
  "jsonwebtoken": "JWT authentication",
  "socket.io": "WebSocket",
  "sharp": "Image optimization",
  "uuid": "Unique ID generation"
}
```

---

## 🎯 Roadmap

### Phase 1 ✅ (Completed)
- [x] Rate limiting
- [x] Caching
- [x] Analytics
- [x] Context management
- [x] Backup system
- [x] Authentication
- [x] WebSocket
- [x] Logging

### Phase 2 🚧 (In Progress)
- [ ] Code execution sandbox
- [ ] Plugin system
- [ ] Advanced analytics dashboard UI
- [ ] Multi-language support
- [ ] Voice cloning integration

### Phase 3 📋 (Planned)
- [ ] Mobile app (PWA)
- [ ] Cloud storage integration (S3)
- [ ] Webhook system
- [ ] Slack/Discord bot
- [ ] Email notifications

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📄 License

ISC License

---

## 👨‍💻 Author

**Dhany Arya Pratama**  
Hacktiv8 - Gemini Flash API Project

---

## 🆘 Support

Jika ada pertanyaan atau issue:
1. Check documentation
2. Review logs di `logs/` folder
3. Check analytics di `/api/analytics/summary`
4. Create GitHub issue

---

## 🎉 Changelog

### v2.0.0 (Enhanced Edition)
- ✨ Added rate limiting
- ✨ Added caching system
- ✨ Added analytics tracking
- ✨ Added context management
- ✨ Added automated backup
- ✨ Added authentication
- ✨ Added WebSocket support
- ✨ Added comprehensive logging
- ✨ Added security enhancements
- ✨ Added performance optimizations

### v1.0.0 (Original)
- 🎉 Initial release
- Basic chat functionality
- File upload support
- Image generation

---

**Happy Coding! 🚀**
