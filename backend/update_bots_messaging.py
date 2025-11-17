"""
Update all existing bots to enable messaging capability
Run this script once to update all bots in the database
"""
from app.core.database import SessionLocal
from app.models.bot import Bot
from sqlalchemy import update

def enable_bot_messaging():
    """Enable messaging for all bots"""
    db = SessionLocal()
    try:
        # Update all bots to enable messaging
        result = db.execute(
            update(Bot).values(can_message=True)
        )
        db.commit()
        
        updated_count = result.rowcount
        print(f"✅ Updated {updated_count} bots to enable messaging")
        
        # Verify
        active_bots = db.query(Bot).filter(Bot.is_active == True).count()
        messaging_enabled = db.query(Bot).filter(Bot.can_message == True).count()
        
        print(f"📊 Total active bots: {active_bots}")
        print(f"💬 Bots with messaging enabled: {messaging_enabled}")
        
    except Exception as e:
        print(f"❌ Error updating bots: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🤖 Enabling messaging for all bots...")
    enable_bot_messaging()
    print("✅ Done!")
