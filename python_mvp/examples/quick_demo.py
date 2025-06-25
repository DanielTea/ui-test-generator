#!/usr/bin/env python3
"""
Quick demo of screen recording and voiceover generation.
This script shows how to use the main functionality programmatically.
"""

import os
import sys

# Add parent directory to path to import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from screen_recorder_voiceover import ScreenRecorderVoiceover

def demo_basic_recording():
    """Demo basic screen recording without AI features"""
    print("=== Basic Screen Recording Demo ===")
    
    recorder = ScreenRecorderVoiceover()
    
    # Record a short 5-second clip
    print("Recording a 5-second screen clip...")
    recorder.record_screen(duration_seconds=5, fps=2)
    
    # Save the recording
    video_path = recorder.save_recording("demo_recording.mp4", fps=2)
    print(f"Recording saved: {video_path}")

def demo_description_only():
    """Demo generating description only (no TTS)"""
    print("\n=== Description Only Demo ===")
    
    # Check if API credentials are set
    has_openai_key = bool(os.environ.get("OPENAI_API_KEY"))
    has_azure_config = bool(os.environ.get("AZURE_OPENAI_ENDPOINT") and os.environ.get("AZURE_OPENAI_API_KEY"))
    
    if not has_openai_key and not has_azure_config:
        print("Skipping AI demo - no OpenAI credentials found")
        print("To test AI features, set up either:")
        print("1. Regular OpenAI: OPENAI_API_KEY in .env file")
        print("2. Azure OpenAI: AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY in .env file")
        return
    
    recorder = ScreenRecorderVoiceover()
    
    # Record and analyze
    print("Recording and analyzing with GPT-4 Vision...")
    recorder.record_screen(duration_seconds=5, fps=1)  # Lower FPS for cost
    
    # Generate description
    description = recorder.generate_description(skip_frames=2)
    if description:
        print("Generated description saved to demo_description.txt")
        with open("demo_description.txt", "w") as f:
            f.write(description)

def main():
    """Run the demos"""
    print("Screen Recording Voiceover - Quick Demo")
    print("=" * 50)
    
    # Basic recording demo (no API key needed)
    demo_basic_recording()
    
    # AI-powered description demo (requires API key)
    demo_description_only()
    
    print("\n" + "=" * 50)
    print("Demo completed!")
    print("For full voiceover generation, run:")
    print("python screen_recorder_voiceover.py --duration 10")

if __name__ == "__main__":
    main() 