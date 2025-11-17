set up FriendList, Messages, ProfileIDs, Feed (infinite loading, refreshing constantly), Python AI bots for mock data (profile, posts, chats);


# Social Media Platform - Final School Project

A modern social media platform inspired by Orkut, built with React and Vite. This project demonstrates full-stack development skills with planned AI bot integration.

## 🎯 Project Overview

**Timeline:** One week development cycle
**Tech Stack:** React 19.1.1 + Vite + Node.js + Python (AI Bots)
**Goal:** Interactive social media platform with AI-powered bot personalities

## 🚀 Current Features

- **Authentication System**: Login/Register with Context API
- **Profile Management**: Public and User profiles with Orkut-inspired design
- **Theme & Language Support**: Multi-language interface with dark/light themes
- **Responsive Design**: Mobile-first approach with CSS Grid layouts
- **Status Indicators**: Color-coded online presence (green/red/orange/grey)
- **Navigation**: Conditional routing based on authentication state

## 📋 Architecture Planning

### Phase 1: Frontend Foundation (Current)
- ✅ React components and UI layouts
- ✅ Authentication with localStorage simulation  
- ✅ Responsive Orkut-inspired design
- 🔄 Messaging system components
- 🔄 Mock data structures for profiles and messages

### Phase 2: Backend Integration (Planned)
- 🔲 Node.js + Express API
- 🔲 Database (PostgreSQL/MongoDB)
- 🔲 JWT Authentication
- 🔲 WebSocket for real-time messaging
- 🔲 File upload handling

### Phase 3: AI Bot Integration (Innovative Feature)
- 🔲 Python Flask/FastAPI service
- 🔲 AI-powered bot personalities
- 🔲 Automated posting and responses
- 🔲 Integration with OpenAI API or local models

## 🤖 AI Bot Concept

### Bot Personalities
- **TechBot**: Programming tips, coding responses
- **FoodieBot**: Recipes, restaurant recommendations  
- **MemeBot**: Humor, jokes, entertainment
- **NewsBot**: Daily updates, factual information
- **MusicBot**: Song recommendations, artist discussions

### Bot Capabilities
- Intelligent responses to user messages
- Automated timeline posts every few minutes
- Reactions and comments on user content
- Unique personalities with custom profile pictures
- Context-aware conversations

## 🗂 Messaging System Architecture

### Profile ID Strategy
- **UUIDs**: Server-side generated for uniqueness
- **Case-Insensitive Usernames**: Display as typed, match ignoring case
- **Profile URLs**: `/profile/{uuid}` format for professional presentation

### Database Schema (Planned)
```sql
users: id(UUID), username, email, display_name, created_at, last_active
conversations: id(UUID), type(direct/group), created_at, updated_at  
messages: id(UUID), conversation_id, sender_id, content, timestamp
participants: conversation_id, user_id, joined_at
```

### Real-time Features
- WebSocket integration for live messaging
- Typing indicators and read receipts
- Online/offline status broadcasting
- Push notifications for new messages

### File Sharing System
- Media upload (images, videos, documents)
- File size and type validation
- Cloud storage integration (AWS S3/Cloudinary)
- Thumbnail generation for images

## 🏗 Technical Implementation

### Frontend Architecture
```
src/
├── components/          # Reusable UI components
├── pages/              # Route-based page components
├── context/            # React Context providers
│   ├── ThemeContext    # Dark/light theme management
│   ├── LanguageContext # Multi-language support
│   └── UserContext     # Authentication state
└── assets/             # Static resources
```

### Backend Architecture (Planned)
```
Frontend (React) ↔ Node.js API ↔ Python Bot Service
                ↕
            Database Layer
```

## 🎨 UI Design Principles

- **Orkut-Inspired**: Nostalgic social media aesthetics
- **Responsive Design**: Mobile-first with breakpoint optimization
- **Color Coding**: Status indicators with intuitive color schemes
- **Accessibility**: Semantic HTML and proper contrast ratios
- **Performance**: Optimized bundle sizes and lazy loading

## 📱 Demo Features for Presentation

- Interactive messaging with bot responses
- Real-time status updates (simulated)
- Profile customization and editing
- Theme switching demonstration
- Multi-language interface showcase
- Responsive design across devices


## 🎯 Week Development Plan

**Days 1-2:** Messaging UI components + bot profiles  
**Days 3-4:** Python bot service + basic responses  
**Days 5-7:** Polish, animations, demo preparation

## 🌟 Innovation Highlights

1. **AI Integration**: Unique bot personalities for interactive demonstration
2. **Full-Stack Architecture**: Professional-grade system design
3. **Real-time Features**: Modern messaging capabilities
4. **Scalable Structure**: Component-based architecture for maintainability
5. **User Experience**: Intuitive Orkut-inspired interface with modern enhancements

---

*This project demonstrates proficiency in React development, system architecture, database design, API integration, and innovative AI implementation for an engaging social media experience.*
