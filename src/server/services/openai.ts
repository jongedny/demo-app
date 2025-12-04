import OpenAI from "openai";
import { env } from "~/env";

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
});

export interface DailyEvent {
    name: string;
    date: string;
}

/**
 * Fetches daily UK events from OpenAI API
 * @returns Array of event names for the current date
 */
export async function fetchDailyUKEvents(): Promise<string[]> {
    const today = new Date();
    const dateString = today.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
    });

    const prompt = `Suggest up to 4 events, celebrations, or awareness days that are observed or could be celebrated in the United Kingdom on ${dateString}. 

These can include:
- Major holidays (e.g., Christmas Day on 25th December)
- National awareness days (e.g., National Dog Day on 26th August)
- Historical commemorations
- Seasonal celebrations
- International days observed in the UK

If there are no major well-known events on this specific date, suggest relevant seasonal events, awareness days, or historical events that occurred on this date.

Please respond with ONLY a JSON array of event names, like this:
["Event Name 1", "Event Name 2", "Event Name 3", "Event Name 4"]

Do not include any other text or explanation. Always provide at least 1-2 events.`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content:
                        "You are a helpful assistant that provides information about UK events and celebrations. Always respond with valid JSON arrays only.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            temperature: 0.7,
            max_tokens: 200,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
            throw new Error("No response from OpenAI");
        }

        console.log(`[OpenAI Service] Raw response:`, content);

        // Parse the JSON response
        const events = JSON.parse(content.trim()) as string[];

        // Validate that we got an array of strings
        if (!Array.isArray(events)) {
            throw new Error("OpenAI response is not an array");
        }

        // Filter out any non-string values and limit to 4 events
        const validEvents = events
            .filter((event) => typeof event === "string" && event.length > 0)
            .slice(0, 4);

        console.log(`[OpenAI Service] Fetched ${validEvents.length} events for ${dateString}:`, validEvents);

        return validEvents;
    } catch (error) {
        console.error("[OpenAI Service] Error fetching events:", error);
        throw new Error(
            `Failed to fetch events from OpenAI: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
    }
}
