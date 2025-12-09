/**
 * OpenAI Prompt Configuration
 * 
 * This file contains all the prompts used for OpenAI API calls throughout the application.
 * You can easily modify these prompts to customize the AI's behavior.
 */

export const OPENAI_CONFIG = {
    /**
     * Model to use for all OpenAI API calls
     * Options: "gpt-4o-mini", "gpt-4o", "gpt-4-turbo", etc.
     */
    defaultModel: "gpt-4o-mini" as const,

    /**
     * Configuration for daily UK events generation
     */
    dailyEvents: {
        model: "gpt-4o-mini",
        temperature: 0.7,
        maxTokens: 500,

        systemMessage: "You are a helpful assistant that provides information about UK events and celebrations. Always respond with valid JSON arrays only.",

        /**
         * Main prompt for generating daily events
         * Available variables: {dateString} - formatted as "25 December"
         */
        userPrompt: (dateString: string) => `Suggest up to 4 events, celebrations, or awareness days that are observed or could be celebrated in the United Kingdom on ${dateString}. 

These can include:
- Major holidays (e.g., Christmas Day on 25th December)
- National awareness days (e.g., National Dog Day on 26th August)
- Historical commemorations
- Seasonal celebrations
- International days observed in the UK

If there are no major well-known events on this specific date, suggest relevant seasonal events, awareness days, or historical events that occurred on this date.

For each event, provide:
1. name: The event name
2. keywords: An array of 3-5 relevant keywords related to the event
3. description: A brief description of the event (maximum 200 words)

Please respond with ONLY a JSON array of objects in this exact format:
[
  {
    "name": "Event Name 1",
    "keywords": ["keyword1", "keyword2", "keyword3"],
    "description": "A brief description of the event..."
  }
]

Do not include any other text or explanation. Always provide at least 1-2 events.`,
    },

    /**
     * Configuration for blog content generation about events and books
     */
    contentGeneration: {
        model: "gpt-4o-mini",
        temperature: 0.8,
        maxTokens: 2000,

        systemMessage: "You are a creative content writer specializing in book recommendations and literary events. Always respond with valid JSON arrays only.",

        /**
         * Main prompt for generating blog content
         * Available variables:
         * - {eventName}: Name of the event
         * - {eventDescription}: Description of the event (or 'No description provided')
         * - {keywords}: Comma-separated keywords (or 'None')
         * - {booksInfo}: Formatted list of related books (or 'No related books found.')
         */
        userPrompt: (
            eventName: string,
            eventDescription: string,
            keywords: string,
            booksInfo: string
        ) => `Write 4 short blog post pieces (200-300 words each) about the event "${eventName}" and its related books.

Event Details:
- Name: ${eventName}
- Description: ${eventDescription}
- Keywords: ${keywords}

Related Books:
${booksInfo}

Each blog post should:
1. Be engaging and informative
2. Connect the event theme to the related books
3. Be 200-300 words in length
4. Have a catchy title
5. Be suitable for a book recommendation website

Please respond with ONLY a JSON array of objects in this exact format:
[
  {
    "title": "Blog Post Title 1",
    "content": "The blog post content here..."
  }
]

Do not include any other text or explanation. Always provide exactly 4 blog posts.`,
    },
} as const;
