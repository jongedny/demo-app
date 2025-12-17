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

    systemMessage: "You are a helpful assistant that provides information about UK events and celebrations suitable for children under 16. Always respond with valid JSON arrays only.",

    /**
     * Main prompt for generating daily events
     * Available variables: {dateString} - formatted as "25 December"
     */
    userPrompt: (dateString: string) => `Suggest up to 4 diverse and interesting events for ${dateString} that would appeal to children under the age of 16 in the United Kingdom.

IMPORTANT: Provide a VARIETY of different types of events. Do not repeat the same event type or theme across multiple suggestions.

Event types to consider (choose DIFFERENT types for variety):
- Historic events and anniversaries ("On this day in history...")
- Famous birthdays (people born on this date)
- Famous deaths/commemorations (significant people who died on this date)
- Religious festivals and observances
- National awareness days (e.g., National Dog Day)
- Major holidays and celebrations
- Seasonal events and traditions
- International days observed in the UK
- Scientific discoveries or achievements made on this date
- Cultural or sporting milestones

Guidelines:
- Each event should be AGE-APPROPRIATE for children under 16
- Make events EDUCATIONAL and ENGAGING for young people
- Ensure VARIETY - don't suggest similar events (e.g., avoid multiple "preparation" or "countdown" events)
- Prioritize events that are interesting, educational, or fun for children
- If it's close to a major holiday, include ONE event about it, but also include other diverse events
- Focus on events that happened or are celebrated specifically on ${dateString}

For each event, provide:
1. name: The event name (clear and engaging for children)
2. keywords: An array of 3-5 relevant keywords related to the event
3. description: A brief, child-friendly description of the event (maximum 200 words)
4. date: The date in ISO format (YYYY-MM-DD)

Please respond with ONLY a JSON array of objects in this exact format:
[
  {
    "name": "Event Name 1",
    "keywords": ["keyword1", "keyword2", "keyword3"],
    "description": "A brief description of the event...",
    "date": "2025-12-17"
  }
]

Do not include any other text or explanation. Always provide at least 2-4 diverse events.`,
  },

  /**
   * Configuration for blog content generation about events and books
   */
  contentGeneration: {
    model: "gpt-4o-mini",
    temperature: 0.8,
    maxTokens: 2000,

    systemMessage: "You are a creative content writer specializing in book recommendations for children under 16. Always respond with valid JSON arrays only.",

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
    ) => `Write 4 short blog post pieces (200-300 words each) about the event "${eventName}" and related books suitable for children under 16.

Event Details:
- Name: ${eventName}
- Description: ${eventDescription}
- Keywords: ${keywords}

Available Books (you don't need to mention all of them):
${booksInfo}

IMPORTANT GUIDELINES:
1. Each blog post should focus on DIFFERENT books from the list above
2. You do NOT need to mention every book - select the most relevant ones for each piece
3. Each piece can focus on 1-3 books that best fit its specific angle or theme
4. Make the content ENGAGING and AGE-APPROPRIATE for children under 16
5. Make the content EDUCATIONAL and encourage reading
6. Each piece should have a unique angle or perspective on the event

Each blog post should:
1. Be 200-300 words in length
2. Have a catchy, child-friendly title
3. Connect the event theme to specific books (not all books)
4. Be suitable for a book recommendation website for young readers
5. Focus on different books than the other blog posts

Please respond with ONLY a JSON array of objects in this exact format:
[
  {
    "title": "Blog Post Title 1",
    "content": "The blog post content here..."
  }
]

Do not include any other text or explanation. Always provide exactly 4 blog posts.`,
  },

  /**
   * Configuration for reviewing book-event relevance
   */
  bookReview: {
    model: "gpt-4o-mini",
    temperature: 0.3, // Lower temperature for more consistent scoring
    maxTokens: 2000,

    systemMessage: "You are a critical book reviewer and literary expert. You provide honest, constructive assessments of book recommendations. Always respond with valid JSON arrays only.",

    /**
     * Main prompt for reviewing book recommendations
     * Available variables:
     * - {eventName}: Name of the event
     * - {booksInfo}: Formatted list of books with descriptions
     */
    userPrompt: (
      eventName: string,
      booksInfo: string
    ) => `Judge whether each of these books is a good reading recommendation for ${eventName}.

For each book, provide:
1. score: A score out of 10 (10 being the best recommendation, 0 being the worst)
2. explanation: A short explanation (max 100 words) of your decision

Be critical but constructive in your scoring and critique. Consider:
- How well the book's themes align with the event
- Whether the book would genuinely interest someone celebrating/observing this event
- The relevance of the book's content to the event's purpose or meaning

Books to review:
${booksInfo}

Please respond with ONLY a JSON array of objects in this exact format:
[
  {
    "bookTitle": "Exact title of the book",
    "score": 8,
    "explanation": "Your explanation here..."
  }
]

Do not include any other text or explanation. Provide one review object for each book listed above.`,
  },
} as const;
