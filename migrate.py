"""
Migration script to add role, doctor_profiles and appointments tables to existing PostgreSQL database.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.database import engine
from sqlalchemy import text

MIGRATION_SQL = """
-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'patient';

-- Create doctor_profiles table
CREATE TABLE IF NOT EXISTS doctor_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
    specialty VARCHAR DEFAULT 'General',
    experience VARCHAR DEFAULT '0 yrs',
    hospital VARCHAR DEFAULT 'MediAI Clinic',
    fee VARCHAR DEFAULT '₹0',
    avatar_url VARCHAR,
    bio TEXT
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES users(id),
    doctor_id INTEGER NOT NULL REFERENCES users(id),
    date VARCHAR NOT NULL,
    time VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS ix_doctor_profiles_id ON doctor_profiles(id);
CREATE INDEX IF NOT EXISTS ix_appointments_id ON appointments(id);
"""

if __name__ == "__main__":
    print("Running migration...")
    with engine.connect() as conn:
        for statement in MIGRATION_SQL.strip().split(";"):
            stmt = statement.strip()
            if stmt:
                try:
                    conn.execute(text(stmt))
                    print(f"  OK: {stmt[:60]}...")
                except Exception as e:
                    print(f"  WARN: {e}")
        conn.commit()
    print("Migration complete!")
