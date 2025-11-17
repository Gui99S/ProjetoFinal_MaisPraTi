"""
Diagnostic script to check bot conversations using raw SQL
"""
from app.core.database import SessionLocal
from sqlalchemy import text
from datetime import datetime, timedelta

db = SessionLocal()

print("\n" + "="*60)
print("BOT CONVERSATION & MESSAGING DIAGNOSTIC")
print("="*60 + "\n")

# Get all bots with messaging enabled
result = db.execute(text("""
    SELECT b.id, b.user_id, u.name, b.personality, b.last_activity_at, 
           b.activity_frequency, b.can_message
    FROM bots b
    JOIN users u ON b.user_id = u.id
    WHERE b.can_message = true AND b.is_active = true
    ORDER BY b.id
    LIMIT 10
"""))
bots = result.fetchall()

print(f"📊 Total bots with messaging enabled: {len(bots)}\n")

# Check each bot
for i, bot in enumerate(bots, 1):
    bot_id, user_id, name, personality, last_activity, frequency, can_message = bot
    
    print(f"{i}. Bot: {name} (User ID: {user_id})")
    print(f"   Personality: {personality}")
    print(f"   Last activity: {last_activity or 'Never'}")
    print(f"   Activity frequency: {frequency} minutes")
    
    # Check if bot has been active
    if last_activity:
        time_since = datetime.utcnow() - last_activity
        minutes_since = time_since.total_seconds() / 60
        print(f"   Minutes since last activity: {minutes_since:.1f}")
        can_act = minutes_since >= frequency
        print(f"   Can act now: {can_act}")
    else:
        print(f"   Can act now: True (never acted)")
    
    # Check conversations
    conv_result = db.execute(text("""
        SELECT COUNT(*) FROM conversation_participants 
        WHERE user_id = :user_id AND is_active = true
    """), {"user_id": user_id})
    conversation_count = conv_result.scalar()
    
    print(f"   💬 Active conversations: {conversation_count}")
    
    if conversation_count > 0:
        # Get conversation details
        conv_details = db.execute(text("""
            SELECT cp.conversation_id, 
                   (SELECT COUNT(*) FROM messages 
                    WHERE conversation_id = cp.conversation_id AND is_deleted = false) as total_msgs,
                   (SELECT COUNT(*) FROM messages 
                    WHERE conversation_id = cp.conversation_id 
                    AND sender_id = :user_id AND is_deleted = false) as bot_msgs,
                   (SELECT COUNT(*) FROM messages 
                    WHERE conversation_id = cp.conversation_id 
                    AND sender_id != :user_id 
                    AND created_at >= :yesterday 
                    AND is_deleted = false) as recent_other_msgs
            FROM conversation_participants cp
            WHERE cp.user_id = :user_id AND cp.is_active = true
        """), {"user_id": user_id, "yesterday": datetime.utcnow() - timedelta(hours=24)})
        
        for conv in conv_details:
            conv_id, total_msgs, bot_msgs, recent_other_msgs = conv
            print(f"      - Conversation {conv_id}: {total_msgs} total messages")
            print(f"        Bot sent: {bot_msgs}, Others (last 24h): {recent_other_msgs}")
    
    print()

# Check total conversations and messages in the system
total_conv = db.execute(text("SELECT COUNT(*) FROM conversations")).scalar()
total_msgs = db.execute(text("SELECT COUNT(*) FROM messages WHERE is_deleted = false")).scalar()

print(f"\n{'='*60}")
print(f"SYSTEM TOTALS:")
print(f"Total conversations in system: {total_conv}")
print(f"Total messages in system: {total_msgs}")
print(f"{'='*60}\n")

# Check if demo user exists and has conversations
demo_result = db.execute(text("""
    SELECT u.id, u.name, u.email,
           (SELECT COUNT(*) FROM conversation_participants 
            WHERE user_id = u.id) as conversation_count
    FROM users u
    WHERE u.email = 'test@example.com'
"""))
demo_user = demo_result.fetchone()

if demo_user:
    user_id, name, email, conv_count = demo_user
    print(f"Demo user found: {name} (ID: {user_id})")
    print(f"Demo user conversations: {conv_count}")
    
    # Check if demo user has any conversations with bots
    bot_conv_result = db.execute(text("""
        SELECT c.id, c.is_group,
               STRING_AGG(u.name, ', ') as participants
        FROM conversations c
        JOIN conversation_participants cp ON c.id = cp.conversation_id
        JOIN users u ON cp.user_id = u.id
        WHERE c.id IN (
            SELECT conversation_id FROM conversation_participants WHERE user_id = :demo_user_id
        )
        GROUP BY c.id, c.is_group
    """), {"demo_user_id": user_id})
    
    demo_conversations = bot_conv_result.fetchall()
    if demo_conversations:
        print(f"\nDemo user's conversations:")
        for conv_id, is_group, participants in demo_conversations:
            conv_type = "Group" if is_group else "Direct"
            print(f"   - Conversation {conv_id} ({conv_type}): {participants}")
    else:
        print(f"\n⚠️  Demo user has NO conversations yet!")
else:
    print("⚠️  Demo user not found!")

print()
db.close()
