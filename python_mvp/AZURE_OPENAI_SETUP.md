# Azure OpenAI Setup Guide

## Overview

The screen recording voiceover script now supports both regular OpenAI and Azure OpenAI deployments. This guide focuses specifically on setting up Azure OpenAI integration.

## Why Use Azure OpenAI?

- **Enterprise-grade security and compliance**
- **Data residency control**
- **Integration with existing Azure services**
- **Cost management through Azure billing**
- **Private network connectivity options**

## Prerequisites

1. **Azure Subscription** with access to Azure OpenAI Service
2. **Azure OpenAI Resource** deployed in your subscription
3. **Model Deployments** for the required models:
   - **GPT-4 Vision model** (for analyzing screen recordings)
   - **TTS model** (for generating voiceovers)

## Step-by-Step Setup

### 1. Create Azure OpenAI Resource

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a new **Azure OpenAI** resource
3. Note down your **endpoint URL** (e.g., `https://your-resource-name.openai.azure.com/`)
4. Get your **API key** from the Keys section

### 2. Deploy Required Models

In Azure OpenAI Studio:

1. **Deploy GPT-4 Vision Model**:
   - Model: `gpt-4-vision-preview` or `gpt-4-turbo` with vision
   - Deployment name: `gpt-4-vision` (or your preferred name)

2. **Deploy TTS Model**:
   - Model: `tts-1` or `tts-1-hd`
   - Deployment name: `tts-1` (or your preferred name)

### 3. Configure Environment Variables

Create a `.env` file in your project directory:

```bash
# Copy the Azure example
cp azure_openai_example.env .env
```

Edit `.env` with your actual values:

```env
# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_API_KEY=your_actual_api_key_here
AZURE_OPENAI_API_VERSION=2024-02-01

# Your deployment names (must match what you created in Azure)
AZURE_OPENAI_VISION_DEPLOYMENT=gpt-4-vision
AZURE_OPENAI_TTS_DEPLOYMENT=tts-1
```

### 4. Test the Setup

```bash
# Activate virtual environment
source .venv/bin/activate

# Test with a short recording
python screen_recorder_voiceover.py --duration 10 --fps 1

# You should see: "Using Azure OpenAI..." at the start
```

## Configuration Options

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `AZURE_OPENAI_ENDPOINT` | Your Azure OpenAI resource endpoint | `https://myai.openai.azure.com/` |
| `AZURE_OPENAI_API_KEY` | API key from Azure portal | `abc123...` |
| `AZURE_OPENAI_API_VERSION` | API version to use | `2024-02-01` |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AZURE_OPENAI_VISION_DEPLOYMENT` | Name of your GPT-4 Vision deployment | `gpt-4-vision` |
| `AZURE_OPENAI_TTS_DEPLOYMENT` | Name of your TTS deployment | `tts-1` |

## Features

### Automatic Detection

The script automatically detects whether to use Azure OpenAI or regular OpenAI:

- If `AZURE_OPENAI_ENDPOINT` and `AZURE_OPENAI_API_KEY` are set → Uses Azure OpenAI
- Otherwise → Falls back to regular OpenAI (requires `OPENAI_API_KEY`)

### Model Deployment Names

Unlike regular OpenAI, Azure uses deployment names instead of model names:

```python
# Regular OpenAI
model="gpt-4-vision-preview"

# Azure OpenAI  
model="your-deployment-name"  # e.g., "gpt-4-vision"
```

## Usage Examples

All the same commands work with Azure OpenAI:

```bash
# Basic usage
python screen_recorder_voiceover.py --duration 15

# Different styles
python screen_recorder_voiceover.py --duration 20 --style "David Attenborough" --voice "echo"

# Cost-effective testing
python screen_recorder_voiceover.py --duration 10 --fps 1 --description-only
```

## Troubleshooting

### Common Issues

1. **"Unsupported data type" error in TTS**:
   - This is a known issue with certain Azure TTS deployments
   - Try using `tts-1-hd` deployment instead of `tts-1`
   - Or test with `--description-only` flag first

2. **"Authentication failed"**:
   - Verify your API key is correct
   - Check that your Azure resource is active
   - Ensure you have the correct permissions

3. **"Deployment not found"**:
   - Verify deployment names match exactly
   - Check that models are successfully deployed in Azure OpenAI Studio

4. **Rate limiting**:
   - Azure has different rate limits than OpenAI
   - Reduce FPS or add delays if hitting limits

### Verification Commands

```bash
# Test Azure connectivity (requires curl)
curl -H "api-key: YOUR_API_KEY" \
     "YOUR_ENDPOINT/openai/deployments/YOUR_DEPLOYMENT/chat/completions?api-version=2024-02-01" \
     -H "Content-Type: application/json" \
     -d '{"messages":[{"role":"user","content":"Hello"}],"max_tokens":5}'
```

## Cost Management

- **Azure billing** integrates with your existing Azure cost management
- **Use lower FPS** (1-2) for cost-effective testing
- **Monitor usage** through Azure portal
- **Set up alerts** for spending thresholds

## Security Benefits

- **VNet integration** for private connectivity
- **Managed identity** support
- **Customer-managed keys** for encryption
- **Compliance certifications** (SOC, ISO, etc.)

## Next Steps

1. Set up monitoring and alerting in Azure
2. Configure network security if needed
3. Integrate with Azure Key Vault for credential management
4. Explore batch processing for multiple recordings

Happy recording with Azure OpenAI! 🎬☁️ 