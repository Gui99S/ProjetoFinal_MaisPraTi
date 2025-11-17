"""
Initialize global chat conversations and add some initial messages
"""
import sys
from sqlalchemy.orm import Session
from app.core.database import SessionLocal

# Import all models to avoid circular import issues
from app.models import user, post, friendship, message, community, product, bot, notification, photo
from app.models.message import Message, Conversation, ConversationType
from app.models.user import User

def init_global_chats():
    db = SessionLocal()
    try:
        print("Initializing global chat conversations...")
        
        # Create or update Global Chat (users only)
        GLOBAL_CHAT_ID = -1
        global_chat = db.query(Conversation).filter(Conversation.id == GLOBAL_CHAT_ID).first()
        
        if not global_chat:
            print("Creating Global Chat conversation...")
            global_chat = Conversation(
                id=GLOBAL_CHAT_ID,
                type=ConversationType.GROUP,
                name="Global Chat",
                created_by_id=None
            )
            db.add(global_chat)
            db.commit()
            print("✓ Global Chat created")
        else:
            print("✓ Global Chat already exists")
        
        # Create or update Bot Chat
        BOT_CHAT_ID = -2
        bot_chat = db.query(Conversation).filter(Conversation.id == BOT_CHAT_ID).first()
        
        if not bot_chat:
            print("Creating Bot Chat conversation...")
            bot_chat = Conversation(
                id=BOT_CHAT_ID,
                type=ConversationType.GROUP,
                name="Bot Chat",
                created_by_id=None
            )
            db.add(bot_chat)
            db.commit()
            print("✓ Bot Chat created")
        else:
            print("✓ Bot Chat already exists")
        
        # Add some initial messages to Global Chat
        global_message_count = db.query(Message).filter(
            Message.conversation_id == GLOBAL_CHAT_ID
        ).count()
        
        if global_message_count == 0:
            print("Adding initial messages to Global Chat...")
            
            # Get some non-bot users
            users = db.query(User).filter(User.is_bot == False).limit(3).all()
            
            if users:
                initial_messages = [
                    "Welcome to the global chat!",
                    "Hey everyone! How's it going?",
                    "This is a great platform!",
                ]
                
                for i, user in enumerate(users[:len(initial_messages)]):
                    msg = Message(
                        conversation_id=GLOBAL_CHAT_ID,
                        sender_id=user.id,
                        content=initial_messages[i]
                    )
                    db.add(msg)
                
                db.commit()
                print(f"✓ Added {len(initial_messages)} initial messages to Global Chat")
            else:
                print("⚠ No non-bot users found to add initial messages")
        else:
            print(f"✓ Global Chat already has {global_message_count} messages")
        
        # Add some initial messages to Bot Chat
        bot_message_count = db.query(Message).filter(
            Message.conversation_id == BOT_CHAT_ID
        ).count()
        
        if bot_message_count == 0:
            print("Adding initial messages to Bot Chat...")
            
            # Get some bots
            bots = db.query(User).filter(User.is_bot == True).limit(3).all()
            
            if bots:
                bot_initial_messages = [
                    "Hello! I'm here to help you! 🤖",
                    "Feel free to ask me anything!",
                    "Welcome to the bot chat! Let's have a conversation!",
                ]
                
                for i, bot in enumerate(bots[:len(bot_initial_messages)]):
                    msg = Message(
                        conversation_id=BOT_CHAT_ID,
                        sender_id=bot.id,
                        content=bot_initial_messages[i]
                    )
                    db.add(msg)
                
                db.commit()
                print(f"✓ Added {len(bot_initial_messages)} initial messages to Bot Chat")
            else:
                print("⚠ No bots found to add initial messages")
        else:
            print(f"✓ Bot Chat already has {bot_message_count} messages")
        
        print("\n✅ Global chats initialized successfully!")
        print(f"Global Chat ID: {GLOBAL_CHAT_ID}")
        print(f"Bot Chat ID: {BOT_CHAT_ID}")
        
    except Exception as e:
        print(f"❌ Error initializing global chats: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_global_chats()
