# UI Test Generator

A modern web application that records your screen interactions and automatically generates detailed UI test scripts using AI.

## Features

- 🧪 **AI-Powered UI Test Generation**: Automatically creates test scripts from recorded workflows
- 🖼️ **Frame Visualization**: See exactly which frames are being analyzed by the AI
- ⚙️ **Configurable Detail Levels**: Choose from 3-30 frames for basic to ultra-detailed test coverage
- 💰 **Cost Estimation**: Real-time cost estimates for AI analysis
- 📱 **Modern UI**: Clean, responsive interface built with Next.js and Tailwind CSS
- 🔧 **Flexible Settings**: Customizable analysis parameters and test instructions

## How It Works

1. **Record**: Click "Start Recording" to capture your screen as you perform UI workflows
2. **Analyze**: Select your preferred detail level (more frames = more detailed test steps)
3. **Generate**: AI analyzes the key frames and generates structured UI test scripts
4. **Review**: View the extracted frames and generated test JSON with variables and expected outcomes

## Generated Test Format

The AI generates test scripts in this structured format:

```json
{
  "testSteps": [
    {
      "order": 1,
      "description": "Navigate to login page by clicking 'Login' button",
      "expected_outcome": "Login form should be visible"
    },
    {
      "order": 2,
      "description": "Enter username '{{USERNAME}}' in username field",
      "expected_outcome": "Username field should display entered text"
    }
  ],
  "variables": ["{{USERNAME}}", "{{PASSWORD}}"],
  "summary": "Complete login workflow test"
}
```

## Cost Estimation

- **Basic (3 frames)**: ~$0.05 per test generation
- **Standard (5 frames)**: ~$0.08 per test generation  
- **Detailed (10 frames)**: ~$0.15 per test generation
- **Comprehensive (15+ frames)**: $0.25+ per test generation

## Technical Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **AI Integration**: OpenAI GPT-4 Vision API / Azure OpenAI
- **Recording**: Browser MediaRecorder API with screen capture
- **Frame Analysis**: HTML5 Canvas for frame extraction and processing

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env.local
```

Add your OpenAI API key or Azure OpenAI configuration:
```
OPENAI_API_KEY=your_openai_api_key
# OR for Azure OpenAI:
AZURE_OPENAI_API_KEY=your_azure_key
AZURE_OPENAI_ENDPOINT=your_azure_endpoint
AZURE_OPENAI_DEPLOYMENT_NAME=your_deployment_name
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) to start generating UI tests!

## Use Cases

- **QA Automation**: Generate test scripts for manual testing workflows
- **Documentation**: Create step-by-step UI interaction guides
- **Test Case Creation**: Convert user workflows into structured test cases
- **UI Validation**: Ensure UI elements and interactions work as expected

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari (limited screen recording support)

Screen recording requires HTTPS in production environments.
