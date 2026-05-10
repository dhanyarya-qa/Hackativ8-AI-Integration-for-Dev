# 🎯 Auto-Generate Title Feature

## ✨ Fitur Baru yang Ditambahkan

### **Auto-Generate Chat Title**
Chat title akan otomatis di-generate berdasarkan topik percakapan setelah user mengirim pesan pertama.

---

## 🚀 Cara Kerja

### 1. **Membuat Chat Baru**
- Saat user mengirim pesan pertama, sistem otomatis membuat chat baru dengan title "Percakapan Baru"
- Chat ID disimpan di `currentChatId`

### 2. **Menyimpan Pesan**
- Setiap pesan user dan AI disimpan ke database
- Pesan tersimpan dengan `chat_id`, `role`, `content`, dan `timestamp`

### 3. **Auto-Generate Title**
- Setelah ada minimal 2 pesan (1 user + 1 AI), sistem otomatis generate title
- Title di-generate oleh AI berdasarkan konteks percakapan
- Title maksimal 60 karakter, singkat dan deskriptif

### 4. **Update UI**
- Sidebar chat history otomatis update dengan title baru
- Chat yang aktif ditandai dengan highlight hijau
- Hover pada chat item menampilkan tombol delete

---

## 📊 Flow Diagram

```
User mengirim pesan
    ↓
Cek apakah currentChatId ada?
    ↓ (Tidak)
Buat chat baru → Set currentChatId
    ↓
Simpan pesan user ke database
    ↓
Kirim ke AI
    ↓
Simpan response AI ke database
    ↓
Cek jumlah pesan >= 2?
    ↓ (Ya)
Cek title masih "Percakapan Baru"?
    ↓ (Ya)
Generate title dengan AI
    ↓
Update title di database
    ↓
Refresh chat history di sidebar
```

---

## 🎨 UI Features

### **Sidebar Chat History**
- ✅ List semua chat dengan title
- ✅ Highlight chat yang aktif (hijau)
- ✅ Hover menampilkan delete button (merah)
- ✅ Click chat untuk load percakapan
- ✅ Delete button untuk hapus chat

### **Chat Management**
- ✅ Auto-save setiap pesan
- ✅ Auto-generate title
- ✅ Load chat history saat page load
- ✅ Switch between chats
- ✅ Delete chat dengan konfirmasi

---

## 🔧 Technical Implementation

### **Frontend (app.js)**

#### New Methods:
```javascript
// Create new chat
async createNewChat()

// Save message to database
async saveMessageToDb(role, content)

// Auto-generate title
async autoGenerateTitle()

// Get current chat info
async getCurrentChat()

// Load chat history
async loadChatHistory()

// Render chat history in sidebar
renderChatHistory(chats)

// Load specific chat
async loadChat(chatId)

// Delete chat
async deleteChat(chatId)
```

#### Modified Methods:
```javascript
// sendMessage() - Now creates chat if not exists, saves messages, and auto-generates title
// startNewChat() - Now loads chat history
// init() - Now loads chat history on startup
```

### **Backend (index.js)**

#### Existing Endpoints Used:
```javascript
POST /api/chats - Create new chat
GET /api/chats - List all chats
GET /api/chats/:id - Get chat details
DELETE /api/chats/:id - Delete chat
GET /api/chats/:id/messages - Get messages
POST /api/chats/:id/messages - Add message
POST /api/chats/:id/title - Auto-generate title
```

### **Database (db.js)**

#### Tables Used:
```sql
-- chats table
CREATE TABLE chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT 'Percakapan Baru',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- messages table
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'ai')),
    content TEXT NOT NULL,
    model TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
);
```

---

## 📝 Example Usage

### **Scenario 1: New Chat**
```
1. User opens app → Sees "Percakapan Baru" in sidebar
2. User types: "Jelaskan tentang AI"
3. System creates new chat with ID 1
4. System saves user message
5. AI responds with explanation
6. System saves AI response
7. System auto-generates title: "Penjelasan tentang AI"
8. Sidebar updates with new title
```

### **Scenario 2: Continue Chat**
```
1. User clicks chat "Penjelasan tentang AI"
2. System loads chat ID 1
3. System loads all messages from database
4. User sees previous conversation
5. User continues chatting
6. All messages auto-saved
7. Title remains "Penjelasan tentang AI"
```

### **Scenario 3: Multiple Chats**
```
1. User has 3 chats:
   - "Penjelasan tentang AI"
   - "Resep Masakan Indonesia"
   - "Tips Belajar Programming"
2. User clicks "Chat Baru"
3. System resets currentChatId to null
4. User starts new conversation
5. New chat created with auto-generated title
6. Sidebar shows 4 chats
```

---

## 🎯 Benefits

### **For Users:**
- ✅ **Easy Navigation** - Find chats by title
- ✅ **Auto-Organization** - No manual naming needed
- ✅ **Persistent History** - All chats saved
- ✅ **Quick Access** - Click to load any chat
- ✅ **Clean UI** - Delete unwanted chats

### **For Developers:**
- ✅ **Database-backed** - All data persisted
- ✅ **RESTful API** - Standard endpoints
- ✅ **Modular Code** - Easy to maintain
- ✅ **Error Handling** - Graceful failures
- ✅ **Scalable** - Ready for multi-user

---

## 🔍 Testing

### **Test Cases:**

#### 1. Create New Chat
```
✅ Open app
✅ Send first message
✅ Check chat created in database
✅ Check title auto-generated
✅ Check sidebar updated
```

#### 2. Load Existing Chat
```
✅ Click chat in sidebar
✅ Check messages loaded
✅ Check chat marked as active
✅ Continue conversation
✅ Check new messages saved
```

#### 3. Delete Chat
```
✅ Hover on chat item
✅ Click delete button
✅ Confirm deletion
✅ Check chat removed from database
✅ Check sidebar updated
```

#### 4. Multiple Chats
```
✅ Create 3 different chats
✅ Check all appear in sidebar
✅ Switch between chats
✅ Check correct messages loaded
✅ Check active state updates
```

---

## 🐛 Known Issues & Solutions

### Issue 1: Title not generating
**Solution:** Check if chat has at least 2 messages (1 user + 1 AI)

### Issue 2: Chat not saving
**Solution:** Check if currentChatId is set correctly

### Issue 3: Sidebar not updating
**Solution:** Call `loadChatHistory()` after operations

### Issue 4: Delete button not showing
**Solution:** Check CSS for `.delete-chat-btn` opacity on hover

---

## 🚀 Future Enhancements

### Planned Features:
- [ ] Edit chat title manually
- [ ] Pin important chats
- [ ] Search within chat
- [ ] Export chat to PDF/MD
- [ ] Share chat with others
- [ ] Chat folders/categories
- [ ] Archive old chats
- [ ] Bulk delete chats

---

## 📚 API Reference

### Create Chat
```http
POST /api/chats
Content-Type: application/json

{
  "title": "Percakapan Baru"
}

Response:
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Percakapan Baru"
  }
}
```

### List Chats
```http
GET /api/chats

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Penjelasan tentang AI",
      "created_at": "2024-01-15T10:00:00.000Z",
      "updated_at": "2024-01-15T11:00:00.000Z",
      "message_count": 10
    }
  ]
}
```

### Auto-Generate Title
```http
POST /api/chats/:id/title

Response:
{
  "success": true,
  "data": {
    "title": "Penjelasan tentang AI"
  }
}
```

---

## 🎊 Summary

Fitur **Auto-Generate Title** sekarang sudah aktif! 

### What's Working:
✅ Auto-create chat on first message  
✅ Auto-save all messages  
✅ Auto-generate descriptive title  
✅ Load chat history on startup  
✅ Switch between chats  
✅ Delete chats  
✅ Persistent storage  

### How to Use:
1. Open http://localhost:3000
2. Start typing and send message
3. Watch title auto-generate
4. See chat appear in sidebar
5. Click to switch between chats
6. Hover to delete unwanted chats

**Enjoy your organized chat history! 🎉**
