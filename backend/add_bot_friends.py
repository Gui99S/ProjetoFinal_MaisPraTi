"""
Add all bots as friends to the Demo User
"""
from app.core.database import SessionLocal
from sqlalchemy import text
from datetime import datetime

db = SessionLocal()

print("\n" + "="*60)
print("ADDING ALL BOTS AS DEMO USER'S FRIENDS")
print("="*60 + "\n")

# Get demo user
demo_result = db.execute(text("""
    SELECT id, name, email FROM users WHERE email = 'test@example.com'
"""))
demo_user = demo_result.fetchone()

if not demo_user:
    print("❌ Demo user not found!")
    db.close()
    exit(1)

demo_id, demo_name, demo_email = demo_user
print(f"Demo User: {demo_name} (ID: {demo_id})")

# Get all bots
bots_result = db.execute(text("""
    SELECT id, name FROM users WHERE is_bot = true AND is_active = true
"""))
bots = bots_result.fetchall()

print(f"Found {len(bots)} active bots\n")

# Add friendships
friendships_added = 0
friendships_existed = 0

for bot_id, bot_name in bots:
    # Check if friendship already exists (check both directions since constraint is unique)
    check_result = db.execute(text("""
        SELECT id FROM friendships 
        WHERE (user_id = :demo_id AND friend_id = :bot_id)
           OR (user_id = :bot_id AND friend_id = :demo_id)
    """), {"demo_id": demo_id, "bot_id": bot_id})
    
    existing = check_result.fetchone()
    
    if existing:
        print(f"   ✓ Already friends with {bot_name}")
        friendships_existed += 1
    else:
        # Create friendship (accepted status)
        db.execute(text("""
            INSERT INTO friendships (user_id, friend_id, status, created_at, updated_at)
            VALUES (:demo_id, :bot_id, 'accepted', NOW(), NOW())
        """), {"demo_id": demo_id, "bot_id": bot_id})
        
        print(f"   ✅ Added {bot_name} as friend")
        friendships_added += 1

db.commit()

print(f"\n{'='*60}")
print(f"SUMMARY:")
print(f"   New friendships: {friendships_added}")
print(f"   Already friends: {friendships_existed}")
print(f"   Total bot friends: {len(bots)}")
print(f"{'='*60}\n")

# Show demo user's friend list
print("Demo User's current friends:")
friends_result = db.execute(text("""
    SELECT DISTINCT u.id, u.name, u.is_bot
    FROM friendships f
    JOIN users u ON (u.id = f.friend_id OR u.id = f.user_id)
    WHERE (f.user_id = :demo_id OR f.friend_id = :demo_id)
    AND u.id != :demo_id
    AND f.status = 'accepted'
    ORDER BY u.is_bot DESC, u.name
"""), {"demo_id": demo_id})

friends = friends_result.fetchall()
for friend_id, friend_name, is_bot in friends:
    icon = "🤖" if is_bot else "👤"
    print(f"   {icon} {friend_name}")

print(f"\n✨ Demo User can now see all {len(bots)} bots in their Friends list!")
print(f"💬 They can start Direct Message conversations instantly!\n")

db.close()
