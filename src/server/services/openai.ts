import OpenAI from "openai";
import { env } from "~/env";
import { OPENAI_CONFIG } from "~/server/config/prompts";
import { deductCredits, calculateCreditsFromTokens } from "~/server/services/credits";

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
});

export interface DailyEvent {
    name: string;
    keywords: string[];
    description: string;
    date: string;
}

/**
 * Fetches daily UK events from OpenAI API
 * @param userId - Optional user ID for credit tracking
 * @returns Array of event objects with name, keywords, and description
 */
export async function fetchDailyUKEvents(userId?: number): Promise<DailyEvent[]> {
    const today = new Date();
    const dateString = today.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
    });

    const config = OPENAI_CONFIG.dailyEvents;

    try {
        const completion = await openai.chat.completions.create({
            model: config.model,
            messages: [
                {
                    role: "system",
                    content: config.systemMessage,
                },
                {
                    role: "user",
                    content: config.userPrompt(dateString),
                },
            ],
            temperature: config.temperature,
            max_tokens: config.maxTokens,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
            throw new Error("No response from OpenAI");
        }

        console.log(`[OpenAI Service] Raw response:`, content);

        // Parse the JSON response
        const events = JSON.parse(content.trim()) as DailyEvent[];

        // Validate that we got an array of objects
        if (!Array.isArray(events)) {
            throw new Error("OpenAI response is not an array");
        }

        // Filter and validate event objects, limit to 4 events
        const validEvents = events
            .filter((event) => {
                return (
                    typeof event === "object" &&
                    event !== null &&
                    typeof event.name === "string" &&
                    event.name.length > 0 &&
                    Array.isArray(event.keywords) &&
                    event.keywords.length > 0 &&
                    typeof event.description === "string" &&
                    event.description.length > 0
                );
            })
            .slice(0, 4);

        console.log(`[OpenAI Service] Fetched ${validEvents.length} events for ${dateString}:`, validEvents);

        // Track credit usage if userId is provided
        if (userId) {
            const tokensUsed = (completion.usage?.total_tokens) || 0;
            const creditsDeducted = calculateCreditsFromTokens(tokensUsed);

            await deductCredits(
                userId,
                "daily_events",
                tokensUsed,
                creditsDeducted,
                {
                    model: config.model,
                    promptTokens: completion.usage?.prompt_tokens,
                    completionTokens: completion.usage?.completion_tokens,
                    eventCount: validEvents.length,
                    date: dateString,
                }
            );

            console.log(`[OpenAI Service] Deducted ${creditsDeducted} credits from user ${userId}`);
        }

        return validEvents;
    } catch (error) {
        console.error("[OpenAI Service] Error fetching events:", error);
        throw new Error(
            `Failed to fetch events from OpenAI: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
    }
}

export interface GeneratedContent {
    title: string;
    content: string;
}

/**
 * Generates blog post content about an event and related books using OpenAI
 * @param eventName - Name of the event
 * @param eventDescription - Description of the event
 * @param eventKeywords - Array of keywords related to the event
 * @param relatedBooks - Array of related books with title, author, and description
 * @param userId - Optional user ID for credit tracking
 * @param eventId - Optional event ID for metadata
 * @returns Array of 4 generated content pieces with title and content
 */
export async function generateEventContent(
    eventName: string,
    eventDescription: string | null,
    eventKeywords: string | null,
    relatedBooks: Array<{ title: string; author: string; description: string | null }>,
    userId?: number,
    eventId?: number
): Promise<GeneratedContent[]> {
    const keywordsArray = eventKeywords ? eventKeywords.split(',').map(k => k.trim()) : [];

    const booksInfo = relatedBooks.length > 0
        ? relatedBooks.map(b => `- "${b.title}" by ${b.author}${b.description ? `: ${b.description}` : ''}`).join('\n')
        : 'No related books found.';

    const config = OPENAI_CONFIG.contentGeneration;

    try {
        const completion = await openai.chat.completions.create({
            model: config.model,
            messages: [
                {
                    role: "system",
                    content: config.systemMessage,
                },
                {
                    role: "user",
                    content: config.userPrompt(
                        eventName,
                        eventDescription || 'No description provided',
                        keywordsArray.join(', ') || 'None',
                        booksInfo
                    ),
                },
            ],
            temperature: config.temperature,
            max_tokens: config.maxTokens,
        });

        const responseContent = completion.choices[0]?.message?.content;
        if (!responseContent) {
            throw new Error("No response from OpenAI");
        }

        console.log(`[OpenAI Service] Raw content generation response:`, responseContent);

        // Parse the JSON response
        const generatedContent = JSON.parse(responseContent.trim()) as GeneratedContent[];

        // Validate that we got an array of objects
        if (!Array.isArray(generatedContent)) {
            throw new Error("OpenAI response is not an array");
        }

        // Filter and validate content objects, limit to 4 pieces
        const validContent = generatedContent
            .filter((item) => {
                return (
                    typeof item === "object" &&
                    item !== null &&
                    typeof item.title === "string" &&
                    item.title.length > 0 &&
                    typeof item.content === "string" &&
                    item.content.length > 0
                );
            })
            .slice(0, 4);

        console.log(`[OpenAI Service] Generated ${validContent.length} content pieces for event "${eventName}"`);

        // Track credit usage if userId is provided
        if (userId) {
            const tokensUsed = (completion.usage?.total_tokens) || 0;
            const creditsDeducted = calculateCreditsFromTokens(tokensUsed);

            await deductCredits(
                userId,
                "content_generation",
                tokensUsed,
                creditsDeducted,
                {
                    model: config.model,
                    promptTokens: completion.usage?.prompt_tokens,
                    completionTokens: completion.usage?.completion_tokens,
                    eventId,
                    eventName,
                    contentCount: validContent.length,
                }
            );

            console.log(`[OpenAI Service] Deducted ${creditsDeducted} credits from user ${userId}`);
        }

        return validContent;
    } catch (error) {
        console.error("[OpenAI Service] Error generating content:", error);
        throw new Error(
            `Failed to generate content from OpenAI: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
    }
}
