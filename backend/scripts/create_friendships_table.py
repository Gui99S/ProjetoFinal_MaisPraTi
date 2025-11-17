"""
Script to create friendships table
"""
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine


def create_friendships_table():
    """Create friendships table"""
    with engine.connect() as conn:
        # Check if table already exists
        result = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name='friendships'
        """))
        
        if result.fetchone():
            print("✓ Friendships table already exists")
            return
        
        # Create friendships table
        print("Creating friendships table...")
        conn.execute(text("""
            CREATE TABLE friendships (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                friend_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE,
                CONSTRAINT unique_friendship UNIQUE (user_id, friend_id),
                CONSTRAINT check_not_self CHECK (user_id != friend_id)
            )
        """))
        
        # Create indexes for better query performance
        conn.execute(text("""
            CREATE INDEX idx_friendships_user_id ON friendships(user_id);
        """))
        conn.execute(text("""
            CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);
        """))
        conn.execute(text("""
            CREATE INDEX idx_friendships_status ON friendships(status);
        """))
        
        conn.commit()
        print("✓ Friendships table created with indexes")


if __name__ == "__main__":
    print("=" * 50)
    print("Creating friendships table")
    print("=" * 50)
    
    create_friendships_table()
    
    print("\n✓ Migration complete!")
