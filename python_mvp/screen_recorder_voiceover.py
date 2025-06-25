#!/usr/bin/env python3
"""
Screen Recording with GPT-powered Voiceover Generation

This script adapts the OpenAI cookbook example to:
1. Record your screen for a specified duration
2. Extract frames from the recording
3. Use GPT-4 vision to analyze the content
4. Generate a voiceover script
5. Create audio narration using OpenAI TTS

Based on: https://nbviewer.org/format/script/github/openai/openai-cookbook/blob/main/examples/GPT_with_vision_for_video_understanding.ipynb
"""

import os
import cv2
import base64
import time
import numpy as np
from datetime import datetime
from openai import OpenAI, AzureOpenAI
from dotenv import load_dotenv
import mss
from PIL import Image
import argparse

# Load environment variables
load_dotenv()

class ScreenRecorderVoiceover:
    def __init__(self):
        """Initialize the screen recorder with OpenAI client (regular or Azure)"""
        self.client = self._initialize_client()
        self.is_azure = self._is_using_azure()
        self.frames = []
        self.base64_frames = []
        
    def _initialize_client(self):
        """Initialize OpenAI client - either regular OpenAI or Azure OpenAI"""
        # Check if Azure OpenAI configuration is available
        azure_endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT")
        azure_api_key = os.environ.get("AZURE_OPENAI_API_KEY")
        azure_api_version = os.environ.get("AZURE_OPENAI_API_VERSION", "2024-02-01")
        
        if azure_endpoint and azure_api_key:
            print("Using Azure OpenAI...")
            return AzureOpenAI(
                azure_endpoint=azure_endpoint,
                api_key=azure_api_key,
                api_version=azure_api_version
            )
        else:
            # Fall back to regular OpenAI
            api_key = os.environ.get("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("Either OPENAI_API_KEY or Azure OpenAI credentials (AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY) must be set")
            print("Using OpenAI...")
            return OpenAI(api_key=api_key)
    
    def _is_using_azure(self):
        """Check if we're using Azure OpenAI"""
        return bool(os.environ.get("AZURE_OPENAI_ENDPOINT") and os.environ.get("AZURE_OPENAI_API_KEY"))
    
    def _get_vision_model(self):
        """Get the vision model name (deployment name for Azure)"""
        if self.is_azure:
            return os.environ.get("AZURE_OPENAI_VISION_DEPLOYMENT", "gpt-4-vision")
        else:
            return "gpt-4-vision-preview"
    
    def _get_tts_model(self):
        """Get the TTS model name (deployment name for Azure)"""
        if self.is_azure:
            return os.environ.get("AZURE_OPENAI_TTS_DEPLOYMENT", "tts-1")
        else:
            return "tts-1"
        
    def record_screen(self, duration_seconds=10, fps=2):
        """
        Record screen for specified duration
        
        Args:
            duration_seconds (int): How long to record in seconds
            fps (int): Frames per second to capture
        """
        print(f"Starting screen recording for {duration_seconds} seconds at {fps} FPS...")
        print("Recording will start in 3 seconds - get ready!")
        
        # Countdown
        for i in range(3, 0, -1):
            print(f"{i}...")
            time.sleep(1)
        
        print("Recording started!")
        
        with mss.mss() as sct:
            # Get the primary monitor
            monitor = sct.monitors[1]
            
            start_time = time.time()
            frame_interval = 1.0 / fps
            next_frame_time = start_time
            
            while time.time() - start_time < duration_seconds:
                current_time = time.time()
                
                if current_time >= next_frame_time:
                    # Capture screen
                    screenshot = sct.grab(monitor)
                    
                    # Convert to numpy array directly from mss screenshot
                    # mss returns BGRA format, we need BGR for OpenCV
                    frame = np.frombuffer(screenshot.bgra, dtype=np.uint8)
                    frame = frame.reshape(screenshot.height, screenshot.width, 4)
                    frame = frame[:, :, :3]  # Remove alpha channel, keep BGR
                    
                    self.frames.append(frame)
                    
                    # Convert to base64 for API
                    _, buffer = cv2.imencode(".jpg", frame)
                    base64_frame = base64.b64encode(buffer).decode("utf-8")
                    self.base64_frames.append(base64_frame)
                    
                    next_frame_time += frame_interval
                    
                    # Show progress
                    elapsed = current_time - start_time
                    remaining = duration_seconds - elapsed
                    print(f"\rRecording... {remaining:.1f}s remaining", end="", flush=True)
                
                time.sleep(0.1)  # Small sleep to prevent excessive CPU usage
        
        print(f"\nRecording completed! Captured {len(self.frames)} frames.")
        
    def save_recording(self, output_path="screen_recording.mp4", fps=2):
        """Save the recorded frames as a video file"""
        if not self.frames:
            print("No frames to save!")
            return
            
        height, width, layers = self.frames[0].shape
        
        # Try different codecs for better compatibility
        codecs_to_try = ['avc1', 'mp4v', 'XVID', 'MJPG']
        video_writer = None
        
        for codec in codecs_to_try:
            fourcc = cv2.VideoWriter_fourcc(*codec)
            video_writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
            if video_writer.isOpened():
                print(f"Using codec: {codec}")
                break
            video_writer.release()
        
        if not video_writer or not video_writer.isOpened():
            print(f"Warning: Could not initialize video writer with any codec. Trying default...")
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            video_writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        for frame in self.frames:
            video_writer.write(frame)
            
        video_writer.release()
        print(f"Video saved as: {output_path}")
        
    def generate_description(self, skip_frames=5):
        """
        Generate a description of the screen recording using GPT-4 vision
        
        Args:
            skip_frames (int): Only send every nth frame to reduce API costs
        """
        if not self.base64_frames:
            print("No frames available for analysis!")
            return None
            
        print("Analyzing screen recording with GPT-4 vision...")
        
        # Select frames to send (every skip_frames to reduce costs)
        selected_frames = self.base64_frames[::skip_frames]
        print(f"Sending {len(selected_frames)} frames for analysis...")
        
        try:
            response = self.client.chat.completions.create(
                model=self._get_vision_model(),
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "These are frames from a screen recording that I want to create a voiceover for. Generate a compelling description of what's happening in this screen recording. Focus on the key actions, interfaces, and content visible."
                            },
                            *[
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{frame}"
                                    }
                                }
                                for frame in selected_frames
                            ]
                        ]
                    }
                ],
                max_tokens=500
            )
            
            description = response.choices[0].message.content
            print("Generated description:")
            print(description)
            return description
            
        except Exception as e:
            print(f"Error generating description: {e}")
            return None
    
    def generate_voiceover_script(self, style="professional narrator", skip_frames=5):
        """
        Generate a voiceover script for the screen recording
        
        Args:
            style (str): Style of narration (e.g., "professional narrator", "David Attenborough", "casual explanation")
            skip_frames (int): Only send every nth frame to reduce API costs
        """
        if not self.base64_frames:
            print("No frames available for script generation!")
            return None
            
        print(f"Generating voiceover script in '{style}' style...")
        
        # Select frames to send
        selected_frames = self.base64_frames[::skip_frames]
        
        try:
            response = self.client.chat.completions.create(
                model=self._get_vision_model(),
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": f"These are frames from a screen recording. Create a voiceover script in the style of a {style}. The script should explain what's happening on screen in an engaging and informative way. Only include the narration text, no stage directions."
                            },
                            *[
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{frame}"
                                    }
                                }
                                for frame in selected_frames
                            ]
                        ]
                    }
                ],
                max_tokens=800
            )
            
            script = response.choices[0].message.content
            print("Generated voiceover script:")
            print("-" * 50)
            print(script)
            print("-" * 50)
            return script
            
        except Exception as e:
            print(f"Error generating script: {e}")
            return None
    
    def generate_audio_voiceover(self, script, voice="alloy", output_path="voiceover.mp3"):
        """
        Generate audio voiceover from script using OpenAI TTS
        
        Args:
            script (str): The voiceover script
            voice (str): Voice model to use (alloy, echo, fable, onyx, nova, shimmer)
            output_path (str): Path to save the audio file
        """
        if not script:
            print("No script provided for audio generation!")
            return None
            
        print(f"Generating audio voiceover with voice '{voice}'...")
        
        try:
            # Instructions for natural narration
            instructions = """
            Voice Affect: Clear, engaging, and professional; convey knowledge and enthusiasm for the subject matter.
            Tone: Informative and approachable, with appropriate emphasis on key points.
            Pacing: Natural and conversational, with appropriate pauses for comprehension.
            Emotion: Professional but warm, maintaining interest without being overly dramatic.
            Emphasis: Highlight important terms and concepts naturally.
            Pronunciation: Clear and precise articulation for accessibility.
            Pauses: Natural breaks between sentences and concepts.
            """
            
            response = self.client.audio.speech.create(
                model=self._get_tts_model(),
                voice=voice,
                input=script,
                speed=1.0
            )
            
            # Save the audio file
            with open(output_path, "wb") as f:
                f.write(response.content)
                
            print(f"Audio voiceover saved as: {output_path}")
            return output_path
            
        except Exception as e:
            print(f"Error generating audio: {e}")
            return None
    
    def run_full_pipeline(self, duration=10, fps=2, style="professional narrator", voice="alloy"):
        """
        Run the complete pipeline: record screen, generate script, create audio
        
        Args:
            duration (int): Recording duration in seconds
            fps (int): Frames per second for recording
            style (str): Narration style
            voice (str): TTS voice model
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        print("=== Screen Recording Voiceover Pipeline ===")
        print(f"Duration: {duration}s, FPS: {fps}, Style: {style}, Voice: {voice}")
        print()
        
        # Step 1: Record screen
        self.record_screen(duration, fps)
        
        # Step 2: Save video
        video_path = f"screen_recording_{timestamp}.mp4"
        self.save_recording(video_path, fps)
        
        # Step 3: Generate script
        script = self.generate_voiceover_script(style)
        if script:
            # Save script to file
            script_path = f"voiceover_script_{timestamp}.txt"
            with open(script_path, "w") as f:
                f.write(script)
            print(f"Script saved as: {script_path}")
            
            # Step 4: Generate audio
            audio_path = f"voiceover_{timestamp}.mp3"
            self.generate_audio_voiceover(script, voice, audio_path)
            
            print(f"\n=== Pipeline Complete ===")
            print(f"Video: {video_path}")
            print(f"Script: {script_path}")
            print(f"Audio: {audio_path}")
        else:
            print("Failed to generate script - pipeline incomplete")

def main():
    parser = argparse.ArgumentParser(description="Record screen and generate voiceover")
    parser.add_argument("--duration", type=int, default=10, help="Recording duration in seconds")
    parser.add_argument("--fps", type=int, default=2, help="Frames per second")
    parser.add_argument("--style", default="professional narrator", help="Narration style")
    parser.add_argument("--voice", default="alloy", choices=["alloy", "echo", "fable", "onyx", "nova", "shimmer"], help="TTS voice")
    parser.add_argument("--description-only", action="store_true", help="Only generate description, no voiceover")
    
    args = parser.parse_args()
    
    # Check for OpenAI API key (regular or Azure)
    has_openai_key = bool(os.environ.get("OPENAI_API_KEY"))
    has_azure_config = bool(os.environ.get("AZURE_OPENAI_ENDPOINT") and os.environ.get("AZURE_OPENAI_API_KEY"))
    
    if not has_openai_key and not has_azure_config:
        print("Error: No OpenAI credentials found!")
        print("Please set up either:")
        print("1. Regular OpenAI: OPENAI_API_KEY=your_api_key_here")
        print("2. Azure OpenAI: AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_API_VERSION")
        print("Create a .env file with your credentials.")
        return
    
    recorder = ScreenRecorderVoiceover()
    
    if args.description_only:
        recorder.record_screen(args.duration, args.fps)
        recorder.generate_description()
    else:
        recorder.run_full_pipeline(args.duration, args.fps, args.style, args.voice)

if __name__ == "__main__":
    main() 