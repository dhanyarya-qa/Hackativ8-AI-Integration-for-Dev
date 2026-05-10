# 📚 API Documentation - Gemini Flash API v2.0

## Base URL
```
http://localhost:3000
```

## Authentication

### Methods

1. **JWT Token** (Recommended for web apps)
```http
Authorization: Bearer <jwt_token>
```

2. **API Key** (Recommended for server-to-server)
```http
X-API-Key: gsk_xxxxxxxxxxxxx
```

---

## Endpoints

### 🏥 Health & System

#### GET /health
Check server health status.

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "uptime": 12345.67,
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

#### GET /api/system/info
Get detailed system information.

**Response:**
```json
{
  "success": true,
  "data": {
    "version": "2.0.0",
    "uptime": 12345.67,
    "memory": {
      "rss": 123456789,
      "heapTotal": 98765432,
      "heapUsed": 87654321,
      "external": 1234567
    },
    "cache": {
      "keys": 42,
      "hits": 150,
      "misses": 50,
      "ksize": 42,
      "vsize": 1024000
    },
    "models": [...],
    "currentModel": "gemini-2.5-flash"
  }
}
```

---

### 🔐 Authentication

#### POST /api/auth/register
Register new user.

**Request:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "username": "john_doe",
    "email": "john@example.com",
    "apiKey": "gsk_xxxxxxxxxxxxx"
  }
}
```

**Rate Limit:** 5 requests per 15 minutes

---

#### POST /api/auth/login
Login user.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "user",
    "apiKey": "gsk_xxxxxxxxxxxxx"
  }
}
```

**Rate Limit:** 5 requests per 15 minutes

---

#### GET /api/auth/me
Get current user info.

**Headers:**
```http
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "userId": "uuid-here",
    "email": "john@example.com",
    "role": "user"
  }
}
```

---

#### POST /api/auth/logout
Logout user.

**Headers:**
```http
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 🤖 AI Generation

#### POST /generate-text
Generate text response from AI.

**Request:**
```json
{
  "prompt": "Jelaskan tentang artificial intelligence",
  "chatId": 123  // Optional: for conversation context
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "answer": "Artificial Intelligence (AI) adalah...",
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

**Rate Limit:** 10 requests per minute  
**Caching:** Enabled (1 hour TTL)

---

#### POST /generate-from-image
Analyze image with AI.

**Request:**
```http
Content-Type: multipart/form-data

file: <image_file>
prompt: "Jelaskan apa yang ada di gambar ini"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "answer": "Gambar ini menunjukkan...",
    "file": {
      "name": "files/xxxxx",
      "uri": "https://generativelanguage.googleapis.com/...",
      "mimeType": "image/jpeg"
    }
  },
  "meta": {
    "responseTime": "2345ms",
    "model": "gemini-2.5-flash"
  }
}
```

**Rate Limit:** 20 uploads per 15 minutes  
**Max File Size:** 50MB

---

#### POST /generate-from-document
Analyze document (PDF, DOCX, TXT) with AI.

**Request:**
```http
Content-Type: multipart/form-data

file: <document_file>
prompt: "Ringkas dokumen ini"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "answer": "Dokumen ini membahas tentang...",
    "file": {
      "name": "files/xxxxx",
      "uri": "https://generativelanguage.googleapis.com/...",
      "mimeType": "application/pdf"
    }
  },
  "meta": {
    "responseTime": "3456ms",
    "model": "gemini-2.5-flash"
  }
}
```

**Rate Limit:** 20 uploads per 15 minutes  
**Max File Size:** 50MB

---

#### POST /generate-from-audio
Transcribe and analyze audio with AI.

**Request:**
```http
Content-Type: multipart/form-data

file: <audio_file>
prompt: "Transkrip audio ini"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "answer": "Transkrip: [isi audio]...",
    "file": {
      "name": "files/xxxxx",
      "uri": "https://generativelanguage.googleapis.com/...",
      "mimeType": "audio/mpeg"
    }
  },
  "meta": {
    "responseTime": "4567ms",
    "model": "gemini-2.5-flash"
  }
}
```

**Rate Limit:** 20 uploads per 15 minutes  
**Max File Size:** 50MB

---

#### POST /generate-image
Generate image from text prompt.

**Request:**
```json
{
  "prompt": "A beautiful sunset over mountains"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "text": "Generated image description",
    "image": {
      "mimeType": "image/png",
      "data": "base64_encoded_image_data"
    }
  },
  "meta": {
    "responseTime": "5678ms",
    "model": "gemini-2.5-flash-image"
  }
}
```

**Rate Limit:** 10 requests per minute

---

#### POST /api/stream
Stream AI response in real-time (SSE).

**Request:**
```json
{
  "prompt": "Write a long story about...",
  "chatId": 123  // Optional
}
```

**Response:** (Server-Sent Events)
```
data: {"type":"chunk","text":"Once upon"}
data: {"type":"chunk","text":" a time"}
data: {"type":"chunk","text":"..."}
data: {"type":"done"}
```

**Rate Limit:** 10 requests per minute

---

### 💬 Chat Management

#### GET /api/chats
List all chats.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Percakapan tentang AI",
      "created_at": "2024-01-15T10:00:00.000Z",
      "updated_at": "2024-01-15T11:00:00.000Z",
      "message_count": 10
    }
  ]
}
```

---

#### POST /api/chats
Create new chat.

**Request:**
```json
{
  "title": "Percakapan Baru"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "title": "Percakapan Baru"
  }
}
```

---

#### GET /api/chats/:id
Get chat details.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Percakapan tentang AI",
    "created_at": "2024-01-15T10:00:00.000Z",
    "updated_at": "2024-01-15T11:00:00.000Z"
  }
}
```

---

#### DELETE /api/chats/:id
Delete chat.

**Response:**
```json
{
  "success": true,
  "message": "Chat dihapus."
}
```

---

#### GET /api/chats/:id/messages
Get messages in chat.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "chat_id": 1,
      "role": "user",
      "content": "Hello",
      "model": null,
      "created_at": "2024-01-15T10:00:00.000Z"
    },
    {
      "id": 2,
      "chat_id": 1,
      "role": "ai",
      "content": "Hi! How can I help?",
      "model": "gemini-2.5-flash",
      "created_at": "2024-01-15T10:00:05.000Z"
    }
  ]
}
```

---

#### POST /api/chats/:id/messages
Add message to chat.

**Request:**
```json
{
  "role": "user",
  "content": "What is AI?",
  "model": "gemini-2.5-flash"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 3
  }
}
```

---

### 📊 Analytics

#### GET /api/analytics/summary
Get analytics summary.

**Query Parameters:**
- `days` (optional): Number of days to analyze (default: 7)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "Last 7 days",
    "tokenUsage": [
      {
        "model": "gemini-2.5-flash",
        "request_count": 150,
        "total_tokens": 45000,
        "total_cost": 0.0135,
        "avg_tokens": 300
      }
    ],
    "responseMetrics": [
      {
        "endpoint": "/generate-text",
        "request_count": 100,
        "avg_response_time": 1234,
        "min_response_time": 500,
        "max_response_time": 3000
      }
    ],
    "popularQueries": [
      {
        "query": "What is AI?",
        "count": 25,
        "avg_response_length": 500
      }
    ],
    "userActivity": [
      {
        "action": "generate_text",
        "count": 150
      }
    ]
  }
}
```

---

#### GET /api/analytics/costs
Get cost summary.

**Query Parameters:**
- `days` (optional): Number of days (default: 30)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "Last 30 days",
    "totalCost": 0.456,
    "breakdown": [
      {
        "date": "2024-01-15",
        "model": "gemini-2.5-flash",
        "tokens": 15000,
        "cost": 0.045
      }
    ]
  }
}
```

---

#### GET /api/analytics/cache
Get cache statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "keys": 42,
    "hits": 150,
    "misses": 50,
    "ksize": 42,
    "vsize": 1024000
  }
}
```

---

#### POST /api/analytics/cache/clear
Clear cache.

**Response:**
```json
{
  "success": true,
  "message": "Cache cleared successfully"
}
```

---

### 💾 Backup

#### POST /api/backup/create
Create manual backup.

**Headers:**
```http
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "fileName": "backup-2024-01-15T10-30-00-000Z.zip",
    "path": "/path/to/backup.zip",
    "size": 1234567
  }
}
```

**Required Role:** Admin

---

#### GET /api/backup/list
List all backups.

**Headers:**
```http
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "backup-2024-01-15T10-30-00-000Z.zip",
      "size": 1234567,
      "created": "2024-01-15T10:30:00.000Z",
      "path": "/path/to/backup.zip"
    }
  ]
}
```

**Required Role:** Admin

---

#### GET /api/backup/download/:filename
Download specific backup.

**Headers:**
```http
Authorization: Bearer <admin_token>
```

**Response:** File download

**Required Role:** Admin

---

### 🔍 Search

#### GET /api/search
Search messages.

**Query Parameters:**
- `q` (required): Search query

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "chat_id": 1,
      "role": "user",
      "content": "What is AI?",
      "created_at": "2024-01-15T10:00:00.000Z",
      "chat_title": "Percakapan tentang AI"
    }
  ]
}
```

---

### 📌 Templates

#### GET /api/templates
Get all prompt templates.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Terjemahkan",
      "content": "Terjemahkan teks berikut ke bahasa Indonesia:\n\n{text}",
      "created_at": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

---

#### POST /api/templates
Create new template.

**Request:**
```json
{
  "name": "Code Review",
  "content": "Review kode berikut:\n\n```\n{code}\n```"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 5
  }
}
```

---

#### DELETE /api/templates/:id
Delete template.

**Response:**
```json
{
  "success": true,
  "message": "Template dihapus."
}
```

---

### 🎯 Model Management

#### GET /api/models
List available models.

**Response:**
```json
{
  "success": true,
  "data": {
    "current": "gemini-2.5-flash",
    "models": [
      {
        "id": "gemini-2.5-flash",
        "name": "Gemini 2.5 Flash",
        "desc": "Cepat & efisien untuk chat harian"
      },
      {
        "id": "gemini-2.5-pro",
        "name": "Gemini 2.5 Pro",
        "desc": "Kuat untuk reasoning kompleks"
      }
    ]
  }
}
```

---

#### POST /api/model
Switch active model.

**Request:**
```json
{
  "model": "gemini-2.5-pro"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Model aktif berhasil diganti ke Gemini 2.5 Pro.",
  "data": {
    "current": "gemini-2.5-pro"
  }
}
```

---

#### GET /api/model
Get current model.

**Response:**
```json
{
  "success": true,
  "data": {
    "current": "gemini-2.5-flash",
    "name": "Gemini 2.5 Flash"
  }
}
```

---

## Error Responses

All endpoints may return error responses in this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests (Rate Limited)
- `500` - Internal Server Error

---

## Rate Limits

| Endpoint Type | Limit |
|--------------|-------|
| General API | 100 req / 15 min |
| AI Generation | 10 req / min |
| File Upload | 20 uploads / 15 min |
| Authentication | 5 attempts / 15 min |

Rate limit headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

---

## WebSocket Events

### Client → Server

```javascript
// Join chat
socket.emit('user:join', {
  userId: 'user123',
  username: 'John',
  chatId: 'chat456'
});

// Leave chat
socket.emit('user:leave', {
  chatId: 'chat456'
});

// Start typing
socket.emit('typing:start', {
  chatId: 'chat456',
  username: 'John'
});

// Stop typing
socket.emit('typing:stop', {
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
  // { userId, username, timestamp }
});

// User left
socket.on('user:left', (data) => {
  // { userId, username, timestamp }
});

// User typing
socket.on('user:typing', (data) => {
  // { username, isTyping }
});

// New message
socket.on('message:new', (data) => {
  // { ...message, timestamp }
});

// AI status
socket.on('ai:status', (data) => {
  // { status: 'generating' | 'complete', timestamp }
});

// Users list
socket.on('users:list', (users) => {
  // [{ userId, username, chatId }, ...]
});
```

---

## Examples

### cURL Examples

```bash
# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"john","email":"john@example.com","password":"pass123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"pass123"}'

# Generate text
curl -X POST http://localhost:3000/generate-text \
  -H "Content-Type: application/json" \
  -d '{"prompt":"What is AI?"}'

# Upload image
curl -X POST http://localhost:3000/generate-from-image \
  -F "file=@image.jpg" \
  -F "prompt=Describe this image"

# Get analytics
curl http://localhost:3000/api/analytics/summary?days=7

# Create backup (with auth)
curl -X POST http://localhost:3000/api/backup/create \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### JavaScript Examples

```javascript
// Using fetch
const response = await fetch('http://localhost:3000/generate-text', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt: 'What is AI?'
  })
});

const data = await response.json();
console.log(data.data.answer);

// Using axios
const axios = require('axios');

const response = await axios.post('http://localhost:3000/generate-text', {
  prompt: 'What is AI?'
});

console.log(response.data.data.answer);

// WebSocket connection
const io = require('socket.io-client');
const socket = io('http://localhost:3000');

socket.on('connect', () => {
  socket.emit('user:join', {
    userId: 'user123',
    username: 'John',
    chatId: 'chat456'
  });
});

socket.on('message:new', (message) => {
  console.log('New message:', message);
});
```

---

**API Documentation v2.0** | Last Updated: 2024-01-15
