"""
Check recent bot messages
"""
from app.core.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

print("\n" + "="*60)
print("RECENT BOT MESSAGE ACTIVITY")
print("="*60 + "\n")

# Check recent messages from bots (last 10 minutes)
result = db.execute(text("""
    SELECT m.id, m.conversation_id, u.name as bot_name, m.content, 
           m.created_at
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE u.is_bot = true
    AND m.created_at >= NOW() - INTERVAL '10 minutes'
    ORDER BY m.created_at DESC
    LIMIT 10
"""))

messages = result.fetchall()

if messages:
    print(f"Found {len(messages)} recent bot messages:\n")
    for msg_id, conv_id, bot_name, content, created_at in messages:
        print(f"📬 {bot_name} (Conversation {conv_id})")
        print(f"   Time: {created_at}")
        print(f"   Message: {content[:100]}...")
        print()
else:
    print("❌ No recent bot messages found in the last 10 minutes")
    print("\nChecking ALL bot messages:")
    
    all_result = db.execute(text("""
        SELECT COUNT(*) as total,
               MAX(m.created_at) as last_message
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE u.is_bot = true
    """))
    
    total, last_msg = all_result.fetchone()
    print(f"   Total bot messages: {total}")
    print(f"   Last bot message: {last_msg or 'Never'}")

print(f"\n{'='*60}")

# Check bot activities
activity_result = db.execute(text("""
    SELECT ba.id, u.name as bot_name, ba.activity_type, ba.description,
           ba.created_at, ba.success
    FROM bot_activities ba
    JOIN bots b ON ba.bot_id = b.id
    JOIN users u ON b.user_id = u.id
    WHERE ba.created_at >= NOW() - INTERVAL '10 minutes'
    ORDER BY ba.created_at DESC
    LIMIT 10
"""))

activities = activity_result.fetchall()

if activities:
    print(f"\nRecent bot activities ({len(activities)}):\n")
    for act_id, bot_name, act_type, desc, created_at, success in activities:
        status = "✅" if success else "❌"
        print(f"{status} {bot_name} - {act_type}")
        print(f"   {desc}")
        print(f"   Time: {created_at}")
        print()
else:
    print("\n❌ No recent bot activities in the last 10 minutes")

db.close()
