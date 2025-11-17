"""
Script to update all existing bot avatars to use Pravatar
"""
import sys
import os
import hashlib

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/social_media")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def update_bot_avatars():
    """Update all bot avatars to use Pravatar"""
    db = SessionLocal()
    
    try:
        # Get all bots with their user info using raw SQL
        query = text("""
            SELECT b.id, b.user_id, u.name, u.avatar
            FROM bots b
            JOIN users u ON u.id = b.user_id
            WHERE u.is_bot = true
        """)
        
        result = db.execute(query)
        bots = result.fetchall()
        
        print(f"Found {len(bots)} bots to update")
        
        updated_count = 0
        for bot in bots:
            bot_id, user_id, name, old_avatar = bot
            
            # Generate a stable seed from name
            seed = int(hashlib.md5(name.encode()).hexdigest(), 16) % 1000
            
            # Generate new avatar URL using Pravatar
            new_avatar = f"https://i.pravatar.cc/400?img={seed % 70}"
            
            # Update the avatar
            update_query = text("UPDATE users SET avatar = :avatar WHERE id = :user_id")
            db.execute(update_query, {"avatar": new_avatar, "user_id": user_id})
            
            print(f"✅ Updated bot '{name}':")
            print(f"   Avatar ID: {seed % 70}")
            print(f"   Old: {old_avatar}")
            print(f"   New: {new_avatar}")
            
            updated_count += 1
        
        # Commit all changes
        db.commit()
        print(f"\n✨ Successfully updated {updated_count} bot avatars!")
        
    except Exception as e:
        print(f"❌ Error updating bot avatars: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    print("🤖 Starting bot avatar update...")
    print("=" * 50)
    update_bot_avatars()
    print("=" * 50)
    print("✅ Done!")
