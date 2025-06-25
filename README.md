# 🎥 AI-Powered Screen Recorder

A comprehensive screen recording and analysis system powered by GPT-4 Vision. Available in both Python CLI and modern web versions.

## 🚀 Features

- **📹 Screen Recording**: Capture your screen activities with high quality
- **🤖 AI Analysis**: GPT-4 Vision powered analysis of recorded content
- **💬 Voiceover Generation**: Text-to-speech narration (Python version)
- **🎯 Smart Insights**: Identifies UI elements, workflows, and provides suggestions
- **🔧 Dual Implementation**: Both command-line and web-based versions
- **☁️ Multi-Provider**: Supports both OpenAI and Azure OpenAI

## 📁 Project Structure

```
├── python_mvp/                 # Python CLI implementation
│   ├── screen_recorder_voiceover.py  # Main CLI application
│   ├── utils/                  # Utility modules
│   └── examples/               # Example scripts
├── screen-recorder-webapp/     # Next.js web application
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── app/               # Next.js app router
│   │   └── api/               # API routes
│   └── package.json           # Web dependencies
└── README.md                  # This file
```

## 🛠️ Quick Start

### Option 1: Web Application (Recommended)

1. Navigate to the web app directory:
   ```bash
   cd screen-recorder-webapp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your API credentials:
   ```bash
   # Copy and edit the environment file
   cp .env.example .env.local
   # Add your OpenAI or Azure OpenAI credentials
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open http://localhost:3000 in your browser

### Option 2: Python CLI

1. Navigate to the Python directory:
   ```bash
   cd python_mvp
   ```

2. Install dependencies:
   ```bash
   uv venv
   source .venv/bin/activate
   uv pip install -r requirements.txt
   ```

3. Configure your API credentials:
   ```bash
   cp env.example .env
   # Edit .env with your credentials
   ```

4. Run the application:
   ```bash
   python screen_recorder_voiceover.py
   ```

## 🔧 Configuration

### OpenAI API
```env
OPENAI_API_KEY=your_openai_api_key_here
```

### Azure OpenAI (Alternative)
```env
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your_azure_api_key_here
AZURE_OPENAI_API_VERSION=2024-02-01
AZURE_OPENAI_VISION_DEPLOYMENT=gpt-4-vision-preview
AZURE_OPENAI_TTS_DEPLOYMENT=tts-1
```

## 📱 Web Application Features

- **🎥 Browser-based Recording**: No software installation required
- **🤖 Real-time Analysis**: Extract frames and analyze with GPT-4 Vision
- **📱 Responsive Design**: Works on desktop and mobile
- **🔒 Privacy-first**: All processing happens locally and via your API keys
- **⚡ Fast Performance**: Optimized for modern browsers

## 🖥️ Python CLI Features

- **🎬 High-quality Recording**: Configurable FPS and quality settings
- **🎤 Voiceover Generation**: Multiple narrator styles (professional, David Attenborough, etc.)
- **💾 Multiple Formats**: Save recordings in various formats
- **⚙️ Advanced Configuration**: Extensive customization options
- **📊 Cost Optimization**: Frame sampling and quality controls

## 🎯 Use Cases

- **📚 Tutorial Creation**: Record and analyze software tutorials
- **🐛 Bug Reporting**: Capture issues with AI-generated descriptions
- **📋 Documentation**: Auto-generate process documentation
- **🎓 Training Materials**: Create educational content with insights
- **🔍 UX Analysis**: Analyze user interface workflows

## 🛡️ Privacy & Security

- **�� API Keys**: Stored locally in environment files
- **🏠 Local Processing**: Videos processed on your machine
- **🚫 No Tracking**: No analytics or data collection
- **🔒 Secure**: All API calls use HTTPS

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines and feel free to submit issues or pull requests.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🎉 Acknowledgments

- OpenAI for GPT-4 Vision and TTS APIs
- Microsoft Azure for Azure OpenAI Service
- The open-source community for the excellent libraries used

---

**🚀 Ready to start recording and analyzing? Choose your preferred implementation above and get started!**