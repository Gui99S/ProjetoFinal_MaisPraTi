"""
Check all friends of demo user
"""
from app.core.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

result = db.execute(text("""
    SELECT DISTINCT u.id, u.name, u.is_bot
    FROM friendships f
    JOIN users u ON (u.id = f.friend_id OR u.id = f.user_id)
    WHERE (f.user_id = 1 OR f.friend_id = 1)
    AND u.id != 1
    AND f.status = 'accepted'
    ORDER BY u.is_bot DESC, u.name
"""))

friends = result.fetchall()
print(f"\nTotal friends for Demo User: {len(friends)}\n")

bots = [f for f in friends if f[2]]
humans = [f for f in friends if not f[2]]

print(f"🤖 Bot friends ({len(bots)}):")
for fid, fname, _ in bots:
    print(f"   - {fname}")

print(f"\n👤 Human friends ({len(humans)}):")
for fid, fname, _ in humans:
    print(f"   - {fname}")

db.close()
