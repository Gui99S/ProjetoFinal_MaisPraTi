"""
Diagnostic script to check bot conversations and messaging status
"""
from app.core.database import SessionLocal
from sqlalchemy import text
from datetime import datetime, timedelta

db = SessionLocal()

print("\n" + "="*60)
print("BOT CONVERSATION & MESSAGING DIAGNOSTIC")
print("="*60 + "\n")

# Get all bots with messaging enabled
bots = db.query(Bot).filter(Bot.can_message == True).all()
print(f"📊 Total bots with messaging enabled: {len(bots)}\n")

# Check each bot
for i, bot in enumerate(bots[:5], 1):  # Check first 5 bots
    print(f"{i}. Bot: {bot.user.name} (User ID: {bot.user_id})")
    print(f"   Personality: {bot.personality.value}")
    print(f"   Last activity: {bot.last_activity_at or 'Never'}")
    print(f"   Activity frequency: {bot.activity_frequency} minutes")
    
    # Check if bot has been active
    if bot.last_activity_at:
        time_since = datetime.utcnow() - bot.last_activity_at
        minutes_since = time_since.total_seconds() / 60
        print(f"   Minutes since last activity: {minutes_since:.1f}")
        can_act = minutes_since >= bot.activity_frequency
        print(f"   Can act now: {can_act}")
    else:
        print(f"   Can act now: True (never acted)")
    
    # Check conversations
    conversations = db.query(ConversationParticipant).filter(
        ConversationParticipant.user_id == bot.user_id,
        ConversationParticipant.is_active == True
    ).all()
    
    print(f"   💬 Active conversations: {len(conversations)}")
    
    if conversations:
        for conv_part in conversations:
            # Get conversation details
            conversation = db.query(Conversation).filter(
                Conversation.id == conv_part.conversation_id
            ).first()
            
            # Count messages in this conversation
            total_messages = db.query(Message).filter(
                Message.conversation_id == conversation.id,
                Message.is_deleted == False
            ).count()
            
            # Count messages from bot
            bot_messages = db.query(Message).filter(
                Message.conversation_id == conversation.id,
                Message.sender_id == bot.user_id,
                Message.is_deleted == False
            ).count()
            
            # Count recent messages NOT from bot (that bot could respond to)
            yesterday = datetime.utcnow() - timedelta(hours=24)
            recent_other_messages = db.query(Message).filter(
                Message.conversation_id == conversation.id,
                Message.sender_id != bot.user_id,
                Message.created_at >= yesterday,
                Message.is_deleted == False
            ).count()
            
            print(f"      - Conversation {conversation.id}: {total_messages} total messages")
            print(f"        Bot sent: {bot_messages}, Others (last 24h): {recent_other_messages}")
    
    print()

# Check total conversations and messages in the system
total_conversations = db.query(Conversation).count()
total_messages = db.query(Message).filter(Message.is_deleted == False).count()

print(f"\n{'='*60}")
print(f"SYSTEM TOTALS:")
print(f"Total conversations in system: {total_conversations}")
print(f"Total messages in system: {total_messages}")
print(f"{'='*60}\n")

# Check if demo user exists and has conversations with bots
from app.models.user import User
demo_user = db.query(User).filter(User.email == "test@example.com").first()
if demo_user:
    print(f"Demo user found: {demo_user.name} (ID: {demo_user.id})")
    user_conversations = db.query(ConversationParticipant).filter(
        ConversationParticipant.user_id == demo_user.id
    ).count()
    print(f"Demo user conversations: {user_conversations}\n")

db.close()
