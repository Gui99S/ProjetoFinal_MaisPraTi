"""
Update bot activity frequencies to allow more frequent responses
"""
from app.core.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

print("\n" + "="*60)
print("UPDATING BOT ACTIVITY FREQUENCIES")
print("="*60 + "\n")

# Check current frequencies
result = db.execute(text("""
    SELECT b.id, u.name, b.activity_frequency
    FROM bots b
    JOIN users u ON b.user_id = u.id
    WHERE b.is_active = true
    ORDER BY b.id
"""))
bots = result.fetchall()

print(f"Current bot frequencies:")
for bot_id, name, frequency in bots:
    print(f"  - {name}: {frequency} minutes")

print(f"\n{'='*60}")
print("Updating all bots to 5-minute activity frequency...")
print(f"{'='*60}\n")

# Update all bots to 5-minute frequency
result = db.execute(text("""
    UPDATE bots
    SET activity_frequency = 5
    WHERE is_active = true
    RETURNING id
"""))
db.commit()

updated_count = len(result.fetchall())

print(f"✅ Updated {updated_count} bots to 5-minute activity frequency")
print(f"\nBots can now respond to messages every 5 minutes!")
print(f"This matches the scheduler interval.\n")

db.close()
