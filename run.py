#!/usr/bin/env python3
"""
run.py — Start both backend (FastAPI) and frontend (React + Vite) in one command.
Usage: python run.py
"""
import subprocess
import sys
import time
import os


def main():
    frontend_dir = os.path.join(os.getcwd(), "frontend")
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"

    print("=" * 55)
    print("  AI Doctor Pro - Starting Up")
    print("=" * 55)

    # Check .env exists
    if not os.path.exists(".env"):
        print("\nNo .env file found!")
        print("   Run: cp .env.example .env  then add your API keys.\n")
        sys.exit(1)

    print("\nStarting FastAPI backend on http://127.0.0.1:8000 ...")
    backend = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.main:app",
         "--host", "127.0.0.1", "--port", "8000"],
    )

    # Give backend time to init DB and index knowledge base
    time.sleep(10)

    print("Starting React frontend on http://127.0.0.1:7860 ...")
    frontend = subprocess.Popen(
        [npm_cmd, "run", "dev", "--", "--host", "127.0.0.1", "--port", "7860"],
        cwd=frontend_dir,
    )

    print("\nBoth services running!")
    print("   Backend API docs : http://127.0.0.1:8000/docs")
    print("   Frontend UI      : http://127.0.0.1:7860")
    print("\n   Press Ctrl+C to stop both.\n")

    try:
        backend.wait()
        frontend.wait()
    except KeyboardInterrupt:
        print("\n\nStopping services...")
        backend.terminate()
        frontend.terminate()
        print("Goodbye!")


if __name__ == "__main__":
    main()
