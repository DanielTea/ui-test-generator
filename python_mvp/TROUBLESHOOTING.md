# Troubleshooting Guide

## Common Issues and Solutions

### Video Recording Issues

#### 1. Videos Show Only Green Pixels ✅ FIXED
**Problem**: Recorded videos appear all green or have incorrect colors.

**Solution**: This was caused by incorrect color channel handling in the original code. The fix involved:
- Proper handling of BGRA format from `mss` library
- Correct color channel ordering for OpenCV
- Better video codec selection

**Fixed in**: Latest version of the script now handles color formats correctly.

#### 2. Video Codec Issues
**Problem**: Video files won't play or are corrupted.

**Solution**: The script now tries multiple codecs in order:
1. `avc1` (H.264) - Best compatibility
2. `mp4v` - Fallback option
3. `XVID` - Alternative codec
4. `MJPG` - Last resort

**You'll see**: `Using codec: avc1` (or whichever codec works) in the output.

#### 3. Screen Recording Permission (macOS)
**Problem**: Recording fails with permission errors.

**Solution**:
1. Go to System Preferences → Security & Privacy → Privacy → Screen Recording
2. Add Terminal (or your IDE) to the allowed apps
3. Restart Terminal/IDE after granting permission

### API and Authentication Issues

#### 1. "No OpenAI credentials found"
**Problem**: Script can't authenticate with OpenAI services.

**Solutions**:
- **For Regular OpenAI**: Set `OPENAI_API_KEY` in `.env` file
- **For Azure OpenAI**: Set `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, and `AZURE_OPENAI_API_VERSION`

#### 2. "Deployment not found" (Azure OpenAI)
**Problem**: Azure can't find your model deployments.

**Solution**:
- Verify deployment names in Azure OpenAI Studio
- Check `AZURE_OPENAI_VISION_DEPLOYMENT` and `AZURE_OPENAI_TTS_DEPLOYMENT` in `.env`
- Ensure models are successfully deployed and running

#### 3. "Unsupported data type" (TTS)
**Problem**: Text-to-speech generation fails.

**Solutions**:
- For Azure: Try `tts-1-hd` instead of `tts-1`
- Use `--description-only` flag to skip TTS
- Check if your TTS deployment is active

### Performance Issues

#### 1. High API Costs
**Problem**: Costs are higher than expected.

**Solutions**:
- Use lower FPS: `--fps 1` or `--fps 2`
- Shorter recordings: `--duration 10`
- Use `--description-only` for testing
- Skip frames: The script automatically skips frames to reduce costs

#### 2. Slow Processing
**Problem**: Script takes a long time to process.

**Solutions**:
- Reduce frame rate: `--fps 1`
- Shorter recordings
- Clear, high-contrast screen content
- Stable internet connection for API calls

### Installation Issues

#### 1. Import Errors
**Problem**: `ModuleNotFoundError` when running script.

**Solution**:
```bash
# Make sure virtual environment is activated
source .venv/bin/activate

# Reinstall dependencies
uv pip install opencv-python openai pillow pyautogui numpy python-dotenv mss
```

#### 2. OpenCV Issues
**Problem**: OpenCV won't install or crashes.

**Solutions**:
```bash
# Try different OpenCV version
uv pip install opencv-python-headless

# Or specific version
uv pip install opencv-python==4.8.0.76
```

### Testing and Debugging

#### 1. Test Video Recording (No AI)
```bash
# Test basic recording
python utils/screen_recorder.py --duration 5 --fps 2

# Test with verification
python test_video_fix.py
```

#### 2. Test AI Features
```bash
# Test description only (cheaper)
python screen_recorder_voiceover.py --duration 5 --description-only

# Test full pipeline
python screen_recorder_voiceover.py --duration 10 --fps 1
```

#### 3. Check API Connection
```bash
# For Azure OpenAI
curl -H "api-key: YOUR_API_KEY" \
     "YOUR_ENDPOINT/openai/deployments/YOUR_DEPLOYMENT/chat/completions?api-version=2024-02-01" \
     -H "Content-Type: application/json" \
     -d '{"messages":[{"role":"user","content":"Hello"}],"max_tokens":5}'
```

### Quality Issues

#### 1. Poor Script Quality
**Problem**: Generated voiceover scripts are not good.

**Solutions**:
- Use clear, well-lit screen content
- Avoid busy/cluttered interfaces
- Try different narration styles: `--style "David Attenborough"`
- Increase FPS for more detailed analysis (but higher cost)

#### 2. Bad Audio Quality
**Problem**: Generated audio doesn't sound good.

**Solutions**:
- Try different voices: `--voice echo` or `--voice nova`
- Check TTS model deployment (for Azure)
- Verify script quality first with `--description-only`

### Environment Setup

#### 1. Virtual Environment Issues
```bash
# Recreate virtual environment
rm -rf .venv
uv venv
source .venv/bin/activate
uv pip install opencv-python openai pillow pyautogui numpy python-dotenv mss
```

#### 2. Environment Variables
```bash
# Check if variables are loaded
python -c "import os; print('OPENAI_API_KEY' in os.environ)"
python -c "import os; print('AZURE_OPENAI_ENDPOINT' in os.environ)"
```

### Getting Help

If you're still having issues:

1. **Check the output**: Look for specific error messages
2. **Try minimal examples**: Start with basic recording
3. **Check permissions**: Especially on macOS
4. **Verify credentials**: API keys and endpoints
5. **Test connectivity**: Can you reach the API endpoints?

### Useful Debug Commands

```bash
# Check OpenCV installation
python -c "import cv2; print(cv2.__version__)"

# Check available codecs
python -c "import cv2; print([chr(i) for i in cv2.VideoWriter_fourcc(*'avc1')])"

# Test screen capture
python -c "import mss; print(len(mss.mss().monitors))"

# Check environment variables
env | grep -i openai
```

---

**Still having issues?** Try running the test script: `python test_video_fix.py` 