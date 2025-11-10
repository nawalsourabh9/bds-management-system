#!/usr/bin/env python3
"""
Utility to create or reset a super admin user with a known password.
Reads database connection details from environment variables:
  DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSLMODE (optional)

Usage:
  python scripts/create_super_admin.py --email admin@example.com --password Admin@123
"""

import argparse
import os
import sys
import uuid
from typing import Optional

import psycopg2
from psycopg2.extras import RealDictCursor
import bcrypt


def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")[:72]
    if not password_bytes:
        raise ValueError("Password cannot be empty")
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    return hashed.decode("utf-8")


def get_connection():
    host = os.getenv("DB_HOST")
    port = os.getenv("DB_PORT", "5432")
    db_name = os.getenv("DB_NAME")
    user = os.getenv("DB_USER")
    password = os.getenv("DB_PASSWORD")
    sslmode = os.getenv("DB_SSLMODE", "require")

    missing = [k for k, v in [("DB_HOST", host), ("DB_NAME", db_name), ("DB_USER", user), ("DB_PASSWORD", password)] if not v]
    if missing:
        raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")

    conn = psycopg2.connect(
        host=host,
        port=port,
        dbname=db_name,
        user=user,
        password=password,
        sslmode=sslmode,
    )
    return conn


def ensure_department(cur) -> uuid.UUID:
    """Ensure the Executive Office department exists and return its id."""
    cur.execute("SELECT id FROM departments WHERE name = %s LIMIT 1;", ("Executive Office",))
    row = cur.fetchone()
    if row:
        return uuid.UUID(str(row["id"]))

    department_id = uuid.uuid4()
    cur.execute(
        """
        INSERT INTO departments (id, name, description)
        VALUES (%s, %s, %s)
        ON CONFLICT (id) DO NOTHING;
        """,
        (str(department_id), "Executive Office", "Executive management"),
    )
    return department_id


def upsert_super_admin(cur, email: str, password_hash: str, department_id: uuid.UUID) -> uuid.UUID:
    cur.execute(
        """
        SELECT id FROM users WHERE email = %s LIMIT 1;
        """,
        (email,),
    )
    row = cur.fetchone()
    if row:
        user_id = uuid.UUID(str(row["id"]))
        cur.execute(
            """
            UPDATE users
            SET password_hash = %s,
                role = 'superadmin',
                first_name = COALESCE(NULLIF(first_name, ''), 'Super'),
                last_name = COALESCE(NULLIF(last_name, ''), 'Admin'),
                department_id = %s,
                is_active = TRUE,
                is_verified = TRUE,
                updated_at = NOW()
            WHERE id = %s;
            """,
            (password_hash, str(department_id), str(user_id)),
        )
        return user_id

    user_id = uuid.uuid4()
    cur.execute(
        """
        INSERT INTO users (
            id, email, password_hash, first_name, last_name,
            role, department_id, is_active, is_verified, created_at
        )
        VALUES (
            %s, %s, %s, %s, %s,
            'superadmin', %s, TRUE, TRUE, NOW()
        )
        ON CONFLICT (email) DO NOTHING;
        """,
        (
            str(user_id),
            email,
            password_hash,
            "Super",
            "Admin",
            str(department_id),
        ),
    )
    return user_id


def parse_args(argv: Optional[list[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create or reset a super admin user.")
    parser.add_argument("--email", default="admin@bdsmanufacturing.in", help="Super admin email")
    parser.add_argument("--password", default="Admin@123", help="Password to set")
    return parser.parse_args(argv)


def main(argv: Optional[list[str]] = None) -> int:
    args = parse_args(argv)

    try:
        conn = get_connection()
    except Exception as exc:
        print(f"[ERROR] Failed to connect to database: {exc}", file=sys.stderr)
        return 1

    password_hash = hash_password(args.password)

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            department_id = ensure_department(cur)
            user_id = upsert_super_admin(cur, args.email, password_hash, department_id)
            conn.commit()
            print("=== Super Admin Provisioned ===")
            print(f"User ID: {user_id}")
            print(f"Email  : {args.email}")
            print(f"Password: {args.password}")
            print("===============================")
            return 0
    except Exception as exc:
        conn.rollback()
        print(f"[ERROR] Failed to create/reset super admin: {exc}", file=sys.stderr)
        return 2
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())

