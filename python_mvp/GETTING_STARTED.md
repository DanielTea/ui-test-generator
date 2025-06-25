# Getting Started - Screen Recording Voiceover

## Quick Setup Checklist

### 1. Install Dependencies
```bash
# Activate virtual environment (already created)
source .venv/bin/activate

# Dependencies are already installed, but if you need to reinstall:
# uv pip install opencv-python openai pillow pyautogui numpy python-dotenv mss
```

### 2. Set up API Credentials (choose one)

**Option A: Regular OpenAI**
```bash
# Copy the example file
cp env.example .env

# Edit .env file and replace with your actual API key:
# OPENAI_API_KEY=your_actual_api_key_here
```

**Option B: Azure OpenAI**
```bash
# Copy the example file
cp env.example .env

# Edit .env file and add your Azure OpenAI credentials:
# AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
# AZURE_OPENAI_API_KEY=your_azure_api_key_here
# AZURE_OPENAI_API_VERSION=2024-02-01
# AZURE_OPENAI_VISION_DEPLOYMENT=your-gpt4-vision-deployment-name
# AZURE_OPENAI_TTS_DEPLOYMENT=your-tts-deployment-name
```

### 3. Test Basic Screen Recording (No API Key Required)
```bash
# Test basic screen recording
python utils/screen_recorder.py --duration 5 --fps 10

# Test with the demo
python examples/quick_demo.py
```

### 4. Test Full AI Pipeline (Requires API Key)
```bash
# Short test (cost-effective)
python screen_recorder_voiceover.py --duration 10 --fps 1

# Professional style
python screen_recorder_voiceover.py --duration 15 --style "professional narrator" --voice "alloy"

# David Attenborough style
python screen_recorder_voiceover.py --duration 20 --style "David Attenborough" --voice "echo"
```

## What Happens When You Run It

1. **3-second countdown** - Get ready to show what you want recorded
2. **Screen recording** - Your screen is captured at the specified FPS
3. **Video saved** - A `.mp4` file is created
4. **AI analysis** - Frames are sent to GPT-4 Vision for analysis
5. **Script generation** - A voiceover script is created in your chosen style
6. **Audio generation** - Text-to-speech creates the final audio
7. **Files saved** - You get video, script, and audio files

## Cost Management Tips

- **Start with low FPS (1-2)** - Reduces API calls significantly
- **Short recordings first** - Test with 10-15 seconds
- **Use --description-only** - Skip TTS to save costs during testing
- **Clear content** - Make sure screen content is clear and well-lit

## Troubleshooting

### Screen Recording Permission (macOS)
If recording fails, you may need to grant screen recording permissions:
1. System Preferences → Security & Privacy → Privacy → Screen Recording
2. Add Terminal (or your IDE) to allowed apps

### API Errors
- Check that your API key is valid and has credits
- Ensure the `.env` file is in the correct location
- Try with `--description-only` flag first

### Import Errors
Make sure virtual environment is activated:
```bash
source .venv/bin/activate
```

## Next Steps

Once everything works:
1. Experiment with different narration styles
2. Try different voice models
3. Record longer segments
4. Combine multiple recordings

Happy recording! 🎬🎙️ 