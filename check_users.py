import sqlite3
import os

db_path = r"c:\Users\Customer\Downloads\Fatale version 1\FataleCore\fatale_core.db"

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT Id, Username, Email, CreditsBalance FROM Users")
    users = cursor.fetchall()
    print(f"Found {len(users)} users:")
    for user in users:
        print(user)
    conn.close()
except Exception as e:
    print(f"Error: {e}")
