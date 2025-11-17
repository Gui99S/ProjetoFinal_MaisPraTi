"""
Update pending bot friendships to accepted
"""
from app.core.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

print("\n" + "="*60)
print("UPDATING PENDING BOT FRIENDSHIPS TO ACCEPTED")
print("="*60 + "\n")

# Update pending bot friendships to accepted
result = db.execute(text("""
    UPDATE friendships
    SET status = 'accepted', updated_at = NOW()
    WHERE (user_id = 1 OR friend_id = 1)
    AND status = 'pending'
    AND (
        user_id IN (SELECT id FROM users WHERE is_bot = true)
        OR friend_id IN (SELECT id FROM users WHERE is_bot = true)
    )
    RETURNING id
"""))

updated_rows = result.fetchall()
db.commit()

print(f"✅ Updated {len(updated_rows)} bot friendships from pending to accepted\n")

# Verify all bots are now friends
bot_result = db.execute(text("""
    SELECT u.id, u.name
    FROM users u
    WHERE u.is_bot = true
    AND EXISTS (
        SELECT 1 FROM friendships f
        WHERE ((f.user_id = 1 AND f.friend_id = u.id)
            OR (f.user_id = u.id AND f.friend_id = 1))
        AND f.status = 'accepted'
    )
    ORDER BY u.name
"""))

bot_friends = bot_result.fetchall()
print(f"{'='*60}")
print(f"Demo User now has {len(bot_friends)} bot friends:\n")
for bid, bname in bot_friends:
    print(f"   🤖 {bname}")

print(f"\n{'='*60}\n")
print("✨ All bots are now accepted friends with Demo User!")
print("💬 Ready for instant real-time conversations!\n")

db.close()
