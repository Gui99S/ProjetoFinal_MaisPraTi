# Backend Architecture Plan - Social Media Platform

## 🎯 Executive Summary

**Hybrid Microservices Architecture:**
- **Spring Boot (Java)**: Core API, authentication, business logic
- **Python (Flask/FastAPI)**: AI bot personalities and automation
- **Node.js (Optional)**: WebSocket server for real-time messaging
- **PostgreSQL**: Primary relational database
- **Redis**: Caching, sessions, real-time presence
- **Docker**: Complete containerization

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                  │
│              Port 5173 (localhost:5173)                      │
└────────────────┬────────────────────────────────────────────┘
                 │
    ┌────────────┴────────────┬──────────────────┐
    │                         │                  │
    ▼                         ▼                  ▼
┌─────────────┐      ┌──────────────┐    ┌────────────┐
│ Spring Boot │      │   Python AI  │    │  Node.js   │
│  REST API   │◄────►│  Bot Service │    │ WebSocket  │
│  Port 8080  │      │  Port 5000   │    │ Port 3000  │
└──────┬──────┘      └──────┬───────┘    └─────┬──────┘
       │                    │                   │
       └────────────┬───────┴───────────────────┘
                    │
       ┌────────────┴─────────────┐
       ▼                          ▼
┌──────────────┐          ┌──────────────┐
│ PostgreSQL   │          │    Redis     │
│  Port 5432   │          │  Port 6379   │
└──────────────┘          └──────────────┘
```

---

## 🗄️ Database Schema Design

### **Core Entities**

#### **1. users**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    birthday DATE,
    relationship_status VARCHAR(50),
    occupation VARCHAR(100),
    location VARCHAR(100),
    bio TEXT,
    is_bot BOOLEAN DEFAULT FALSE,
    bot_personality VARCHAR(50), -- 'tech', 'foodie', 'meme', 'news', 'music'
    online_status VARCHAR(20) DEFAULT 'offline', -- 'online', 'offline', 'away', 'busy'
    last_active TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_bot ON users(is_bot);
CREATE INDEX idx_users_online_status ON users(online_status);
```

#### **2. posts**
```sql
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media_urls TEXT[], -- Array of image/video URLs
    visibility VARCHAR(20) DEFAULT 'public', -- 'public', 'friends', 'private'
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_visibility ON posts(visibility);
```

#### **3. comments**
```sql
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- For nested replies
    content TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id);
```

#### **4. likes**
```sql
CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL, -- 'post', 'comment'
    target_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, target_type, target_id)
);

CREATE INDEX idx_likes_target ON likes(target_type, target_id);
CREATE INDEX idx_likes_user_id ON likes(user_id);
```

#### **5. friendships**
```sql
CREATE TABLE friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'blocked'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(requester_id, addressee_id)
);

CREATE INDEX idx_friendships_requester ON friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX idx_friendships_status ON friendships(status);
```

#### **6. conversations**
```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) DEFAULT 'direct', -- 'direct', 'group'
    name VARCHAR(100), -- For group chats
    created_by UUID REFERENCES users(id),
    last_message_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
```

#### **7. conversation_participants**
```sql
CREATE TABLE conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT NOW(),
    last_read_at TIMESTAMP,
    unread_count INTEGER DEFAULT 0,
    UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_conv_participants_conv ON conversation_participants(conversation_id);
CREATE INDEX idx_conv_participants_user ON conversation_participants(user_id);
```

#### **8. messages**
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media_urls TEXT[],
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
```

#### **9. notifications**
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'like', 'comment', 'friend_request', 'message', etc.
    actor_id UUID REFERENCES users(id), -- Who triggered the notification
    target_type VARCHAR(20), -- 'post', 'comment', 'message'
    target_id UUID,
    content TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);
```

#### **10. refresh_tokens**
```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    revoked BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
```

---

## 🏗️ Spring Boot Backend Structure

### **Project Structure**
```
social-media-backend/
├── src/main/java/com/socialmedia/
│   ├── SocialMediaApplication.java
│   ├── config/
│   │   ├── SecurityConfig.java          # JWT + Spring Security
│   │   ├── RedisConfig.java             # Redis connection
│   │   ├── CorsConfig.java              # CORS for frontend
│   │   ├── SwaggerConfig.java           # API documentation
│   │   └── WebSocketConfig.java         # WebSocket support (optional)
│   ├── controller/
│   │   ├── AuthController.java          # Login, register, refresh token
│   │   ├── UserController.java          # Profile management
│   │   ├── PostController.java          # CRUD posts
│   │   ├── CommentController.java       # CRUD comments
│   │   ├── LikeController.java          # Like/unlike
│   │   ├── FriendshipController.java    # Friend requests
│   │   ├── ConversationController.java  # Messaging
│   │   ├── NotificationController.java  # Notifications
│   │   └── FeedController.java          # News feed
│   ├── dto/
│   │   ├── request/
│   │   │   ├── LoginRequest.java
│   │   │   ├── RegisterRequest.java
│   │   │   ├── PostRequest.java
│   │   │   ├── CommentRequest.java
│   │   │   └── MessageRequest.java
│   │   └── response/
│   │       ├── AuthResponse.java
│   │       ├── UserResponse.java
│   │       ├── PostResponse.java
│   │       ├── CommentResponse.java
│   │       └── MessageResponse.java
│   ├── entity/
│   │   ├── User.java
│   │   ├── Post.java
│   │   ├── Comment.java
│   │   ├── Like.java
│   │   ├── Friendship.java
│   │   ├── Conversation.java
│   │   ├── ConversationParticipant.java
│   │   ├── Message.java
│   │   ├── Notification.java
│   │   └── RefreshToken.java
│   ├── repository/
│   │   ├── UserRepository.java
│   │   ├── PostRepository.java
│   │   ├── CommentRepository.java
│   │   ├── LikeRepository.java
│   │   ├── FriendshipRepository.java
│   │   ├── ConversationRepository.java
│   │   ├── MessageRepository.java
│   │   ├── NotificationRepository.java
│   │   └── RefreshTokenRepository.java
│   ├── service/
│   │   ├── AuthService.java
│   │   ├── UserService.java
│   │   ├── PostService.java
│   │   ├── CommentService.java
│   │   ├── LikeService.java
│   │   ├── FriendshipService.java
│   │   ├── ConversationService.java
│   │   ├── MessageService.java
│   │   ├── NotificationService.java
│   │   ├── FeedService.java
│   │   └── RedisService.java
│   ├── security/
│   │   ├── JwtTokenProvider.java
│   │   ├── JwtAuthenticationFilter.java
│   │   ├── CustomUserDetailsService.java
│   │   └── SecurityUtils.java
│   ├── exception/
│   │   ├── GlobalExceptionHandler.java
│   │   ├── ResourceNotFoundException.java
│   │   ├── UnauthorizedException.java
│   │   └── ValidationException.java
│   └── util/
│       ├── DateUtils.java
│       └── StringUtils.java
├── src/main/resources/
│   ├── application.yml
│   ├── application-dev.yml
│   ├── application-prod.yml
│   └── db/migration/
│       ├── V1__create_users_table.sql
│       ├── V2__create_posts_table.sql
│       └── ... (Flyway migrations)
├── pom.xml
└── Dockerfile
```

### **Key Dependencies (pom.xml)**
```xml
- Spring Boot Starter Web
- Spring Boot Starter Data JPA
- Spring Boot Starter Security
- Spring Boot Starter Validation
- Spring Boot Starter Cache
- Spring Boot Starter Data Redis
- PostgreSQL Driver
- JWT (io.jsonwebtoken:jjwt)
- Lombok
- ModelMapper
- Springdoc OpenAPI (Swagger)
- Flyway Migration
```

---

## 🤖 Python AI Bot Service

### **Project Structure**
```
ai-bot-service/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app
│   ├── config.py                  # Configuration
│   ├── bots/
│   │   ├── __init__.py
│   │   ├── base_bot.py           # Abstract bot class
│   │   ├── tech_bot.py           # Programming tips bot
│   │   ├── foodie_bot.py         # Food recommendations
│   │   ├── meme_bot.py           # Humor & jokes
│   │   ├── news_bot.py           # News updates
│   │   └── music_bot.py          # Music recommendations
│   ├── services/
│   │   ├── __init__.py
│   │   ├── api_client.py         # Spring Boot API client
│   │   ├── post_generator.py    # Generate posts
│   │   ├── comment_generator.py # Generate comments
│   │   └── response_handler.py  # Handle user messages
│   ├── models/
│   │   ├── __init__.py
│   │   ├── bot_personality.py
│   │   └── response_templates.py
│   └── tasks/
│       ├── __init__.py
│       ├── scheduled_posts.py   # Background tasks
│       └── auto_replies.py      # Auto-reply to messages
├── requirements.txt
├── Dockerfile
└── .env
```

### **Bot Personalities**

#### **1. TechBot**
```python
- Personality: Helpful, knowledgeable, geeky
- Posts: Programming tips, tech news, coding memes
- Responses: Code snippets, debugging help, tech advice
- Frequency: 3-5 posts/day
```

#### **2. FoodieBot**
```python
- Personality: Enthusiastic, descriptive, friendly
- Posts: Recipes, restaurant reviews, food photos
- Responses: Cooking tips, ingredient suggestions
- Frequency: 4-6 posts/day
```

#### **3. MemeBot**
```python
- Personality: Funny, sarcastic, pop culture savvy
- Posts: Memes, jokes, trending topics
- Responses: Witty comebacks, humorous replies
- Frequency: 6-10 posts/day
```

#### **4. NewsBot**
```python
- Personality: Professional, factual, informative
- Posts: Daily news summaries, trending topics
- Responses: Fact-checking, source citations
- Frequency: 2-4 posts/day
```

#### **5. MusicBot**
```python
- Personality: Passionate, diverse taste, friendly
- Posts: Song recommendations, artist spotlights
- Responses: Playlist suggestions, concert info
- Frequency: 3-5 posts/day
```

### **AI Integration Options**

**Option 1: Rule-Based (Simple, Fast)**
- Pre-written response templates
- Keyword matching
- Random selection from templates
- No external API costs

**Option 2: OpenAI API (Smart, Contextual)**
- GPT-3.5/4 for natural responses
- Context-aware conversations
- Personality prompts
- Requires API key & costs money

**Option 3: Local LLM (Private, Free)**
- Ollama + Llama 3
- Runs locally
- No API costs
- Requires more resources

**Recommendation:** Start with **Option 1** (rule-based), upgrade to Option 2/3 if needed.

---

## 🔄 Node.js WebSocket Service (Optional)

### **Project Structure**
```
websocket-service/
├── src/
│   ├── server.js                 # Socket.io server
│   ├── config/
│   │   └── redis.js             # Redis pub/sub
│   ├── handlers/
│   │   ├── messageHandler.js    # Handle chat messages
│   │   ├── presenceHandler.js   # Online status
│   │   └── typingHandler.js     # Typing indicators
│   └── middleware/
│       └── auth.js              # JWT verification
├── package.json
├── Dockerfile
└── .env
```

### **Real-Time Features**
- **Live Messaging**: Instant message delivery
- **Typing Indicators**: "User is typing..."
- **Online Presence**: Green/red/orange/grey status
- **Read Receipts**: Message read confirmation
- **Notifications**: Real-time notification push

---

## 🔐 Authentication Flow

### **JWT Token Strategy**

```
1. User Login (POST /api/auth/login)
   ├─→ Validate credentials
   ├─→ Generate Access Token (15 min expiry)
   ├─→ Generate Refresh Token (7 days expiry, stored in DB)
   └─→ Return { accessToken, refreshToken, user }

2. Access Protected Route
   ├─→ Send Access Token in Header: "Authorization: Bearer {token}"
   ├─→ Spring Security validates token
   └─→ Allow/Deny request

3. Token Refresh (POST /api/auth/refresh)
   ├─→ Send Refresh Token
   ├─→ Validate token from DB
   ├─→ Generate new Access Token
   └─→ Return { accessToken }

4. Logout (POST /api/auth/logout)
   ├─→ Revoke Refresh Token in DB
   └─→ Clear frontend tokens
```

### **Security Features**
- Password hashing with BCrypt (strength 12)
- JWT with RS256 algorithm
- CSRF protection
- Rate limiting (Redis)
- XSS protection headers
- HTTPS only in production
- SQL injection prevention (JPA)

---

## 📡 API Endpoints

### **Authentication**
```
POST   /api/auth/register          # Register new user
POST   /api/auth/login             # Login
POST   /api/auth/refresh           # Refresh access token
POST   /api/auth/logout            # Logout
POST   /api/auth/forgot-password   # Request password reset
POST   /api/auth/reset-password    # Reset password with token
```

### **Users**
```
GET    /api/users/me               # Get current user profile
PUT    /api/users/me               # Update current user profile
GET    /api/users/{id}             # Get user by ID
GET    /api/users/search           # Search users (query param)
PUT    /api/users/me/avatar        # Upload avatar
```

### **Posts**
```
GET    /api/posts                  # Get all posts (paginated)
GET    /api/posts/{id}             # Get single post
POST   /api/posts                  # Create post
PUT    /api/posts/{id}             # Update post
DELETE /api/posts/{id}             # Delete post
GET    /api/posts/user/{userId}    # Get user's posts
```

### **Comments**
```
GET    /api/posts/{postId}/comments       # Get post comments
POST   /api/posts/{postId}/comments       # Create comment
PUT    /api/comments/{id}                 # Update comment
DELETE /api/comments/{id}                 # Delete comment
```

### **Likes**
```
POST   /api/posts/{id}/like        # Like post
DELETE /api/posts/{id}/like        # Unlike post
POST   /api/comments/{id}/like     # Like comment
DELETE /api/comments/{id}/like     # Unlike comment
GET    /api/posts/{id}/likes       # Get post likes
```

### **Friendships**
```
POST   /api/friendships/request    # Send friend request
PUT    /api/friendships/{id}/accept    # Accept request
PUT    /api/friendships/{id}/reject    # Reject request
DELETE /api/friendships/{id}           # Remove friend
GET    /api/friendships/pending        # Get pending requests
GET    /api/friendships/friends        # Get friends list
```

### **Conversations & Messages**
```
GET    /api/conversations                    # Get user's conversations
GET    /api/conversations/{id}               # Get conversation details
POST   /api/conversations                    # Create conversation
GET    /api/conversations/{id}/messages      # Get messages
POST   /api/conversations/{id}/messages      # Send message
PUT    /api/messages/{id}/read              # Mark as read
DELETE /api/messages/{id}                   # Delete message
```

### **Feed**
```
GET    /api/feed                   # Get personalized feed
GET    /api/feed/trending          # Get trending posts
GET    /api/feed/following         # Get posts from friends only
```

### **Notifications**
```
GET    /api/notifications          # Get user notifications
PUT    /api/notifications/{id}/read    # Mark as read
PUT    /api/notifications/read-all     # Mark all as read
DELETE /api/notifications/{id}         # Delete notification
```

---

## 📦 Redis Caching Strategy

### **Cache Keys**
```
user:{userId}                    # User profile cache (TTL: 1 hour)
post:{postId}                    # Post cache (TTL: 30 min)
feed:{userId}                    # User feed cache (TTL: 5 min)
online_users                     # Set of online user IDs
user:{userId}:unread_messages    # Unread message count
trending_posts                   # Trending posts list (TTL: 15 min)
```

### **Session Management**
```
session:{sessionId}              # User session data (TTL: 24 hours)
rate_limit:{ip}:{endpoint}       # Rate limiting (TTL: 1 min)
```

### **Real-Time Presence**
```
presence:{userId}                # Online status (TTL: 5 min)
typing:{conversationId}          # Typing indicators (TTL: 10 sec)
```

---

## 🐳 Docker Setup

### **docker-compose.yml**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: socialmedia_postgres
    environment:
      POSTGRES_DB: socialmedia
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secret123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - socialmedia_network

  redis:
    image: redis:7-alpine
    container_name: socialmedia_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - socialmedia_network

  spring-boot-api:
    build:
      context: ./social-media-backend
      dockerfile: Dockerfile
    container_name: socialmedia_api
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/socialmedia
      SPRING_DATASOURCE_USERNAME: admin
      SPRING_DATASOURCE_PASSWORD: secret123
      SPRING_REDIS_HOST: redis
      SPRING_REDIS_PORT: 6379
      JWT_SECRET: your-secret-key-here
    ports:
      - "8080:8080"
    depends_on:
      - postgres
      - redis
    networks:
      - socialmedia_network

  python-bot-service:
    build:
      context: ./ai-bot-service
      dockerfile: Dockerfile
    container_name: socialmedia_bots
    environment:
      API_BASE_URL: http://spring-boot-api:8080
      BOT_USERNAME: bot_admin
      BOT_PASSWORD: bot_secret
    ports:
      - "5000:5000"
    depends_on:
      - spring-boot-api
    networks:
      - socialmedia_network

  websocket-service:
    build:
      context: ./websocket-service
      dockerfile: Dockerfile
    container_name: socialmedia_websocket
    environment:
      REDIS_HOST: redis
      REDIS_PORT: 6379
      JWT_SECRET: your-secret-key-here
    ports:
      - "3000:3000"
    depends_on:
      - redis
    networks:
      - socialmedia_network

volumes:
  postgres_data:
  redis_data:

networks:
  socialmedia_network:
    driver: bridge
```

---

## 🚀 Development Roadmap

### **Phase 1: Foundation (Days 1-2)**
✅ Tasks:
- [ ] Set up Spring Boot project structure
- [ ] Configure PostgreSQL + Flyway migrations
- [ ] Configure Redis
- [ ] Implement JWT authentication (login/register)
- [ ] Create User entity & basic endpoints
- [ ] Set up Docker compose

### **Phase 2: Core Features (Days 3-4)**
✅ Tasks:
- [ ] Implement Post CRUD
- [ ] Implement Comment system
- [ ] Implement Like system
- [ ] Create Feed service with pagination
- [ ] Add Friendship system
- [ ] Implement basic caching

### **Phase 3: Messaging (Day 5)**
✅ Tasks:
- [ ] Create Conversation & Message entities
- [ ] Implement messaging endpoints
- [ ] (Optional) Node.js WebSocket server
- [ ] Real-time presence with Redis

### **Phase 4: AI Bots (Day 6)**
✅ Tasks:
- [ ] Set up Python FastAPI service
- [ ] Create 5 bot personalities
- [ ] Implement rule-based response system
- [ ] Schedule automated posts
- [ ] Integrate with Spring Boot API

### **Phase 5: Polish & Deploy (Day 7)**
✅ Tasks:
- [ ] Add Swagger documentation
- [ ] Implement rate limiting
- [ ] Error handling & validation
- [ ] Security hardening
- [ ] Performance testing
- [ ] Deploy with Docker Compose

---

## 📚 Frontend Integration Guide

### **API Client Setup (axios)**

```javascript
// src/services/api.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });
          localStorage.setItem('accessToken', data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(originalRequest);
        } catch (err) {
          // Refresh failed, logout user
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/auth';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

### **Update UserContext to use real API**

```javascript
// src/context/UserContext.jsx
import api from '../services/api';

const login = async (email, password) => {
  try {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.response?.data?.message };
  }
};

const logout = async () => {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  }
};
```

---

## 🎯 Success Metrics

**Technical Requirements:**
- ✅ RESTful API with proper HTTP status codes
- ✅ JWT authentication with refresh tokens
- ✅ PostgreSQL with normalized schema
- ✅ Redis caching for performance
- ✅ Docker containerization
- ✅ Swagger API documentation
- ✅ Error handling & validation
- ✅ Security best practices

**Functional Features:**
- ✅ User authentication & profiles
- ✅ Post creation, editing, deletion
- ✅ Comment system with nested replies
- ✅ Like/unlike functionality
- ✅ Friend request system
- ✅ Real-time messaging
- ✅ Personalized feed algorithm
- ✅ AI bot personalities (5 bots)
- ✅ Online presence indicators

**Bonus Features:**
- 🎁 WebSocket real-time updates
- 🎁 File upload (avatars, media)
- 🎁 Notification system
- 🎁 Search functionality
- 🎁 Rate limiting
- 🎁 CI/CD pipeline

---

## 📖 Documentation Deliverables

1. **README.md** - Project overview, setup instructions
2. **API_DOCUMENTATION.md** - Detailed API endpoints (or Swagger)
3. **DATABASE_SCHEMA.md** - ER diagrams, table descriptions
4. **ARCHITECTURE.md** - System design, technology choices
5. **DEPLOYMENT_GUIDE.md** - Docker setup, environment variables
6. **TESTING_GUIDE.md** - Test cases, Postman collection

---

## 🔥 Quick Start Commands

```bash
# Clone repositories
git clone <your-backend-repo>
git clone <your-bot-service-repo>

# Start all services with Docker
cd social-media-backend
docker-compose up -d

# Access services
Frontend:     http://localhost:5173
API:          http://localhost:8080
Swagger:      http://localhost:8080/swagger-ui.html
Bot Service:  http://localhost:5000
WebSocket:    http://localhost:3000
PostgreSQL:   localhost:5432
Redis:        localhost:6379
```

---

## 🤝 Team Collaboration Tips

1. **Git Workflow**: Feature branches → Pull Requests → Code Review
2. **Communication**: Daily standups, progress updates
3. **Task Management**: Use GitHub Projects or Trello
4. **Code Standards**: Follow Java conventions, ESLint for Node/Python
5. **Testing**: Write tests as you develop
6. **Documentation**: Document as you build, not at the end

---

## 🎓 Learning Outcomes

By completing this project, you'll demonstrate:
- **Full-Stack Development**: React + Spring Boot + Python
- **Database Design**: PostgreSQL schema with relationships
- **API Development**: RESTful best practices
- **Security**: JWT authentication, password hashing
- **Caching**: Redis for performance optimization
- **Real-Time**: WebSocket communication
- **AI Integration**: Bot automation with Python
- **DevOps**: Docker containerization
- **Architecture**: Microservices design patterns

---

**Ready to build? Let's start with Phase 1! 🚀**
