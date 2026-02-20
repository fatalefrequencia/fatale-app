import sqlite3
import os

db_path = r"c:\Users\Customer\Downloads\Fatale version 1\FataleCore\fatale_core.db"

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("UPDATE Users SET CreditsBalance = 100 WHERE Id = 1;")
    conn.commit()
    print("Updated user 1 with 100 credits.")
    
    # Verify
    cursor.execute("SELECT Id, CreditsBalance FROM Users WHERE Id = 1;")
    user = cursor.fetchone()
    print(f"User 1 balance: {user[1]}")
    
    conn.close()
except Exception as e:
    print(f"Error: {e}")
