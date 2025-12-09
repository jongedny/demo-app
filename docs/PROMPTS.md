# OpenAI Prompt Configuration

This document explains how to customize the OpenAI prompts used in the Another Read application.

## Overview

All OpenAI prompts are centralized in a single configuration file:
```
src/server/config/prompts.ts
```

This makes it easy to modify prompts without touching the service logic code.

## Available Prompts

### 1. Daily Events Prompt

**Purpose**: Generates up to 4 UK events/celebrations for the current date  
**Used by**: Daily cron job at 6 AM  
**Configuration location**: `OPENAI_CONFIG.dailyEvents`

**Customizable parameters**:
- `model`: The OpenAI model to use (default: "gpt-4o-mini")
- `temperature`: Creativity level 0-1 (default: 0.7)
- `maxTokens`: Maximum response length (default: 500)
- `systemMessage`: The AI's role/personality
- `userPrompt`: The main prompt template

**Example customization**:
```typescript
// In src/server/config/prompts.ts
dailyEvents: {
    temperature: 0.9, // Make it more creative
    maxTokens: 800,   // Allow longer responses
    
    userPrompt: (dateString: string) => `Your custom prompt here for ${dateString}...`,
}
```

### 2. Content Generation Prompt

**Purpose**: Generates 4 blog posts (200-300 words each) about an event and related books  
**Used by**: "Suggest content" button on Events page  
**Configuration location**: `OPENAI_CONFIG.contentGeneration`

**Customizable parameters**:
- `model`: The OpenAI model to use (default: "gpt-4o-mini")
- `temperature`: Creativity level 0-1 (default: 0.8)
- `maxTokens`: Maximum response length (default: 2000)
- `systemMessage`: The AI's role/personality
- `userPrompt`: The main prompt template with 4 variables:
  - `eventName`: Name of the event
  - `eventDescription`: Description of the event
  - `keywords`: Comma-separated keywords
  - `booksInfo`: Formatted list of related books

**Example customization**:
```typescript
// In src/server/config/prompts.ts
contentGeneration: {
    temperature: 0.9, // Make it more creative
    
    systemMessage: "You are an award-winning author and book critic...",
    
    userPrompt: (eventName, eventDescription, keywords, booksInfo) => 
        `Write 5 blog posts (300-400 words each) about ${eventName}...`,
}
```

## How to Modify Prompts

1. Open `src/server/config/prompts.ts`
2. Find the prompt you want to modify
3. Edit the relevant fields:
   - Change the `systemMessage` to adjust the AI's personality
   - Modify the `userPrompt` function to change what you're asking for
   - Adjust `temperature` for more/less creativity
   - Change `maxTokens` for longer/shorter responses
   - Switch `model` to use a different OpenAI model
4. Save the file
5. The changes will take effect immediately (no restart needed in development)

## Tips for Writing Good Prompts

1. **Be specific**: Clearly state what you want and in what format
2. **Provide examples**: Show the exact JSON structure you expect
3. **Set constraints**: Specify word counts, number of items, etc.
4. **Define the role**: The system message sets the AI's expertise
5. **Test iteratively**: Make small changes and test the results

## Model Options

You can use any OpenAI model:
- `gpt-4o-mini`: Fast and cost-effective (current default)
- `gpt-4o`: More capable, higher quality
- `gpt-4-turbo`: Balanced performance
- `gpt-3.5-turbo`: Fastest, most economical

## Temperature Guide

- `0.0-0.3`: Focused and deterministic (good for factual content)
- `0.4-0.7`: Balanced creativity (default for events)
- `0.8-1.0`: More creative and varied (default for blog content)

## Need Help?

If you modify a prompt and get unexpected results:
1. Check the console logs - they show the raw OpenAI responses
2. Ensure your JSON format instructions are clear
3. Try reducing the temperature for more consistent results
4. Increase `maxTokens` if responses are being cut off
