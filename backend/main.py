from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from dotenv import load_dotenv
from app.core.config import settings
from contextlib import asynccontextmanager

# Load environment variables
load_dotenv()


# Lifespan context manager for startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start bot scheduler
    from app.core.scheduler import start_scheduler
    start_scheduler()
    
    yield
    
    # Shutdown: Stop bot scheduler
    from app.core.scheduler import stop_scheduler
    stop_scheduler()


# Create FastAPI app
app = FastAPI(
    title="Social Media API",
    description="Backend API for social media platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files directory for uploads
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Health check endpoint
@app.get("/")
async def root():
    return {
        "message": "Social Media API is running",
        "status": "healthy",
        "version": "1.0.0"
    }

@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "database": "not connected yet",
        "redis": "not connected yet"
    }

# Import database and models
from app.core.database import engine, Base
from app.models import user
from app.models import post
from app.models import friendship
from app.models import message
from app.models import community
from app.models import product
from app.models import bot
from app.models import notification
from app.models import photo

# Create database tables
Base.metadata.create_all(bind=engine)

# Import and include routers
from app.routes import auth, users, posts, friends, messages, websocket, communities, marketplace, bots, notifications, photos, global_chat
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(posts.router, prefix="/api/posts", tags=["Posts"])
app.include_router(friends.router, prefix="/api/friends", tags=["Friends"])
app.include_router(messages.router, prefix="/api/messages", tags=["Messages"])
app.include_router(websocket.router, prefix="/api", tags=["WebSocket"])
app.include_router(communities.router, prefix="/api", tags=["Communities"])
app.include_router(marketplace.router, prefix="/api", tags=["Marketplace"])
app.include_router(bots.router, prefix="/api/bots", tags=["Bots"])
app.include_router(notifications.router, prefix="/api", tags=["Notifications"])
app.include_router(photos.router, tags=["Photos"])
app.include_router(global_chat.router, prefix="/api", tags=["Global Chat"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
