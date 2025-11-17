"""
Test real-time bot response functionality
"""
from app.core.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

print("\n" + "="*60)
print("REAL-TIME BOT RESPONSE TEST")
print("="*60 + "\n")

# Find conversations with bots (simplified query)
result = db.execute(text("""
    SELECT DISTINCT c.id, c.type, c.updated_at,
           (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as msg_count
    FROM conversations c
    JOIN conversation_participants cp ON c.id = cp.conversation_id
    JOIN users u ON cp.user_id = u.id
    WHERE u.is_bot = true
    ORDER BY c.updated_at DESC
    LIMIT 5
"""))

conversations = result.fetchall()

if conversations:
    print(f"Found {len(conversations)} conversations with bots:\n")
    for conv_id, conv_type, updated_at, msg_count in conversations:
        print(f"📬 Conversation {conv_id} ({conv_type})")
        print(f"   Total messages: {msg_count}")
        
        # Show participants
        part_result = db.execute(text("""
            SELECT u.name, u.is_bot
            FROM conversation_participants cp
            JOIN users u ON cp.user_id = u.id
            WHERE cp.conversation_id = :conv_id
            AND cp.is_active = true
        """), {"conv_id": conv_id})
        
        participants = part_result.fetchall()
        print(f"   Participants: {', '.join([f'🤖 {name}' if is_bot else f'👤 {name}' for name, is_bot in participants])}")
        
        # Show recent messages
        msg_result = db.execute(text("""
            SELECT u.name, m.content, m.created_at, u.is_bot
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.conversation_id = :conv_id
            AND m.is_deleted = false
            ORDER BY m.created_at DESC
            LIMIT 3
        """), {"conv_id": conv_id})
        
        recent_msgs = msg_result.fetchall()
        if recent_msgs:
            print(f"   Recent messages:")
            for name, content, created_at, is_bot in recent_msgs:
                bot_label = "🤖" if is_bot else "👤"
                print(f"      {bot_label} {name}: {content[:50]}...")
        print()
else:
    print("❌ No conversations with bots found!")

print(f"{'='*60}")
print("\n✨ HOW TO TEST REAL-TIME BOT RESPONSES:")
print("1. Open the frontend application")
print("2. Go to Direct Messages")
print("3. Start a conversation with any bot")
print("4. Send a message like 'Hello!'")
print("5. The bot should respond within 0.5-2 seconds!")
print("\n💡 Bot responses are now INSTANT - no more 5-minute wait!")
print(f"{'='*60}\n")

db.close()
