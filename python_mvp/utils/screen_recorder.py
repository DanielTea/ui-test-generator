"""
Utility module for screen recording functionality.
This module provides basic screen recording capabilities using mss and OpenCV.
"""

import cv2
import numpy as np
import time
from datetime import datetime
import mss
from PIL import Image
import os

class BasicScreenRecorder:
    """Simple screen recorder using mss and OpenCV"""
    
    def __init__(self):
        self.frames = []
        
    def record_screen(self, duration_seconds=10, fps=30, monitor_index=1):
        """
        Record screen for specified duration
        
        Args:
            duration_seconds (int): How long to record in seconds
            fps (int): Frames per second to capture
            monitor_index (int): Monitor to record (1 for primary, 0 for all)
        """
        print(f"Starting screen recording for {duration_seconds} seconds at {fps} FPS...")
        print("Recording will start in 3 seconds - get ready!")
        
        # Countdown
        for i in range(3, 0, -1):
            print(f"{i}...")
            time.sleep(1)
        
        print("Recording started!")
        
        with mss.mss() as sct:
            # Get the specified monitor
            monitor = sct.monitors[monitor_index]
            
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
                    next_frame_time += frame_interval
                    
                    # Show progress
                    elapsed = current_time - start_time
                    remaining = duration_seconds - elapsed
                    print(f"\rRecording... {remaining:.1f}s remaining", end="", flush=True)
                
                time.sleep(0.01)  # Small sleep to prevent excessive CPU usage
        
        print(f"\nRecording completed! Captured {len(self.frames)} frames.")
        
    def save_video(self, output_path=None, fps=30):
        """
        Save recorded frames as a video file
        
        Args:
            output_path (str): Path to save video file
            fps (int): Frames per second for output video
        """
        if not self.frames:
            print("No frames to save!")
            return None
            
        if output_path is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"screen_recording_{timestamp}.mp4"
            
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
        return output_path
        
    def clear_frames(self):
        """Clear stored frames to free memory"""
        self.frames.clear()
        print("Frames cleared from memory")

def main():
    """Simple command-line interface for screen recording"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Simple screen recorder")
    parser.add_argument("--duration", type=int, default=10, help="Recording duration in seconds")
    parser.add_argument("--fps", type=int, default=30, help="Frames per second")
    parser.add_argument("--output", type=str, help="Output video file path")
    
    args = parser.parse_args()
    
    recorder = BasicScreenRecorder()
    recorder.record_screen(args.duration, args.fps)
    recorder.save_video(args.output, args.fps)

if __name__ == "__main__":
    main() 