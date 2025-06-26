# AI Prompts Directory

This directory contains the system prompts used by the UI Test Generator to analyze screen recordings and generate test scripts.

## Files

### `ui-test-generation.md`
The main system prompt that instructs the AI on how to analyze screen recording frames and generate UI test scripts.

## Customizing Prompts

### Basic Customization
1. Open `ui-test-generation.md` in any text editor
2. Modify the content to match your requirements
3. Save the file - changes take effect immediately on the next analysis

### Advanced Customization

#### Adding Framework-Specific Instructions
```markdown
## Test Generation Requirements

Generate test scripts compatible with Selenium WebDriver:
- Use explicit CSS selectors: `driver.findElement(By.cssSelector("..."))`
- Include wait conditions: `WebDriverWait(driver, 10).until(...)`
- Add assertions: `assert element.is_displayed()`
```

#### Custom Variable Patterns
```markdown
## Variable Detection

Automatically identify and replace these patterns:
- User credentials: `{{TEST_USER}}`, `{{TEST_PASSWORD}}`
- Environment data: `{{BASE_URL}}`, `{{API_ENDPOINT}}`
- Test data: `{{SAMPLE_EMAIL}}`, `{{RANDOM_STRING}}`
```

#### Output Format Modifications
```markdown
## Test Generation Requirements

Generate test scripts in this exact format:
{
  "testName": "Descriptive test name",
  "steps": [
    {
      "stepNumber": 1,
      "action": "click",
      "target": "#login-button",
      "value": "",
      "description": "Click the login button"
    }
  ]
}
```

## Best Practices

1. **Be Specific**: Include exact requirements for element identification
2. **Use Examples**: Provide concrete examples of desired output
3. **Test Iteratively**: Make small changes and test with sample recordings
4. **Document Changes**: Keep track of what modifications work best for your use case

## Fallback Behavior

If the markdown file cannot be read (missing file, permissions, etc.), the system will use a built-in fallback prompt to ensure the application continues working.

## Testing Your Changes

Use the test script to verify your prompt changes:

```bash
node scripts/test-prompt.js
```

This will show you exactly how the system reads and processes your markdown prompt. 