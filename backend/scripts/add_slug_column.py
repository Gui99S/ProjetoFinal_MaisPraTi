"""
Script to add slug column to users table and populate existing users with unique slugs
"""
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine, SessionLocal
from app.models.user import User
from app.models.post import Post, Comment, Like  # Import all models to avoid relationship errors
from app.core.utils import generate_user_slug


def add_slug_column():
    """Add slug column to users table"""
    with engine.connect() as conn:
        # Check if column already exists
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' AND column_name='slug'
        """))
        
        if result.fetchone():
            print("✓ Slug column already exists")
            return
        
        # Add slug column
        print("Adding slug column to users table...")
        conn.execute(text("ALTER TABLE users ADD COLUMN slug VARCHAR(150) UNIQUE"))
        conn.commit()
        print("✓ Slug column added")


def populate_slugs():
    """Populate slug field for existing users"""
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.slug == None).all()
        
        if not users:
            print("✓ All users already have slugs")
            return
        
        print(f"Populating slugs for {len(users)} users...")
        
        for user in users:
            user.slug = generate_user_slug(user.name, db, exclude_id=user.id)
            print(f"  - {user.name} → {user.slug}")
        
        db.commit()
        print(f"✓ Successfully populated {len(users)} slugs")
        
    except Exception as e:
        db.rollback()
        print(f"✗ Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 50)
    print("Adding slug column and populating existing users")
    print("=" * 50)
    
    add_slug_column()
    populate_slugs()
    
    print("\n✓ Migration complete!")
