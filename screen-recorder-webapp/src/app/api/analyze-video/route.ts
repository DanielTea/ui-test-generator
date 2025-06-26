import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { readFileSync } from 'fs'
import { join } from 'path'



// Function to read system prompt from markdown file
function getSystemPrompt(): string {
  try {
    const promptPath = join(process.cwd(), 'prompts', 'ui-test-generation.md')
    const promptContent = readFileSync(promptPath, 'utf-8')
    
    // Extract the content after the title and before any code blocks
    const lines = promptContent.split('\n')
    const contentLines = lines.slice(2) // Skip title and empty line
    
    // Join lines and clean up markdown formatting
    return contentLines
      .join('\n')
      .replace(/^##\s+/gm, '') // Remove markdown headers
      .replace(/^\*\*([^*]+)\*\*:/gm, '$1:') // Clean up bold formatting
      .replace(/`([^`]+)`/g, '$1') // Remove backticks
      .trim()
  } catch (error) {
    console.warn('Could not read system prompt from file, using fallback:', error)
    return getFallbackSystemPrompt()
  }
}

// Fallback system prompt if file reading fails
function getFallbackSystemPrompt(): string {
  return `You are an expert UI test automation engineer. Your task is to analyze screen recording frames and generate comprehensive UI test scripts.

Analyze the provided video frames showing a user interface workflow. Focus on:
1. User Actions: Identify clicks, form inputs, navigation, and interactions
2. UI Elements: Note buttons, forms, menus, modals, and other interface components
3. State Changes: Observe how the UI responds to user actions
4. Data Flow: Track information being entered, submitted, or displayed
5. Navigation Patterns: Document page transitions and routing

Generate a structured test script with exact element descriptions, sequential steps, and variable placeholders for dynamic data.`
}

// Helper function to extract lists from text
function extractListFromText(text: string, keywords: string[]): string[] {
  const lines = text.split('\n')
  const items: string[] = []
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('•')) {
      items.push(trimmed.substring(1).trim())
    } else if (keywords.some(keyword => trimmed.toLowerCase().includes(keyword))) {
      items.push(trimmed)
    }
  }
  
  return items.length > 0 ? items : ['Analysis completed - see summary for details']
}

// Initialize OpenAI client - supports both OpenAI and Azure OpenAI
const openai = (() => {
  if (process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY) {
    // Azure OpenAI configuration
    return new OpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      baseURL: process.env.AZURE_OPENAI_ENDPOINT,
      defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION || '2024-02-01' },
      defaultHeaders: {
        'api-key': process.env.AZURE_OPENAI_API_KEY,
      },
    })
  } else if (process.env.OPENAI_API_KEY) {
    // Standard OpenAI configuration
    return new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return null
})()

export async function POST(request: NextRequest) {
  try {
    // Check if API is configured
    if (!openai) {
      return NextResponse.json(
        { error: 'OpenAI API not configured. Please add either OPENAI_API_KEY or Azure OpenAI credentials to your environment variables.' },
        { status: 500 }
      )
    }

    // Get the frames data and settings from request body
    const body = await request.json()
    const frames = body.frames
    const settings = body.settings || {}
    
    // Force UI test generation mode
    settings.focusArea = 'ui-test-generation'
    
    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return NextResponse.json(
        { error: 'No frame data provided' },
        { status: 400 }
      )
    }

    // Analyze with GPT-4 Vision using multiple frames for mouse tracking
    const modelName = process.env.AZURE_OPENAI_VISION_DEPLOYMENT || "gpt-4-vision-preview"
    
    // Build analysis prompt based on settings
    const getFocusPrompt = (focusArea: string) => {
      switch (focusArea) {
        case 'ui-test-generation':
          return `Generate a detailed UI test script by analyzing the user interactions in these frames. Focus on:
          - Exact click locations and UI elements (buttons, links, inputs, etc.)
          - Text input and form field interactions
          - Navigation steps and URL changes
          - Specific element selectors and identifiers
          - Login flows with placeholder variables like {{USERNAME}}, {{PASSWORD}}
          - Expected visual outcomes and state changes
          - Sequential order of all user actions
          
          Be very specific about:
          - Button texts and labels
          - Input field names and values
          - Menu items and navigation paths
          - Any visible text or UI element the user interacts with`
        case 'mouse-tracking':
          return `Pay special attention to:
          - Mouse cursor position changes between frames
          - Click locations and target elements
          - Drag and drop operations
          - Mouse hover effects and interactions`
        case 'ui-elements':
          return `Focus on:
          - UI components and their states
          - Button interactions and form elements
          - Navigation patterns and menu usage
          - Visual hierarchy and layout`
        case 'workflow':
          return `Analyze:
          - Step-by-step workflow progression
          - Task completion patterns
          - Efficiency and bottlenecks
          - User journey through the interface`
        case 'accessibility':
          return `Evaluate:
          - Keyboard navigation patterns
          - Focus indicators and tab order
          - Text size and contrast issues
          - Screen reader compatibility`
        case 'performance':
          return `Look for:
          - Loading states and delays
          - Responsive design issues
          - Animation performance
          - User frustration indicators`
        default:
          return `Pay attention to mouse movements, UI interactions, and user workflow patterns.`
      }
    }

    const getStylePrompt = (analysisStyle: string) => {
      switch (analysisStyle) {
        case 'technical':
          return 'Provide technical details, code suggestions, and implementation insights.'
        case 'user-friendly':
          return 'Use simple language and focus on user experience improvements.'
        case 'detailed':
          return 'Provide comprehensive analysis with specific examples and detailed explanations.'
        default:
          return 'Provide clear, actionable insights.'
      }
    }

    // Create content array with customized prompt and all frames
    const isUITestGeneration = settings.focusArea === 'ui-test-generation'
    
    const basePrompt = isUITestGeneration 
      ? `${getSystemPrompt()}

    **REQUIRED JSON FORMAT:**
    {
      "summary": "Brief description of the workflow being tested",
      "testSteps": [
        {"order": 1, "description": "Specific action description with exact UI elements"},
        {"order": 2, "description": "Next action with precise instructions"},
        {"expected_outcome": "What should be validated after test completion"}
      ],
      "variables": ["{{USERNAME}}", "{{PASSWORD}}", "{{OTHER_VARS}}"],
      "suggestions": ["Additional test scenarios or improvements"]
    }

    **CRITICAL REQUIREMENTS:**
    1. **Exact UI Elements**: Describe precise button texts, field names, link labels
    2. **Sequential Order**: Number each step clearly (order: 1, 2, 3...)
    3. **Variables**: Use {{VARIABLE_NAME}} format for credentials and dynamic data
    4. **Specific Clicks**: "Click the 'Login' button" not "click button"
    5. **Form Interactions**: "Enter {{USERNAME}} in the 'Email' field"
    6. **Navigation**: Include exact URLs or page names when visible
    7. **Expected Outcomes**: Describe visual changes, success states, error conditions

    **Examples of good step descriptions:**
    - "Go to https://example.com/login"
    - "Enter {{USERNAME}} in the 'Email' input field"
    - "Click the blue 'Sign In' button"
    - "Navigate to the 'Dashboard' tab in the main menu"
    - "Select 'Production' from the environment dropdown"

    ${getFocusPrompt(settings.focusArea)}
    
    Analysis Style: ${getStylePrompt(settings.analysisStyle || 'standard')}
    
    ${settings.customPrompt ? `Additional Instructions: ${settings.customPrompt}` : ''}`
      : `Analyze these sequential screen recording frames${settings.includeTimestamps ? ' with their timestamps' : ''}. Provide insights in the following JSON format:
    {
      "summary": "Brief description of what's shown in the screen recording sequence",
      "keyActions": ["List of key actions or UI interactions visible"],
      "mouseMovements": ["List of mouse cursor movements and clicks observed between frames"],
      "suggestions": ["Suggestions for improvement or next steps"]
    }
    
    ${getFocusPrompt(settings.focusArea || 'mouse-tracking')}
    
    Analysis Style: ${getStylePrompt(settings.analysisStyle || 'standard')}
    
    ${settings.customPrompt ? `Additional Instructions: ${settings.customPrompt}` : ''}
    
    If you cannot clearly see the mouse cursor, focus on visible UI state changes that suggest interactions.`

    const content = [
      {
        type: "text",
        text: basePrompt
      }
    ]
    
    // Add each frame as an image
    frames.forEach((frame: string, index: number) => {
      content.push({
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${frame}`
        }
      } as any)
    })

    const response = await openai.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: "user",
          content: content as any
        }
      ],
      max_tokens: 1500
    })

    const analysisText = response.choices[0]?.message?.content
    if (!analysisText) {
      throw new Error('No analysis response received')
    }

    // Try to parse JSON response, fallback to structured parsing
    let analysis
    try {
      analysis = JSON.parse(analysisText)
      // Ensure the response has the required structure
      if (!analysis.title) analysis.title = "UI Test"
      if (!analysis.summary) analysis.summary = "Analysis completed"
      if (!Array.isArray(analysis.steps)) analysis.steps = []
      if (!Array.isArray(analysis.variables)) analysis.variables = []
      
      // Map new format to legacy format for backward compatibility
      if (analysis.steps && !analysis.testSteps) {
        analysis.testSteps = analysis.steps
      }
      
      // Legacy support for older analysis types
      if (!Array.isArray(analysis.keyActions)) analysis.keyActions = []
      if (!Array.isArray(analysis.mouseMovements)) analysis.mouseMovements = []
    } catch {
      // If not JSON, create structured response from text
      const isUITest = settings.focusArea === 'ui-test-generation'
      
      if (isUITest) {
        // Try to extract test steps from text
        const lines = analysisText.split('\n').filter(line => line.trim())
        const testSteps = []
        let order = 1
        
        for (const line of lines) {
          if (line.toLowerCase().includes('click') || 
              line.toLowerCase().includes('enter') || 
              line.toLowerCase().includes('go to') ||
              line.toLowerCase().includes('navigate') ||
              line.toLowerCase().includes('select')) {
            testSteps.push({
              order: order++,
              description: line.trim()
            })
          }
        }
        
        analysis = {
          title: "Generated UI Test",
          summary: lines[0] || "UI test analysis completed",
          steps: testSteps,
          testSteps: testSteps, // Legacy compatibility
          variables: extractListFromText(analysisText, ['{{', '}}']).map(v => v.replace(/[{}]/g, ''))
        }
      } else {
        analysis = {
          summary: analysisText.split('\n')[0] || "Analysis completed",
          keyActions: extractListFromText(analysisText, ['action', 'element', 'step']),
          mouseMovements: extractListFromText(analysisText, ['mouse', 'cursor', 'click', 'drag', 'move']),
          suggestions: extractListFromText(analysisText, ['suggest', 'improve', 'recommend'])
        }
      }
    }

    // Final validation to ensure proper structure
    const validatedAnalysis = {
      title: analysis.title || "UI Test",
      summary: analysis.summary || "Analysis completed",
      steps: Array.isArray(analysis.steps) ? analysis.steps : [],
      testSteps: Array.isArray(analysis.testSteps) ? analysis.testSteps : Array.isArray(analysis.steps) ? analysis.steps : [], // Legacy compatibility
      variables: Array.isArray(analysis.variables) ? analysis.variables : [],
      // Legacy fields for backward compatibility
      keyActions: Array.isArray(analysis.keyActions) ? analysis.keyActions : [],
      mouseMovements: Array.isArray(analysis.mouseMovements) ? analysis.mouseMovements : []
    }

    return NextResponse.json(validatedAnalysis)

  } catch (error: any) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: `Analysis failed: ${error.message}` },
      { status: 500 }
    )
  }
} 