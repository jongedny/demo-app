import { NextRequest, NextResponse } from "next/server";
import { fetchDailyUKEvents } from "~/server/services/openai";
import { processEventRelatedBooks } from "~/server/services/events";
import { db } from "~/server/db";
import { events } from "~/server/db/schema";
import { env } from "~/env";


/**
 * API Route for scheduled daily event fetching
 * This endpoint is called by the cron job to fetch and save UK events
 */
export async function GET(request: NextRequest) {
    try {
        // Verify authorization
        // Vercel Cron sends requests with an Authorization header
        // Manual calls can use the secret query parameter
        const authHeader = request.headers.get("authorization");
        const cronSecret = request.nextUrl.searchParams.get("secret");

        // Check if this is a Vercel Cron request (has Authorization header starting with "Bearer")
        const isVercelCron = authHeader?.startsWith("Bearer ");

        // For manual testing, verify the secret query parameter
        if (!isVercelCron && env.CRON_SECRET && cronSecret !== env.CRON_SECRET) {
            console.error("[Cron API] Unauthorized access attempt");
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        console.log("[Cron API] Starting daily event fetch...");

        // Fetch recent events from the last 7 days to avoid duplicates
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentEvents = await db.query.events.findMany({
            where: (events, { gte }) => gte(events.createdAt, sevenDaysAgo),
            columns: {
                name: true,
            },
        });

        const recentEventNames = recentEvents.map(e => e.name);
        console.log(`[Cron API] Found ${recentEventNames.length} recent events to avoid duplicating`);

        // Fetch events from OpenAI
        const dailyEvents = await fetchDailyUKEvents(undefined, recentEventNames);

        if (dailyEvents.length === 0) {
            console.log("[Cron API] No events returned from OpenAI");
            return NextResponse.json({
                success: true,
                message: "No events to save",
                count: 0,
            });
        }

        // Save events to database
        const values = dailyEvents.map((event) => ({
            name: event.name,
            keywords: event.keywords.join(", "), // Store as comma-separated string
            description: event.description,
            eventDate: new Date(event.date), // Parse the date string to a Date object
        }));
        const insertedEvents = await db.insert(events).values(values).returning();

        console.log(`[Cron API] Successfully saved ${dailyEvents.length} events: `, dailyEvents);

        // Automatically find related books for events happening today
        // Filter to only process events with today's date
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1); // Start of tomorrow

        const todaysEvents = insertedEvents.filter(event => {
            if (!event.eventDate) return false;
            const eventDate = new Date(event.eventDate);
            eventDate.setHours(0, 0, 0, 0);
            return eventDate >= today && eventDate < tomorrow;
        });

        console.log(`[Cron API] Found ${todaysEvents.length} events for today out of ${insertedEvents.length} total events`);

        let totalBooksFound = 0;
        let totalReviewsGenerated = 0;

        for (const event of todaysEvents) {
            try {
                const { booksFound, reviewsGenerated } = await processEventRelatedBooks(
                    event.id,
                    event.name,
                    event.keywords,
                    event.description
                );
                totalBooksFound += booksFound;
                totalReviewsGenerated += reviewsGenerated;
                console.log(`[Cron API] Found ${booksFound} related books and generated ${reviewsGenerated} AI reviews for event "${event.name}"`);
            } catch (error) {
                console.error(`[Cron API] Error processing books for event ${event.id}:`, error);
                // Continue with other events even if one fails
            }
        }

        return NextResponse.json({
            success: true,
            message: `Successfully saved ${dailyEvents.length} events(${todaysEvents.length} for today), found ${totalBooksFound} related books, and generated ${totalReviewsGenerated} AI reviews`,
            count: dailyEvents.length,
            todaysEventCount: todaysEvents.length,
            events: dailyEvents,
            relatedBooksFound: totalBooksFound,
            aiReviewsGenerated: totalReviewsGenerated,
        });
    } catch (error) {
        console.error("[Cron API] Error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
