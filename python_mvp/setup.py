#!/usr/bin/env python3
"""
Setup script for Screen Recording Voiceover project
"""

import os
import subprocess
import sys

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"\n{description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e}")
        if e.stdout:
            print(f"STDOUT: {e.stdout}")
        if e.stderr:
            print(f"STDERR: {e.stderr}")
        return False

def check_requirements():
    """Check if required tools are installed"""
    print("Checking requirements...")
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("❌ Python 3.8+ is required")
        return False
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} found")
    
    # Check if uv is installed
    try:
        subprocess.run(["uv", "--version"], check=True, capture_output=True)
        print("✅ uv is installed")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ uv is not installed. Installing...")
        if not run_command("curl -LsSf https://astral.sh/uv/install.sh | sh", "Installing uv"):
            return False
    
    return True

def setup_environment():
    """Set up the Python environment"""
    print("\n=== Setting up Python environment ===")
    
    # Create virtual environment
    if not run_command("uv venv", "Creating virtual environment"):
        return False
    
    # Install dependencies
    if not run_command("uv pip install -e .", "Installing dependencies"):
        return False
    
    return True

def setup_env_file():
    """Set up environment file"""
    print("\n=== Setting up environment file ===")
    
    if os.path.exists(".env"):
        print("✅ .env file already exists")
        return True
    
    if os.path.exists("env.example"):
        try:
            with open("env.example", "r") as f:
                content = f.read()
            with open(".env", "w") as f:
                f.write(content)
            print("✅ .env file created from env.example")
            print("⚠️  Please edit .env and add your OpenAI API key")
            return True
        except Exception as e:
            print(f"❌ Failed to create .env file: {e}")
            return False
    else:
        print("❌ env.example file not found")
        return False

def main():
    """Main setup function"""
    print("🚀 Screen Recording Voiceover Setup")
    print("=" * 50)
    
    # Check requirements
    if not check_requirements():
        print("\n❌ Requirements check failed. Please install missing dependencies and try again.")
        return False
    
    # Setup environment
    if not setup_environment():
        print("\n❌ Environment setup failed.")
        return False
    
    # Setup env file
    setup_env_file()
    
    print("\n🎉 Setup completed successfully!")
    print("\nNext steps:")
    print("1. Edit .env file and add your OpenAI API key")
    print("2. Activate the virtual environment: source .venv/bin/activate")
    print("3. Run the script: python screen_recorder_voiceover.py")
    print("\nFor help, run: python screen_recorder_voiceover.py --help")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 