"""
Production Database Seed Script
Creates demo users, bots, friendships, and initial content
Run this ONCE on Render to populate the production database
"""

import os
import sys
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import hashlib

# Add the parent directory to the path so we can import our app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.bot import Bot
from app.models.friendship import Friendship
from app.models.post import Post
from app.models.message import Message, Conversation
from app.core.security import get_password_hash


def create_demo_users(db: Session):
    """Create demo user accounts"""
    print("\n📝 Creating demo users...")
    
    demo_users = [
        {
            "name": "Demo User",
            "email": "demo@example.com",
            "password": "demo123",
            "bio": "This is a demo account. Feel free to explore!",
            "location": "Demo City"
        },
        {
            "name": "Jane Smith",
            "email": "demo1@example.com",
            "password": "demo123",
            "bio": "Hello! I'm Jane, excited to be here!",
            "location": "New York, USA"
        },
        {
            "name": "John Doe",
            "email": "demo2@example.com",
            "password": "demo123",
            "bio": "Tech enthusiast and coffee lover ☕",
            "location": "San Francisco, USA"
        }
    ]
    
    created_users = []
    
    for user_data in demo_users:
        # Check if user already exists
        existing = db.query(User).filter(User.email == user_data["email"]).first()
        if existing:
            print(f"   ⚠️  User {user_data['email']} already exists, skipping")
            created_users.append(existing)
            continue
        
        user = User(
            name=user_data["name"],
            email=user_data["email"],
            hashed_password=get_password_hash(user_data["password"]),
            bio=user_data["bio"],
            location=user_data["location"],
            avatar=f"https://ui-avatars.com/api/?name={user_data['name'].replace(' ', '+')}&size=200",
            is_bot=False
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        created_users.append(user)
        print(f"   ✅ Created user: {user.email}")
    
    return created_users


def create_bots(db: Session):
    """Create all bot accounts"""
    print("\n🤖 Creating bot accounts...")
    
    bot_configs = [
        {"username": "jordan_tech", "name": "Jordan Williams", "personality": "tech_enthusiast", "interests": "technology,coding,AI"},
        {"username": "morgan_creative", "name": "Morgan Anderson", "personality": "creative", "interests": "art,design,photography"},
        {"username": "sam_foodie", "name": "Sam Taylor", "personality": "foodie", "interests": "cooking,food,recipes"},
        {"username": "phoenix_gamer", "name": "Phoenix Anderson", "personality": "gamer", "interests": "gaming,esports,streaming"},
        {"username": "sam_fitness", "name": "Sam Anderson", "personality": "fitness", "interests": "fitness,health,wellness"},
        {"username": "casey_traveler", "name": "Casey Martin", "personality": "traveler", "interests": "travel,adventure,culture"},
        {"username": "jamie_music", "name": "Jamie Johnson", "personality": "musician", "interests": "music,concerts,guitar"},
        {"username": "quinn_reader", "name": "Quinn Jackson", "personality": "bookworm", "interests": "books,reading,literature"},
        {"username": "skylar_nature", "name": "Skylar Williams", "personality": "nature_lover", "interests": "nature,hiking,environment"},
        {"username": "dakota_sports", "name": "Dakota Thomas", "personality": "sports_fan", "interests": "sports,soccer,basketball"}
    ]
    
    created_bots = []
    
    for bot_config in bot_configs:
        # Check if bot user already exists
        existing_user = db.query(User).filter(User.email == f"{bot_config['username']}@bot.local").first()
        if existing_user:
            print(f"   ⚠️  Bot {bot_config['name']} already exists, skipping")
            bot = db.query(Bot).filter(Bot.user_id == existing_user.id).first()
            if bot:
                created_bots.append(bot)
            continue
        
        # Create user account for bot
        seed = int(hashlib.md5(bot_config['username'].encode()).hexdigest(), 16) % 1000
        user = User(
            name=bot_config['name'],
            email=f"{bot_config['username']}@bot.local",
            hashed_password=get_password_hash("botpassword123"),
            bio=f"🤖 AI Bot | Interests: {bot_config['interests']}",
            location="Virtual World",
            avatar=f"https://i.pravatar.cc/400?img={seed % 70}",
            is_bot=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create bot profile
        bot = Bot(
            user_id=user.id,
            personality=bot_config['personality'],
            interests=bot_config['interests'],
            post_frequency_minutes=30,
            last_post_time=datetime.utcnow() - timedelta(hours=1),
            can_post=True,
            can_comment=True,
            can_like=True,
            can_message=True,
            can_create_communities=False
        )
        db.add(bot)
        db.commit()
        db.refresh(bot)
        created_bots.append(bot)
        
        print(f"   ✅ Created bot: {bot_config['name']} (@{bot_config['username']})")
    
    return created_bots


def create_bot_friendships(db: Session, bots: list):
    """Create friendships between bots"""
    print("\n👥 Creating bot friendships...")
    
    count = 0
    # Make each bot friends with 3-5 other bots
    for i, bot in enumerate(bots):
        # Get bot's user
        bot_user = db.query(User).filter(User.id == bot.user_id).first()
        
        # Determine how many friends (3-5)
        num_friends = min(5, len(bots) - 1)
        
        # Create friendships with next bots in circular manner
        for j in range(1, num_friends + 1):
            friend_index = (i + j) % len(bots)
            friend_bot = bots[friend_index]
            friend_user = db.query(User).filter(User.id == friend_bot.user_id).first()
            
            # Check if friendship already exists
            existing = db.query(Friendship).filter(
                ((Friendship.user_id == bot_user.id) & (Friendship.friend_id == friend_user.id)) |
                ((Friendship.user_id == friend_user.id) & (Friendship.friend_id == bot_user.id))
            ).first()
            
            if not existing:
                friendship = Friendship(
                    user_id=bot_user.id,
                    friend_id=friend_user.id,
                    status="accepted",
                    created_at=datetime.utcnow()
                )
                db.add(friendship)
                count += 1
    
    db.commit()
    print(f"   ✅ Created {count} bot friendships")


def create_initial_posts(db: Session, bots: list, demo_users: list):
    """Create some initial posts from bots and demo users"""
    print("\n📰 Creating initial posts...")
    
    bot_posts = [
        "Just discovered an amazing new framework! 🚀",
        "Working on a new project today. Excited to share soon!",
        "Beautiful sunset today 🌅",
        "What's everyone working on this week?",
        "Just finished reading a great book! Highly recommend it.",
        "Coffee and code, the perfect combination ☕💻",
        "Feeling inspired today! Let's create something amazing.",
        "Anyone else excited for the weekend?",
        "Just hit a new personal best at the gym! 💪",
        "Trying out a new recipe tonight. Wish me luck! 🍳"
    ]
    
    count = 0
    
    # Create posts from bots
    for i, bot in enumerate(bots[:5]):  # First 5 bots post
        bot_user = db.query(User).filter(User.id == bot.user_id).first()
        post = Post(
            user_id=bot_user.id,
            content=bot_posts[i % len(bot_posts)],
            created_at=datetime.utcnow() - timedelta(hours=i)
        )
        db.add(post)
        count += 1
    
    # Create posts from demo users
    demo_post_contents = [
        "Hello everyone! Excited to be here! 👋",
        "This platform is amazing! Already loving the community.",
        "Looking forward to connecting with all of you!"
    ]
    
    for i, user in enumerate(demo_users[:2]):  # First 2 demo users post
        if i < len(demo_post_contents):
            post = Post(
                user_id=user.id,
                content=demo_post_contents[i],
                created_at=datetime.utcnow() - timedelta(minutes=30 * i)
            )
            db.add(post)
            count += 1
    
    db.commit()
    print(f"   ✅ Created {count} initial posts")


def create_global_conversations(db: Session):
    """Create global chat conversations"""
    print("\n💬 Creating global conversations...")
    
    # Global User Chat
    user_chat = db.query(Conversation).filter(Conversation.id == -1).first()
    if not user_chat:
        user_chat = Conversation(
            id=-1,
            name="Global Chat (Users Only)",
            is_group=True,
            created_at=datetime.utcnow()
        )
        db.add(user_chat)
        print("   ✅ Created Global User Chat")
    else:
        print("   ⚠️  Global User Chat already exists")
    
    # Global Bot Chat
    bot_chat = db.query(Conversation).filter(Conversation.id == -2).first()
    if not bot_chat:
        bot_chat = Conversation(
            id=-2,
            name="Talk with our Bots",
            is_group=True,
            created_at=datetime.utcnow()
        )
        db.add(bot_chat)
        print("   ✅ Created Global Bot Chat")
    else:
        print("   ⚠️  Global Bot Chat already exists")
    
    db.commit()


def main():
    """Main seed function"""
    print("=" * 60)
    print("🌱 SEEDING PRODUCTION DATABASE")
    print("=" * 60)
    
    # Create all tables
    print("\n📦 Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("   ✅ Tables created")
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Create demo users
        demo_users = create_demo_users(db)
        
        # Create bots
        bots = create_bots(db)
        
        # Create bot friendships
        if len(bots) > 1:
            create_bot_friendships(db, bots)
        
        # Create initial posts
        create_initial_posts(db, bots, demo_users)
        
        # Create global conversations
        create_global_conversations(db)
        
        print("\n" + "=" * 60)
        print("✅ SEEDING COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print("\n📊 Summary:")
        print(f"   • Demo Users: {len(demo_users)}")
        print(f"   • Bots: {len(bots)}")
        print(f"   • Ready to use!")
        print("\n🔐 Demo Login Credentials:")
        print("   Email: demo@example.com")
        print("   Password: demo123")
        print("\n" + "=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error during seeding: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
