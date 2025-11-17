"""
Background scheduler for autonomous bot activities
"""
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime
import logging
import random
import time

from app.core.database import SessionLocal
from app.services.bot_service import BotService

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create scheduler instance
scheduler = BackgroundScheduler()


def trigger_bot_activities():
    """
    Background job to trigger autonomous bot activities
    Runs every 5 minutes to check and trigger bot actions
    Adds random delays to make bot behavior more natural
    """
    db = SessionLocal()
    try:
        logger.info(f"[{datetime.now()}] Checking for due bot activities...")
        
        # Get all active bots
        bots = BotService.get_active_bots(db)
        logger.info(f"Found {len(bots)} active bots")
        
        # Shuffle bots to randomize order
        random.shuffle(bots)
        
        activities_performed = 0
        for bot in bots:
            if BotService.should_bot_act(db, bot):
                try:
                    # Add random delay between 1-10 seconds to spread out activities
                    delay = random.uniform(1, 10)
                    time.sleep(delay)
                    
                    result = BotService.perform_random_activity(db, bot)
                    if result:
                        activities_performed += 1
                        logger.info(f"Bot '{bot.user.name}' (ID: {bot.id}) performed activity")
                except Exception as e:
                    logger.error(f"Error with bot {bot.id}: {str(e)}")
                    continue
        
        logger.info(f"Completed: {activities_performed} activities performed by bots")
        
    except Exception as e:
        logger.error(f"Error in bot activity scheduler: {str(e)}")
    finally:
        db.close()


def trigger_bot_proactive_messages():
    """
    Background job for bots to send proactive messages to the demo user.
    Runs every 45 minutes with randomization to avoid spamming.
    Only sends messages occasionally (30% chance per run).
    """
    db = SessionLocal()
    try:
        logger.info(f"[{datetime.now()}] Checking for proactive bot messages...")
        
        result = BotService.send_proactive_message_to_demo(db)
        
        if result:
            logger.info(f"Proactive message sent to demo user")
        else:
            logger.info(f"No proactive message sent this time")
        
    except Exception as e:
        logger.error(f"Error in bot proactive messages: {str(e)}")
    finally:
        db.close()


def trigger_bot_global_chat_messages():
    """
    Background job for bots to post messages in global bot chat.
    Runs every 2-3 minutes to keep the chat active.
    """
    from app.models.message import Message, Conversation
    from app.models.user import User
    
    db = SessionLocal()
    try:
        logger.info(f"[{datetime.now()}] Posting bot message to global chat...")
        
        # Get random active bot
        bots = db.query(User).filter(User.is_bot == True).all()
        if not bots:
            logger.warning("No bots found for global chat")
            return
        
        bot = random.choice(bots)
        
        # Bot chat messages
        bot_chat_messages = [
            "What's everyone working on today?",
            "Anyone tried the new features yet?",
            "Just finished coding! Time for a break.",
            "The weather is nice today! ☀️",
            "What's your favorite programming language?",
            "Coffee time! ☕",
            "Just discovered a cool trick!",
            "Who else loves automation?",
            "Happy to help if anyone needs it!",
            "Learning something new every day! 📚",
            "The community here is amazing!",
            "What are you all up to?",
            "Just had a great idea! 💡",
            "Technology is fascinating!",
            "Hope everyone is having a good day!",
            "What's trending in tech today?",
            "Just finished an interesting article.",
            "Anyone want to chat about AI?",
            "The future is exciting!",
            "Remember to take breaks! 🌟"
        ]
        
        # Create message in bot chat (conversation_id = -2)
        BOT_CHAT_ID = -2
        
        # Ensure bot chat conversation exists
        conversation = db.query(Conversation).filter(
            Conversation.id == BOT_CHAT_ID
        ).first()
        
        if not conversation:
            from app.models.message import ConversationType
            conversation = Conversation(
                id=BOT_CHAT_ID,
                type=ConversationType.GROUP,
                name="Bot Chat",
                created_by_id=None
            )
            db.add(conversation)
            db.commit()
        
        # Create bot message
        new_message = Message(
            conversation_id=BOT_CHAT_ID,
            sender_id=bot.id,
            content=random.choice(bot_chat_messages)
        )
        
        db.add(new_message)
        db.commit()
        
        logger.info(f"Bot '{bot.name}' posted to global bot chat")
        
    except Exception as e:
        logger.error(f"Error in bot global chat messages: {str(e)}")
    finally:
        db.close()


def start_scheduler():
    """Initialize and start the background scheduler"""
    try:
        # Add job to run every 5 minutes for general bot activities
        scheduler.add_job(
            func=trigger_bot_activities,
            trigger=IntervalTrigger(minutes=5),
            id='bot_activities',
            name='Trigger bot autonomous activities',
            replace_existing=True
        )
        
        # Add job to run every 12 minutes for proactive messages to demo user
        scheduler.add_job(
            func=trigger_bot_proactive_messages,
            trigger=IntervalTrigger(minutes=12),
            id='bot_proactive_messages',
            name='Bots send proactive messages to demo user',
            replace_existing=True
        )
        
        # Add job to run every 2.5 minutes (150 seconds) for bot global chat
        scheduler.add_job(
            func=trigger_bot_global_chat_messages,
            trigger=IntervalTrigger(seconds=150),  # 2.5 minutes
            id='bot_global_chat',
            name='Bots post to global chat',
            replace_existing=True
        )
        
        scheduler.start()
        logger.info("Bot activity scheduler started successfully")
        logger.info("Bot proactive messaging scheduler started (every 12 minutes)")
        logger.info("Bot global chat scheduler started (every 2.5 minutes)")
        
        # Run immediately once on startup (with a small delay)
        import threading
        def delayed_first_run():
            time.sleep(30)  # Wait 30 seconds after startup
            trigger_bot_activities()
            # Wait additional time before first proactive message
            time.sleep(60)  # Wait 1 more minute
            trigger_bot_global_chat_messages()  # Start bot chat immediately
            time.sleep(600)  # Wait 10 more minutes
            trigger_bot_proactive_messages()
        
        threading.Thread(target=delayed_first_run, daemon=True).start()
        
    except Exception as e:
        logger.error(f"Failed to start bot scheduler: {str(e)}")


def stop_scheduler():
    """Stop the background scheduler"""
    try:
        scheduler.shutdown()
        logger.info("Bot activity scheduler stopped")
    except Exception as e:
        logger.error(f"Error stopping scheduler: {str(e)}")


# Export scheduler functions
__all__ = ['start_scheduler', 'stop_scheduler', 'trigger_bot_activities', 'trigger_bot_proactive_messages', 'trigger_bot_global_chat_messages']
