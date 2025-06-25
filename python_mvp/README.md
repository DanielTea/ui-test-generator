# Screen Recording with GPT-Powered Voiceover

This project adapts the [OpenAI cookbook example for GPT with vision for video understanding](https://nbviewer.org/format/script/github/openai/openai-cookbook/blob/main/examples/GPT_with_vision_for_video_understanding.ipynb) to record your screen and automatically generate professional voiceovers using GPT-4 Vision and OpenAI's Text-to-Speech API.

## Features

- **Screen Recording**: Capture your screen activity with customizable duration and frame rate
- **AI Analysis**: Use GPT-4 Vision to analyze and understand what's happening in your screen recording
- **Script Generation**: Automatically generate voiceover scripts in various styles (professional narrator, David Attenborough, casual explanation, etc.)
- **Text-to-Speech**: Convert scripts to high-quality audio using OpenAI's TTS API with multiple voice options
- **Complete Pipeline**: One command to record, analyze, script, and generate audio

## Prerequisites

- Python 3.8+
- **Either:**
  - OpenAI API key (get one from [OpenAI Platform](https://platform.openai.com/account/api-keys))
  - **OR** Azure OpenAI deployment with GPT-4 Vision and TTS models
- macOS (tested on darwin 24.5.0) - should work on other platforms with minor modifications

## Installation

1. **Clone/Download the project**:
   ```bash
   cd /path/to/your/project
   ```

2. **Set up the virtual environment using uv**:
   ```bash
   # Install uv if you haven't already
   curl -LsSf https://astral.sh/uv/install.sh | sh
   
   # Create and activate virtual environment
   uv venv
   source .venv/bin/activate
   
   # Install dependencies
   uv pip install -e .
   ```

3. **Set up your API credentials** (choose one):

   **Option A: Regular OpenAI**
   ```bash
   # Copy the example environment file
   cp env.example .env
   
   # Edit .env and add your OpenAI API key
   echo "OPENAI_API_KEY=your_actual_api_key_here" > .env
   ```

   **Option B: Azure OpenAI**
   ```bash
   # Copy the example environment file
   cp env.example .env
   
   # Edit .env and add your Azure OpenAI credentials:
   # AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
   # AZURE_OPENAI_API_KEY=your_azure_api_key_here
   # AZURE_OPENAI_API_VERSION=2024-02-01
   # AZURE_OPENAI_VISION_DEPLOYMENT=your-gpt4-vision-deployment-name
   # AZURE_OPENAI_TTS_DEPLOYMENT=your-tts-deployment-name
   ```

## Usage

### Basic Usage

Record a 10-second screen recording and generate a professional voiceover:

```bash
python screen_recorder_voiceover.py
```

### Advanced Usage

Customize the recording and voiceover parameters:

```bash
# Record for 30 seconds with different style and voice
python screen_recorder_voiceover.py --duration 30 --style "David Attenborough" --voice "echo"

# Just generate a description without voiceover
python screen_recorder_voiceover.py --description-only --duration 15

# Different frame rate (higher FPS = more detailed analysis but more expensive)
python screen_recorder_voiceover.py --duration 20 --fps 3
```

### Available Options

- `--duration`: Recording duration in seconds (default: 10)
- `--fps`: Frames per second for recording (default: 2, higher = more expensive)
- `--style`: Narration style (default: "professional narrator")
  - Examples: "David Attenborough", "casual explanation", "technical tutorial", "enthusiastic presenter"
- `--voice`: TTS voice model (default: "alloy")
  - Options: alloy, echo, fable, onyx, nova, shimmer
- `--description-only`: Only generate description, skip voiceover generation

### Standalone Screen Recording

For just screen recording without AI features:

```bash
python utils/screen_recorder.py --duration 30 --fps 30 --output my_recording.mp4
```

## Output Files

The script generates timestamped files:

- `screen_recording_YYYYMMDD_HHMMSS.mp4` - The original screen recording
- `voiceover_script_YYYYMMDD_HHMMSS.txt` - The generated script
- `voiceover_YYYYMMDD_HHMMSS.mp3` - The audio voiceover

## Cost Considerations

- **GPT-4 Vision API**: Charged per image analyzed (~$0.01-0.03 per image)
- **Text-to-Speech API**: ~$0.015 per 1K characters
- **Frame Rate Impact**: Higher FPS = more frames sent to API = higher cost
  - 2 FPS (default): Good balance of quality and cost
  - 1 FPS: Very cost-effective for simple recordings
  - 3+ FPS: Higher detail but significantly more expensive

## Examples

### Tutorial Recording
```bash
python screen_recorder_voiceover.py --duration 60 --style "technical tutorial narrator" --voice "nova"
```

### Nature Documentary Style
```bash
python screen_recorder_voiceover.py --duration 30 --style "David Attenborough observing the digital ecosystem" --voice "echo"
```

### Quick Demo
```bash
python screen_recorder_voiceover.py --duration 15 --style "enthusiastic product demo presenter" --voice "alloy"
```

## Troubleshooting

### Common Issues

1. **"No OpenAI credentials found"**
   - Make sure you've created a `.env` file with either OpenAI or Azure OpenAI credentials
   - For regular OpenAI: `OPENAI_API_KEY=your_key_here`
   - For Azure OpenAI: `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, and deployment names
   - Ensure the file is in the same directory as the script

2. **Import errors**
   - Make sure you've activated the virtual environment: `source .venv/bin/activate`
   - Install dependencies: `uv pip install -e .`

3. **Screen recording issues on macOS**
   - You may need to grant screen recording permissions to Terminal/your IDE
   - Go to System Preferences > Security & Privacy > Privacy > Screen Recording

4. **Low quality recordings**
   - Increase FPS for smoother video (but higher API costs)
   - Ensure good lighting and clear content on screen

### Performance Tips

- Use lower FPS (1-2) for cost-effective analysis
- Record shorter segments for faster processing
- Clear, high-contrast content works best for AI analysis

## Architecture

The project is structured as follows:

- `screen_recorder_voiceover.py` - Main script with full AI pipeline
- `utils/screen_recorder.py` - Basic screen recording utility
- `pyproject.toml` - Project dependencies and configuration
- `README.md` - This documentation

## API Models Used

- **GPT-4 Vision Preview**: For analyzing screen recording frames
- **TTS-1**: For generating high-quality speech from text
- **Multiple Voice Options**: Different personality options for narration

## Contributing

This project is based on the OpenAI cookbook example. Feel free to adapt and extend it for your specific use cases.

## License

This project is provided as-is for educational and personal use. Please refer to OpenAI's terms of service for API usage guidelines. 