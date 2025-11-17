"""
Reset bot last_activity_at to allow immediate responses
"""
from app.core.database import SessionLocal
from sqlalchemy import text
from datetime import datetime, timedelta

db = SessionLocal()

print("\n" + "="*60)
print("RESETTING BOT ACTIVITY TIMESTAMPS")
print("="*60 + "\n")

# Set last_activity_at to 10 minutes ago for all bots
ten_minutes_ago = datetime.utcnow() - timedelta(minutes=10)

result = db.execute(text("""
    UPDATE bots
    SET last_activity_at = :timestamp
    WHERE is_active = true
    RETURNING id
"""), {"timestamp": ten_minutes_ago})
db.commit()

updated_count = len(result.fetchall())

print(f"✅ Reset {updated_count} bot activity timestamps")
print(f"   Last activity set to: {ten_minutes_ago}")
print(f"\nBots can now act immediately on the next scheduler run!")
print(f"(Next scheduler run should happen within 5 minutes)\n")

db.close()
