# UI Test Generator

A modern web application that records your screen interactions and automatically generates detailed UI test scripts using AI.

## Features

- 🧪 **AI-Powered UI Test Generation**: Automatically creates test scripts from recorded workflows
- ✂️ **Video Trimming**: iPhone-style drag-and-drop video trimming to focus on specific workflow sections
- 🖼️ **Intelligent Frame Selection**: Automatically captures and selects unique frames, eliminating duplicates
- ⚙️ **Configurable Detail Levels**: Choose from 3-50 frames for basic to ultra-detailed test coverage (default: 30)
- 💰 **Cost Estimation**: Real-time cost estimates for AI analysis
- 📱 **Modern UI**: Clean, responsive interface built with Next.js and Tailwind CSS
- 🔧 **Smart Frame Processing**: Multiple fallback methods ensure optimal frame extraction across all video types

## How It Works

1. **Record**: Click "Start Recording" to capture your screen as you perform UI workflows
2. **Trim**: Use the iPhone-style trimmer to cut your video to the exact workflow section you want to test
3. **Process**: System intelligently captures multiple frames and selects unique ones across the entire video
4. **Analyze**: Select your preferred detail level (more frames = more detailed test steps, default: 30)
5. **Generate**: AI analyzes the selected unique frames and generates structured UI test scripts
6. **Review**: View the unique frames sent to AI and the generated test JSON with variables and expected outcomes

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
- **Comprehensive (15 frames)**: ~$0.25 per test generation
- **High Detail (20 frames)**: ~$0.30 per test generation
- **Ultra Detail (30+ frames)**: $0.45+ per test generation (default: 30 frames)

*Note: Only unique frames are sent to the AI, optimizing both cost and analysis quality.*

## Technical Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **AI Integration**: OpenAI GPT-4 Vision API / Azure OpenAI
- **Recording**: Browser MediaRecorder API with screen capture
- **Frame Analysis**: HTML5 Canvas for frame extraction and processing
- **Prompt Management**: Markdown-based system prompts for easy customization

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

## Customizing AI Prompts

The system prompt used for UI test generation is stored in `prompts/ui-test-generation.md`. You can:

1. **Edit the prompt**: Modify the markdown file to change how the AI analyzes your recordings
2. **Add custom instructions**: Include specific requirements for your testing framework
3. **Adjust analysis focus**: Change what aspects of the UI the AI should prioritize
4. **Test changes**: The system automatically reads the updated prompt on each API call

Example customizations:
- Add specific element selector formats (CSS, XPath, etc.)
- Include company-specific testing standards
- Modify the JSON output format
- Add domain-specific terminology or requirements

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
