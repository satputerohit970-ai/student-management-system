import os
import pymysql
import pymysql.cursors
from datetime import date, datetime
from decimal import Decimal
from config import Config

def get_db_connection(use_database=True):
    """
    Establish and return a PyMySQL connection using settings from Config.
    If use_database is False, connects to MySQL server without selecting a specific database.
    """
    return pymysql.connect(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database=Config.DB_NAME if use_database else None,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False
    )

def serialize_value(val):
    """Convert date, datetime, and Decimal values to JSON-friendly primitives."""
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if isinstance(val, Decimal):
        return float(val)
    return val

def serialize_row(row):
    """Serialize all columns in a dictionary row."""
    if not row:
        return row
    return {k: serialize_value(v) for k, v in row.items()}

def serialize_rows(rows):
    """Serialize a list of dictionary rows."""
    if not rows:
        return []
    return [serialize_row(r) for r in rows]

def query_db(query, args=(), one=False, commit=False):
    """
    Execute a query and return results.
    - one: if True, returns a single dictionary row (or None)
    - commit: if True, commits changes (for INSERT/UPDATE/DELETE) and returns lastrowid or affected rows
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(query, args)
            if commit:
                conn.commit()
                return {
                    "last_id": cursor.lastrowid,
                    "rowcount": cursor.rowcount
                }
            result = cursor.fetchone() if one else cursor.fetchall()
            return serialize_row(result) if one else serialize_rows(result)
    except Exception as e:
        if commit:
            conn.rollback()
        raise e
    finally:
        conn.close()

def init_db():
    """
    Initialize MySQL database and tables if they don't already exist.
    Executes database/database.sql schema and seed data.
    """
    try:
        # Step 1: Ensure database exists
        server_conn = get_db_connection(use_database=False)
        with server_conn.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{Config.DB_NAME}` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        server_conn.commit()
        server_conn.close()

        # Step 2: Locate database.sql
        sql_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'database', 'database.sql')
        if not os.path.exists(sql_path):
            print(f"[WARN] database.sql not found at {sql_path}")
            return False

        with open(sql_path, 'r', encoding='utf-8') as f:
            sql_content = f.read()

        # Step 3: Run statements in the database
        db_conn = get_db_connection(use_database=True)
        with db_conn.cursor() as cursor:
            # Split queries by semicolon outside comments
            statements = [s.strip() for s in sql_content.split(';') if s.strip()]
            for stmt in statements:
                # Skip comments or empty commands
                lines = [line for line in stmt.splitlines() if not line.strip().startswith('--')]
                cleaned_stmt = '\n'.join(lines).strip()
                if cleaned_stmt:
                    cursor.execute(cleaned_stmt)
        db_conn.commit()
        db_conn.close()
        print("[SUCCESS] Database initialized successfully.")
        return True
    except Exception as e:
        print(f"[ERROR] Database initialization failed: {e}")
        return False

if __name__ == '__main__':
    print("Initializing database...")
    init_db()
