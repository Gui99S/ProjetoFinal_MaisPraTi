"""
Check all friendship records for demo user
"""
from app.core.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

result = db.execute(text("""
    SELECT f.id, u1.name as user1, u2.name as user2, f.status
    FROM friendships f
    JOIN users u1 ON f.user_id = u1.id
    JOIN users u2 ON f.friend_id = u2.id
    WHERE f.user_id = 1 OR f.friend_id = 1
    ORDER BY f.id
"""))

rows = result.fetchall()
print(f"\nTotal friendship records: {len(rows)}\n")

for fid, u1, u2, status in rows:
    print(f"{fid}: {u1} <-> {u2} [{status}]")

# Check specifically for bot friendships
print("\n" + "="*60)
bot_result = db.execute(text("""
    SELECT u.id, u.name
    FROM users u
    WHERE u.is_bot = true
    AND NOT EXISTS (
        SELECT 1 FROM friendships f
        WHERE ((f.user_id = 1 AND f.friend_id = u.id)
            OR (f.user_id = u.id AND f.friend_id = 1))
        AND f.status = 'accepted'
    )
"""))

missing_bots = bot_result.fetchall()
if missing_bots:
    print(f"\n⚠️  Bots NOT yet friends with Demo User ({len(missing_bots)}):")
    for bid, bname in missing_bots:
        print(f"   - {bname} (ID: {bid})")
else:
    print("\n✅ All bots are friends with Demo User!")

db.close()
