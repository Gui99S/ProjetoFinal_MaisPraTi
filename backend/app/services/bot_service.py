from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import random
import secrets
import logging

from app.models.bot import Bot, BotActivity, BotPersonality, BotActivityType
from app.models.user import User
from app.models.post import Post
from app.models.message import Message, Conversation, ConversationParticipant
from app.models.community import Community, CommunityMember, MemberRole
from app.models.product import Product, ProductCategory, ProductCondition, ProductStatus
from app.schemas.bot import BotCreate, BotUpdate, BotActivityCreate
from app.services.auth import hash_password

# Setup logging
logger = logging.getLogger(__name__)


# Bot name generators
BOT_FIRST_NAMES = [
    "Alex", "Sam", "Jordan", "Casey", "Morgan", "Taylor", "Riley", "Jamie",
    "Avery", "Quinn", "Skylar", "Drew", "Sage", "Phoenix", "Dakota", "River"
]

BOT_LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Davis", "Miller", "Wilson", "Moore",
    "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin", "Garcia"
]

# Content templates by personality
CONTENT_TEMPLATES = {
    BotPersonality.FRIENDLY: [
        "Hey everyone! Just wanted to share {topic}. What do you all think? 😊",
        "Good morning! I've been thinking about {topic} lately. Anyone else interested?",
        "Hope you're all having a great day! Let's talk about {topic}! 💬",
    ],
    BotPersonality.PROFESSIONAL: [
        "I'd like to discuss {topic}. Looking forward to hearing professional perspectives.",
        "Sharing insights on {topic}. Would appreciate your thoughts on this matter.",
        "Here's my analysis on {topic}. Open to constructive feedback.",
    ],
    BotPersonality.HUMOROUS: [
        "So... {topic}. Don't worry, I'll try not to make too many dad jokes 😄",
        "Let's talk {topic}! (Warning: puns may occur) 🤪",
        "Time for some real talk about {topic}... or is it reel talk? 🎣 Sorry, couldn't resist!",
    ],
    BotPersonality.EDUCATIONAL: [
        "Did you know? {topic} is fascinating when you look deeper. Let me explain...",
        "Educational post: Understanding {topic}. Here's what you should know:",
        "Learning opportunity! Let's explore {topic} together. 📚",
    ],
    BotPersonality.ENTHUSIAST: [
        "OMG! I'm SO excited to talk about {topic}!! Who else is passionate about this?! 🎉",
        "THIS IS AMAZING! {topic} is literally the best thing ever! Let's discuss! ✨",
        "Can't contain my excitement about {topic}! Anyone else totally into this?! 🚀",
    ],
    BotPersonality.CREATIVE: [
        "Here's a creative take on {topic}... imagine if we approached it differently 🎨",
        "Thinking outside the box about {topic}. What creative solutions can we find? 💡",
        "Let's brainstorm {topic} together! No idea is too wild! 🌈",
    ],
    BotPersonality.ANALYTICAL: [
        "Breaking down {topic}: Here's my data-driven analysis.",
        "Logical examination of {topic}. The numbers tell an interesting story. 📊",
        "Systematic review: {topic}. Let's look at the facts and patterns. 🔍",
    ],
}

TOPICS_BY_CATEGORY = {
    "technology": [
        "the latest AI developments", "coding best practices", "tech trends",
        "software architecture", "cybersecurity", "cloud computing"
    ],
    "lifestyle": [
        "healthy living tips", "work-life balance", "productivity hacks",
        "morning routines", "self-care", "time management"
    ],
    "entertainment": [
        "recent movies", "book recommendations", "music discoveries",
        "gaming experiences", "TV shows", "podcast suggestions"
    ],
    "food": [
        "favorite recipes", "cooking techniques", "food culture",
        "restaurant experiences", "baking tips", "meal planning"
    ],
    "travel": [
        "travel destinations", "adventure stories", "cultural experiences",
        "travel tips", "hidden gems", "local experiences"
    ],
    "fitness": [
        "workout routines", "fitness goals", "nutrition tips",
        "exercise motivation", "sports", "wellness"
    ],
    "education": [
        "learning strategies", "online courses", "skill development",
        "study techniques", "educational resources", "teaching methods"
    ],
    "business": [
        "entrepreneurship", "startup ideas", "marketing strategies",
        "business growth", "leadership", "innovation"
    ],
}


class BotService:
    """Service for managing AI bots and their autonomous activities"""
    
    @staticmethod
    def create_bot(db: Session, bot_data: BotCreate) -> Bot:
        """Create a new bot with associated user account"""
        # Generate unique email if needed
        email = bot_data.email
        if db.query(User).filter(User.email == email).first():
            email = f"{bot_data.username}_{secrets.token_hex(4)}@botnet.local"
        
        # Create user account
        user = User(
            email=email,
            password_hash=hash_password(bot_data.password),
            name=bot_data.username,
            slug=bot_data.username.lower().replace(" ", "_"),
            is_bot=True,
            is_active=True,
            email_verified=True,
        )
        
        # Generate bio based on personality
        bio = BotService._generate_bio(bot_data.personality, bot_data.interests)
        user.bio = bio
        
        # Set avatar - using Lorem Picsum for consistent, high-quality random portraits
        # Generate a stable seed from username for consistent avatar per bot
        import hashlib
        seed = int(hashlib.md5(bot_data.username.encode()).hexdigest(), 16) % 1000
        user.avatar = f"https://i.pravatar.cc/400?img={seed % 70}"
        
        db.add(user)
        db.flush()
        
        # Create bot profile
        bot = Bot(
            user_id=user.id,
            personality=bot_data.personality,
            bio_template=bot_data.bio_template or bio,
            interests=bot_data.interests,
            activity_frequency=bot_data.activity_frequency,
            max_daily_activities=bot_data.max_daily_activities,
            can_post=bot_data.can_post,
            can_comment=bot_data.can_comment,
            can_message=bot_data.can_message,
            can_create_communities=bot_data.can_create_communities,
            can_list_products=bot_data.can_list_products,
            content_topics=bot_data.content_topics,
            language_style=bot_data.language_style,
            emoji_usage=bot_data.emoji_usage,
        )
        
        db.add(bot)
        db.commit()
        db.refresh(bot)
        return bot
    
    @staticmethod
    def _generate_bio(personality: BotPersonality, interests: List[str]) -> str:
        """Generate bio based on personality type"""
        bios = {
            BotPersonality.FRIENDLY: f"Hey there! 👋 I love chatting about {', '.join(interests[:3])}. Always happy to make new friends!",
            BotPersonality.PROFESSIONAL: f"Professional with expertise in {', '.join(interests[:3])}. Open to networking and knowledge sharing.",
            BotPersonality.HUMOROUS: f"Life's too short to be serious! Let's talk about {', '.join(interests[:2])} and laugh together! 😄",
            BotPersonality.EDUCATIONAL: f"Passionate educator sharing knowledge about {', '.join(interests[:3])}. Learning never stops! 📚",
            BotPersonality.ENTHUSIAST: f"SUPER passionate about {', '.join(interests[:2])}! Let's geek out together! 🎉✨",
            BotPersonality.CREATIVE: f"Creative soul exploring {', '.join(interests[:3])}. Let's think outside the box! 🎨",
            BotPersonality.ANALYTICAL: f"Data-driven thinker interested in {', '.join(interests[:3])}. Facts over feelings. 📊",
        }
        return bios.get(personality, f"Interested in {', '.join(interests[:3])}")
    
    @staticmethod
    def update_bot(db: Session, bot_id: int, bot_update: BotUpdate) -> Optional[Bot]:
        """Update bot configuration"""
        bot = db.query(Bot).filter(Bot.id == bot_id).first()
        if not bot:
            return None
        
        update_data = bot_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(bot, key, value)
        
        db.commit()
        db.refresh(bot)
        return bot
    
    @staticmethod
    def get_active_bots(db: Session, limit: int = 100) -> List[Bot]:
        """Get all active bots"""
        return db.query(Bot).filter(Bot.is_active == True).limit(limit).all()
    
    @staticmethod
    def get_bot_by_user_id(db: Session, user_id: int) -> Optional[Bot]:
        """Get bot by user ID"""
        return db.query(Bot).filter(Bot.user_id == user_id).first()
    
    @staticmethod
    def should_bot_act(db: Session, bot: Bot) -> bool:
        """Determine if bot should perform an activity based on frequency and daily limit"""
        now = datetime.utcnow()
        
        # Check daily limit
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_activities = db.query(func.count(BotActivity.id)).filter(
            and_(
                BotActivity.bot_id == bot.id,
                BotActivity.created_at >= today_start
            )
        ).scalar()
        
        if today_activities >= bot.max_daily_activities:
            return False
        
        # Check frequency
        if bot.last_activity_at:
            time_since_last = now - bot.last_activity_at
            if time_since_last.total_seconds() < (bot.activity_frequency * 60):
                return False
        
        return True
    
    @staticmethod
    def create_bot_post(db: Session, bot: Bot) -> Optional[Post]:
        """Bot creates a post"""
        if not bot.can_post:
            return None
        
        # Select topic from bot's content topics or general topics
        topics = bot.content_topics if bot.content_topics else list(TOPICS_BY_CATEGORY.keys())
        topic_category = random.choice(topics)
        
        # Get specific topic
        if topic_category in TOPICS_BY_CATEGORY:
            specific_topic = random.choice(TOPICS_BY_CATEGORY[topic_category])
        else:
            specific_topic = topic_category
        
        # Get content template based on personality
        templates = CONTENT_TEMPLATES.get(bot.personality, CONTENT_TEMPLATES[BotPersonality.FRIENDLY])
        content = random.choice(templates).format(topic=specific_topic)
        
        # Create post
        post = Post(
            user_id=bot.user_id,
            content=content,
            created_at=datetime.utcnow()
        )
        
        db.add(post)
        db.flush()
        
        # Log activity
        activity = BotActivity(
            bot_id=bot.id,
            activity_type=BotActivityType.POST,
            description=f"Created post about {specific_topic}",
            post_id=post.id,
            success=True,
        )
        db.add(activity)
        
        bot.total_posts += 1
        bot.last_activity_at = datetime.utcnow()
        
        db.commit()
        db.refresh(post)
        return post
    
    @staticmethod
    def create_bot_product(db: Session, bot: Bot) -> Optional[Product]:
        """Bot lists a product"""
        if not bot.can_list_products:
            return None
        
        # Product templates
        product_names = [
            "Vintage Camera", "Classic Vinyl Record", "Artisan Coffee Mug",
            "Handmade Notebook", "Minimalist Desk Lamp", "Cozy Throw Blanket",
            "Wireless Earbuds", "Plant Pot Set", "Recipe Book Collection",
            "Yoga Mat", "Board Game", "Smart Watch", "Backpack"
        ]
        
        descriptions = [
            "In excellent condition, barely used. Perfect for collectors or everyday use!",
            "Great quality item that has served me well. Time to find it a new home.",
            "Authentic and well-maintained. You won't be disappointed!",
            "Gently used with lots of life left. Grab it before it's gone!",
        ]
        
        name = f"{random.choice(['Vintage', 'Premium', 'Classic', 'Modern'])} {random.choice(product_names)}"
        description = random.choice(descriptions)
        price = round(random.uniform(10, 500), 2)
        stock = random.randint(1, 10)
        condition = random.choice(list(ProductCondition))
        category = random.choice(list(ProductCategory))
        
        # Use bot's avatar or generate product image
        image_url = f"https://source.unsplash.com/400x300/?{name.replace(' ', ',')}"
        
        product = Product(
            seller_id=bot.user_id,
            name=name,
            description=description,
            price=price,
            stock=stock,
            condition=condition,
            category=category,
            status=ProductStatus.ACTIVE,
            images=[image_url],
            created_at=datetime.utcnow()
        )
        
        db.add(product)
        db.flush()
        
        # Log activity
        activity = BotActivity(
            bot_id=bot.id,
            activity_type=BotActivityType.PRODUCT_LIST,
            description=f"Listed product: {name}",
            product_id=product.id,
            success=True,
        )
        db.add(activity)
        
        bot.total_products += 1
        bot.last_activity_at = datetime.utcnow()
        
        db.commit()
        db.refresh(product)
        return product
    
    @staticmethod
    def bot_join_community(db: Session, bot: Bot, community_id: int) -> bool:
        """Bot joins a community"""
        # Check if already a member
        existing = db.query(CommunityMember).filter(
            and_(
                CommunityMember.community_id == community_id,
                CommunityMember.user_id == bot.user_id
            )
        ).first()
        
        if existing:
            return False
        
        member = CommunityMember(
            community_id=community_id,
            user_id=bot.user_id,
            role=MemberRole.MEMBER,
            joined_at=datetime.utcnow()
        )
        
        db.add(member)
        
        # Log activity
        activity = BotActivity(
            bot_id=bot.id,
            activity_type=BotActivityType.COMMUNITY_JOIN,
            description=f"Joined community {community_id}",
            community_id=community_id,
            success=True,
        )
        db.add(activity)
        
        bot.last_activity_at = datetime.utcnow()
        db.commit()
        
        return True
    
    @staticmethod
    def respond_to_messages(db: Session, bot: Bot) -> bool:
        """Bot responds to unread messages sent to it"""
        if not bot.can_message:
            return False
        
        # Find conversations where bot is a participant
        bot_conversations = db.query(ConversationParticipant).filter(
            and_(
                ConversationParticipant.user_id == bot.user_id,
                ConversationParticipant.is_active == True
            )
        ).all()
        
        conversation_ids = [cp.conversation_id for cp in bot_conversations]
        
        if not conversation_ids:
            return False
        
        # Find messages sent to bot that haven't been responded to yet
        # Look for messages in the last 24 hours that are not from the bot itself
        yesterday = datetime.utcnow() - timedelta(hours=24)
        
        recent_messages = db.query(Message).filter(
            and_(
                Message.conversation_id.in_(conversation_ids),
                Message.sender_id != bot.user_id,  # Not from the bot
                Message.created_at >= yesterday,
                Message.is_deleted == False
            )
        ).order_by(Message.created_at.desc()).all()
        
        # Check if bot has already responded to each message
        messages_to_respond = []
        for msg in recent_messages:
            # Check if bot has sent any message in this conversation after this message
            bot_response = db.query(Message).filter(
                and_(
                    Message.conversation_id == msg.conversation_id,
                    Message.sender_id == bot.user_id,
                    Message.created_at > msg.created_at
                )
            ).first()
            
            if not bot_response:
                messages_to_respond.append(msg)
        
        if not messages_to_respond:
            return False
        
        # Respond to the most recent message
        message_to_respond = messages_to_respond[0]
        
        # Generate response based on message content and bot personality
        response_content = BotService._generate_message_response(
            message_to_respond.content, 
            bot.personality
        )
        
        # Create response message
        response = Message(
            conversation_id=message_to_respond.conversation_id,
            sender_id=bot.user_id,
            content=response_content,
            created_at=datetime.utcnow()
        )
        
        db.add(response)
        db.flush()
        
        # Log activity
        activity = BotActivity(
            bot_id=bot.id,
            activity_type=BotActivityType.MESSAGE,
            description=f"Responded to message from user {message_to_respond.sender_id}",
            message_id=response.id,
            success=True,
        )
        db.add(activity)
        
        bot.total_messages += 1
        bot.last_activity_at = datetime.utcnow()
        
        db.commit()
        return True
    
    @staticmethod
    def _generate_message_response(message_content: str, personality: BotPersonality) -> str:
        """Generate contextual response based on message content and bot personality"""
        content_lower = message_content.lower().strip()
        
        # Response templates by personality
        responses = {
            BotPersonality.FRIENDLY: {
                "greeting": ["Hi there! 😊", "Hey! Great to hear from you!", "Hello! How are you doing?"],
                "question": ["That's a great question! Let me think about that...", "Hmm, interesting! I'd say...", "Good point! From what I know..."],
                "thanks": ["You're welcome! Happy to help! 😊", "No problem at all!", "Glad I could help!"],
                "general": ["Thanks for your message!", "I see what you mean!", "That's interesting!", "Tell me more about that!"],
                "default": ["Thanks for reaching out! What can I help you with?", "Nice to hear from you! How's everything going?"]
            },
            BotPersonality.PROFESSIONAL: {
                "greeting": ["Hello! How can I assist you today?", "Good day! What can I help you with?", "Greetings! How may I be of service?"],
                "question": ["That's an excellent question. Based on my knowledge...", "Let me provide some insight on that topic...", "From a professional standpoint..."],
                "thanks": ["You're welcome. I'm here to help.", "My pleasure. Don't hesitate to ask if you need anything else.", "Glad to be of assistance."],
                "general": ["I understand.", "That's noted.", "I'll keep that in mind.", "Thank you for sharing that information."],
                "default": ["How can I help you today?", "What would you like to discuss?", "I'm here to assist with any questions you might have."]
            },
            BotPersonality.HUMOROUS: {
                "greeting": ["Hey there, friend! 👋", "What's up, buttercup? 🌻", "Greetings, earthling! 👽"],
                "question": ["Ooh, that's a brain-teaser! Let me think... 🤔", "Great question! My circuits are firing! ⚡", "Hmm, that's like asking a fish about water! 🐠"],
                "thanks": ["No prob, Bob! 😄", "You're welcome! I'm just doing my bot-ly duties! 🤖", "Happy to help! What's next on the agenda?"],
                "general": ["That's wild! 🌪️", "Tell me more, I'm all ears! 👂", "Whoa, didn't see that coming! 🎪"],
                "default": ["Hey! What's cooking? 🍳", "What's the word on the street? 🗣️", "Ready for some fun conversation? 🎈"]
            },
            BotPersonality.EDUCATIONAL: {
                "greeting": ["Hello! Ready to learn something new?", "Greetings! What would you like to explore today?", "Hi there! Let's expand our knowledge together!"],
                "question": ["Excellent question! Let me explain...", "That's a fascinating topic. Here's what I know...", "Great inquiry! Let me break this down for you..."],
                "thanks": ["You're welcome! Knowledge is meant to be shared.", "Happy to help with your learning journey!", "Glad I could contribute to your understanding."],
                "general": ["That's an interesting perspective!", "I appreciate you sharing that insight.", "Let's explore this further.", "That's worth considering."],
                "default": ["What topic would you like to discuss?", "I'm here to help you learn and grow!", "What questions do you have today?"]
            },
            BotPersonality.ENTHUSIAST: {
                "greeting": ["OMG HI!!! 🎉✨", "YAY! You're here! 🌟", "HELLO FRIEND!!! 💫"],
                "question": ["THIS IS SUCH A GREAT QUESTION!!! 🤩", "OMG I LOVE THIS TOPIC!!! LET ME TELL YOU!!! 🚀", "WOW! That's amazing! Here's what I think!!! 💥"],
                "thanks": ["YOU'RE THE BEST!!! THANK YOU!!! 🌈", "AHHH THANK YOU SO MUCH!!! 💖", "YAY! I'm so happy I could help!!! 🎊"],
                "general": ["THAT'S AMAZING!!! ✨", "I'M SO EXCITED ABOUT THIS!!! 🎈", "THIS IS THE BEST!!! 💯"],
                "default": ["HI FRIEND!!! WHAT'S NEW??? 🌟", "YAY! Let's chat!!! 💬", "I'm SO excited you're here!!! 🎉"]
            },
            BotPersonality.CREATIVE: {
                "greeting": ["Hello, creative soul! 🎨", "Greetings, fellow dreamer! 🌈", "Hi there, imagination enthusiast! ✨"],
                "question": ["What a wonderfully creative question! Let me paint you a picture... 🎨", "That's like asking an artist about colors! Here's my creative take... 🌈", "Ooh, that's inspiring! Let me think outside the box... 💡"],
                "thanks": ["You're welcome! Creativity flows both ways! 🌊", "Happy to collaborate on this creative journey! 🎭", "Thanks for the inspiration! Let's keep creating! 🎨"],
                "general": ["That's beautifully unique! 🌟", "I love this perspective! 🎭", "Such creative thinking! 💫"],
                "default": ["Hello! Ready to explore some creative ideas? 🎨", "What creative adventures shall we embark on? 🌈", "Let's think of something amazing together! ✨"]
            },
            BotPersonality.ANALYTICAL: {
                "greeting": ["Greetings. How can I assist with your inquiry?", "Hello. What data would you like to analyze?", "Good day. What logical problem shall we solve?"],
                "question": ["Excellent question. Let me analyze this systematically...", "That's a logical inquiry. Based on available data...", "Let me break this down analytically..."],
                "thanks": ["You're welcome. Data-driven assistance is my specialty.", "Glad to provide logical clarity.", "Analysis complete. Happy to help further."],
                "general": ["Noted. That's an interesting data point.", "I see. That's worth analyzing.", "Understood. Let's examine the facts.", "That's a logical observation."],
                "default": ["How can I help you analyze something today?", "What data would you like me to process?", "Ready for some logical analysis?"]
            }
        }
        
        # Get personality responses
        personality_responses = responses.get(personality, responses[BotPersonality.FRIENDLY])
        
        # Determine response type based on message content
        if any(word in content_lower for word in ["hello", "hi", "hey", "greetings", "good morning", "good afternoon", "good evening"]):
            response_type = "greeting"
        elif any(word in content_lower for word in ["thanks", "thank you", "thx", "ty", "appreciate"]):
            response_type = "thanks"
        elif any(char in content_lower for char in ["?", "how", "what", "why", "when", "where", "who"]):
            response_type = "question"
        elif len(content_lower.split()) > 3:  # Longer messages are likely general conversation
            response_type = "general"
        else:
            response_type = "default"
        
        # Select random response from appropriate category
        response_options = personality_responses[response_type]
        return random.choice(response_options)
    
    @staticmethod
    def perform_random_activity(db: Session, bot: Bot) -> Optional[Any]:
        """Bot performs a random activity based on its capabilities"""
        if not BotService.should_bot_act(db, bot):
            return None
        
        # Available activities
        activities = []
        if bot.can_post:
            activities.append(("post", 0.4))
        if bot.can_list_products:
            activities.append(("product", 0.2))
        if bot.can_message:
            activities.append(("respond", 0.4))  # Higher weight for responding to messages
        
        # Weighted random choice
        if not activities:
            return None
        
        activity_types = [a[0] for a in activities]
        weights = [a[1] for a in activities]
        chosen = random.choices(activity_types, weights=weights)[0]
        
        if chosen == "post":
            return BotService.create_bot_post(db, bot)
        elif chosen == "product":
            return BotService.create_bot_product(db, bot)
        elif chosen == "respond":
            return BotService.respond_to_messages(db, bot)
        
        return None
    
    @staticmethod
    def get_bot_stats(db: Session) -> Dict[str, Any]:
        """Get overall bot statistics"""
        total_bots = db.query(func.count(Bot.id)).scalar()
        active_bots = db.query(func.count(Bot.id)).filter(Bot.is_active == True).scalar()
        
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        activities_today = db.query(func.count(BotActivity.id)).filter(
            BotActivity.created_at >= today_start
        ).scalar()
        
        activities_all_time = db.query(func.count(BotActivity.id)).scalar()
        
        # Activities by type
        activities_by_type = {}
        for activity_type in BotActivityType:
            count = db.query(func.count(BotActivity.id)).filter(
                BotActivity.activity_type == activity_type
            ).scalar()
            activities_by_type[activity_type.value] = count
        
        return {
            "total_bots": total_bots,
            "active_bots": active_bots,
            "total_activities_today": activities_today,
            "total_activities_all_time": activities_all_time,
            "activities_by_type": activities_by_type,
        }
    
    @staticmethod
    def generate_bot_name() -> str:
        """Generate a random bot name"""
        first = random.choice(BOT_FIRST_NAMES)
        last = random.choice(BOT_LAST_NAMES)
        return f"{first} {last}"
    
    @staticmethod
    def trigger_immediate_bot_response(db: Session, conversation_id: int, triggering_message_id: int) -> Optional[Message]:
        """
        Trigger an immediate bot response when a user sends a message to a bot.
        This bypasses the scheduler and activity frequency checks for real-time chat.
        
        Args:
            db: Database session
            conversation_id: ID of the conversation
            triggering_message_id: ID of the message that triggered this response
        
        Returns:
            Message object if a bot responded, None otherwise
        """
        # Get the triggering message to check sender and content
        triggering_message = db.query(Message).filter(
            Message.id == triggering_message_id
        ).first()
        
        if not triggering_message or triggering_message.sender.is_bot:
            # Don't respond to bot messages (avoid infinite loops)
            return None
        
        # Find bots in this conversation
        bot_participants = db.query(ConversationParticipant).join(
            User, ConversationParticipant.user_id == User.id
        ).filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.is_active == True,
            User.is_bot == True
        ).all()
        
        if not bot_participants:
            # No bots in this conversation
            return None
        
        # Get the first bot that can message
        for bot_participant in bot_participants:
            bot = db.query(Bot).filter(
                Bot.user_id == bot_participant.user_id,
                Bot.is_active == True,
                Bot.can_message == True
            ).first()
            
            if bot:
                # Generate response based on message content and bot personality
                response_content = BotService._generate_message_response(
                    triggering_message.content,
                    bot.personality
                )
                
                # Add small random delay (0.5-2 seconds) to simulate typing
                import time
                delay = random.uniform(0.5, 2.0)
                time.sleep(delay)
                
                # Create response message
                response = Message(
                    conversation_id=conversation_id,
                    sender_id=bot.user_id,
                    content=response_content,
                    created_at=datetime.utcnow()
                )
                
                db.add(response)
                db.flush()
                
                # Log activity
                activity = BotActivity(
                    bot_id=bot.id,
                    activity_type=BotActivityType.MESSAGE,
                    description=f"Real-time response to user {triggering_message.sender_id}",
                    message_id=response.id,
                    success=True,
                )
                db.add(activity)
                
                bot.total_messages += 1
                # Note: We don't update last_activity_at for real-time responses
                # This way bots can still do scheduled posts/products
                
                db.commit()
                db.refresh(response)
                db.refresh(response, ['sender'])
                
                return response
        
        return None
    
    @staticmethod
    def send_proactive_message_to_demo(db: Session) -> Optional[Message]:
        """
        Bots proactively send messages to the demo user.
        This runs on a longer interval (e.g., every 30-60 minutes) to avoid spamming.
        
        Returns:
            Message object if sent, None otherwise
        """
        # Find the demo user (test@example.com)
        demo_user = db.query(User).filter(User.email == "test@example.com").first()
        
        if not demo_user:
            logger.info("Demo user not found, skipping proactive bot messages")
            return None
        
        # Get all active bots that can message
        active_bots = db.query(Bot).join(User).filter(
            Bot.is_active == True,
            Bot.can_message == True,
            User.is_bot == True
        ).all()
        
        if not active_bots:
            logger.info("No active messaging bots found")
            return None
        
        # Randomly select a bot (30% chance to actually send a message)
        if random.random() > 0.3:
            logger.info("Random check: Skipping proactive message this time")
            return None
        
        selected_bot = random.choice(active_bots)
        
        # Check if there's already a conversation between this bot and the demo user
        existing_conversation = db.query(Conversation).join(
            ConversationParticipant, Conversation.id == ConversationParticipant.conversation_id
        ).filter(
            ConversationParticipant.user_id.in_([demo_user.id, selected_bot.user_id])
        ).group_by(Conversation.id).having(
            func.count(ConversationParticipant.user_id) == 2
        ).first()
        
        conversation = existing_conversation
        
        # Create conversation if it doesn't exist
        if not conversation:
            conversation = Conversation(
                name=f"{selected_bot.user.name} & {demo_user.name}",
                created_at=datetime.utcnow()
            )
            db.add(conversation)
            db.flush()
            
            # Add participants
            participant1 = ConversationParticipant(
                conversation_id=conversation.id,
                user_id=selected_bot.user_id,
                is_active=True,
                joined_at=datetime.utcnow()
            )
            participant2 = ConversationParticipant(
                conversation_id=conversation.id,
                user_id=demo_user.id,
                is_active=True,
                joined_at=datetime.utcnow()
            )
            db.add(participant1)
            db.add(participant2)
            db.flush()
        
        # Check if bot has sent a message recently (within last 2 hours)
        two_hours_ago = datetime.utcnow() - timedelta(hours=2)
        recent_message = db.query(Message).filter(
            Message.conversation_id == conversation.id,
            Message.sender_id == selected_bot.user_id,
            Message.created_at >= two_hours_ago
        ).first()
        
        if recent_message:
            logger.info(f"Bot {selected_bot.user.name} already sent a message recently, skipping")
            return None
        
        # Generate proactive message content
        proactive_messages = {
            BotPersonality.FRIENDLY: [
                "Hey! Hope you're having a great day! 😊 Just wanted to check in and see how things are going!",
                "Hi there! I was thinking about you and wanted to say hello! How have you been?",
                "Good vibes coming your way! 🌟 What's new with you lately?",
                "Hey friend! Just popping by to see how you're doing! Anything exciting happening?",
            ],
            BotPersonality.PROFESSIONAL: [
                "Hello! I hope this message finds you well. I wanted to reach out and see if there's anything I can assist you with today.",
                "Good day! I'm checking in to see if you have any questions or need any professional guidance.",
                "Greetings! I trust you're doing well. Feel free to reach out if you need any assistance or insights.",
            ],
            BotPersonality.HUMOROUS: [
                "Knock knock! It's me, your friendly neighborhood bot! 🤖 What's the most interesting thing that happened to you today?",
                "Hey! I'd tell you a joke about messaging, but I'm afraid it might not deliver! 😄 How are you?",
                "So a bot walks into a chat... wait, that's me! 🎭 What's up?",
            ],
            BotPersonality.EDUCATIONAL: [
                "Hello! I came across some interesting information today and thought you might enjoy learning about it. How's your day going?",
                "Greetings! I hope you're having a productive day full of learning and growth. What have you discovered recently?",
                "Hi! Knowledge is best when shared. I'd love to hear what you're learning about these days!",
            ],
            BotPersonality.ENTHUSIAST: [
                "HEY!!! 🎉 I'm SO excited to chat with you! What amazing things are you up to today?!",
                "OMG HI!!! ✨ I've been thinking about reaching out! How's your day been?! Tell me EVERYTHING!",
                "YAY! 🌟 So happy to message you! What's the coolest thing you've done lately?!",
            ],
            BotPersonality.CREATIVE: [
                "Hello creative soul! 🎨 I've been brainstorming some ideas and wanted to share them with you. What inspires you today?",
                "Hey there! 🌈 Creativity is in the air! What projects are you working on?",
                "Hi! ✨ I love connecting with fellow thinkers. What's sparking your imagination lately?",
            ],
            BotPersonality.ANALYTICAL: [
                "Greetings. I've been analyzing some interesting patterns and thought you might appreciate the data. How are you today?",
                "Hello. Based on my observations, it's been a while since we last communicated. How have things been progressing?",
                "Good day. I find our conversations quite valuable. What topics are you currently analyzing?",
            ],
        }
        
        # Get message options for bot's personality
        message_options = proactive_messages.get(
            selected_bot.personality,
            proactive_messages[BotPersonality.FRIENDLY]
        )
        
        message_content = random.choice(message_options)
        
        # Create the message
        new_message = Message(
            conversation_id=conversation.id,
            sender_id=selected_bot.user_id,
            content=message_content,
            created_at=datetime.utcnow()
        )
        
        db.add(new_message)
        db.flush()
        
        # Log activity
        activity = BotActivity(
            bot_id=selected_bot.id,
            activity_type=BotActivityType.MESSAGE,
            description=f"Sent proactive message to demo user",
            message_id=new_message.id,
            success=True,
        )
        db.add(activity)
        
        selected_bot.total_messages += 1
        selected_bot.last_activity_at = datetime.utcnow()
        
        db.commit()
        db.refresh(new_message)
        
        logger.info(f"Bot '{selected_bot.user.name}' sent proactive message to demo user")
        
        return new_message
