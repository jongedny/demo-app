import { z } from "zod";
import { eq, or, like, sql } from "drizzle-orm";

import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { events, books, eventBooks, content } from "~/server/db/schema";
import { generateEventContent } from "~/server/services/openai";
import { processEventRelatedBooks } from "~/server/services/events";

export const eventRouter = createTRPCRouter({
    create: publicProcedure
        .input(z.object({
            name: z.string().min(1, "Event name is required"),
            keywords: z.string().optional(),
            description: z.string().optional(),
            eventDate: z.date().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            // Insert the event and get the created record
            const [createdEvent] = await ctx.db.insert(events).values({
                name: input.name,
                keywords: input.keywords,
                description: input.description,
                eventDate: input.eventDate,
            }).returning();

            // Automatically find related books and generate AI reviews
            if (createdEvent) {
                try {
                    const { booksFound, reviewsGenerated } = await processEventRelatedBooks(
                        createdEvent.id,
                        createdEvent.name,
                        createdEvent.keywords,
                        createdEvent.description
                    );
                    console.log(`[Event Create] Found ${booksFound} related books and generated ${reviewsGenerated} AI reviews for event "${createdEvent.name}"`);
                } catch (error) {
                    console.error(`[Event Create] Error processing related books for event ${createdEvent.id}:`, error);
                    // Don't fail the event creation if book processing fails
                }
            }

            return createdEvent;
        }),

    createBulk: publicProcedure
        .input(z.object({
            events: z.array(z.object({
                name: z.string().min(1),
                keywords: z.string().optional(),
                description: z.string().optional(),
                eventDate: z.date().optional(),
            }))
        }))
        .mutation(async ({ ctx, input }) => {
            if (input.events.length === 0) {
                return { count: 0 };
            }

            await ctx.db.insert(events).values(input.events);

            return { count: input.events.length };
        }),

    getAll: publicProcedure.query(async ({ ctx }) => {
        const allEvents = await ctx.db.query.events.findMany({
            orderBy: (events, { desc }) => [desc(events.createdAt)],
        });

        return allEvents;
    }),

    update: publicProcedure
        .input(z.object({
            id: z.number(),
            name: z.string().min(1, "Event name is required"),
            keywords: z.string().optional(),
            description: z.string().optional(),
            eventDate: z.date().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const updated = await ctx.db
                .update(events)
                .set({
                    name: input.name,
                    keywords: input.keywords,
                    description: input.description,
                    eventDate: input.eventDate,
                })
                .where(eq(events.id, input.id))
                .returning();

            return updated[0];
        }),

    findRelatedBooks: publicProcedure
        .input(z.object({ eventId: z.number() }))
        .mutation(async ({ ctx, input }) => {
            // Get the event
            const event = await ctx.db.query.events.findFirst({
                where: eq(events.id, input.eventId),
            });

            if (!event) {
                throw new Error("Event not found");
            }

            // Check if we already have related books
            const existingRelations = await ctx.db.query.eventBooks.findMany({
                where: eq(eventBooks.eventId, input.eventId),
            });

            if (existingRelations.length > 0) {
                // Return existing related books
                const relatedBookIds = existingRelations.map(r => r.bookId);
                const relatedBooks = await ctx.db.query.books.findMany({
                    where: (books, { inArray }) => inArray(books.id, relatedBookIds),
                });
                return { books: relatedBooks, count: relatedBooks.length, cached: true };
            }

            // Parse event keywords
            const eventKeywords = event.keywords
                ? event.keywords.split(',').map(k => k.trim().toLowerCase())
                : [];

            if (eventKeywords.length === 0 && !event.description) {
                return { books: [], count: 0, cached: false };
            }

            // Find matching books
            const allBooks = await ctx.db.query.books.findMany();

            const matchedBooks = allBooks
                .map(book => {
                    let score = 0;
                    const searchText = `${book.title} ${book.description || ''} ${book.keywords || ''}`.toLowerCase();

                    // Check each event keyword
                    eventKeywords.forEach(keyword => {
                        if (searchText.includes(keyword)) {
                            score += 10;
                        }
                    });

                    // Check event description words
                    if (event.description) {
                        const descWords = event.description.toLowerCase().split(/\s+/).filter(w => w.length > 3);
                        descWords.forEach(word => {
                            if (searchText.includes(word)) {
                                score += 2;
                            }
                        });
                    }

                    return { book, score };
                })
                .filter(({ score }) => score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, 10); // Limit to top 10 matches

            // Store the relationships
            if (matchedBooks.length > 0) {
                await ctx.db.insert(eventBooks).values(
                    matchedBooks.map(({ book, score }) => ({
                        eventId: input.eventId,
                        bookId: book.id,
                        matchScore: score,
                    }))
                );
            }

            return {
                books: matchedBooks.map(m => m.book),
                count: matchedBooks.length,
                cached: false
            };
        }),

    getRelatedBooks: publicProcedure
        .input(z.object({ eventId: z.number() }))
        .query(async ({ ctx, input }) => {
            const relations = await ctx.db.query.eventBooks.findMany({
                where: eq(eventBooks.eventId, input.eventId),
                orderBy: (eventBooks, { desc }) => [desc(eventBooks.matchScore)],
            });

            if (relations.length === 0) {
                return [];
            }

            const bookIds = relations.map(r => r.bookId);
            const relatedBooks = await ctx.db.query.books.findMany({
                where: (books, { inArray }) => inArray(books.id, bookIds),
            });

            return relatedBooks;
        }),

    getEventBooksWithScores: publicProcedure
        .input(z.object({ eventId: z.number() }))
        .query(async ({ ctx, input }) => {
            const relations = await ctx.db.query.eventBooks.findMany({
                where: eq(eventBooks.eventId, input.eventId),
                orderBy: (eventBooks, { desc }) => [desc(eventBooks.aiScore)],
            });

            return relations;
        }),

    suggestContent: protectedProcedure
        .input(z.object({ eventId: z.number() }))
        .mutation(async ({ ctx, input }) => {
            // Get the event
            const event = await ctx.db.query.events.findFirst({
                where: eq(events.id, input.eventId),
            });

            if (!event) {
                throw new Error("Event not found");
            }

            // Check if related books exist, if not find them first
            let relatedBooks = await ctx.db.query.eventBooks.findMany({
                where: eq(eventBooks.eventId, input.eventId),
            });

            if (relatedBooks.length === 0) {
                // Find related books first
                const findResult = await ctx.db.transaction(async (tx) => {
                    // This is a simplified version - in production you'd call the findRelatedBooks logic
                    const eventKeywords = event.keywords
                        ? event.keywords.split(',').map(k => k.trim().toLowerCase())
                        : [];

                    const allBooks = await tx.query.books.findMany();

                    const matchedBooks = allBooks
                        .map(book => {
                            let score = 0;
                            const searchText = `${book.title} ${book.description || ''} ${book.keywords || ''}`.toLowerCase();

                            eventKeywords.forEach(keyword => {
                                if (searchText.includes(keyword)) {
                                    score += 10;
                                }
                            });

                            if (event.description) {
                                const descWords = event.description.toLowerCase().split(/\s+/).filter(w => w.length > 3);
                                descWords.forEach(word => {
                                    if (searchText.includes(word)) {
                                        score += 2;
                                    }
                                });
                            }

                            return { book, score };
                        })
                        .filter(({ score }) => score > 0)
                        .sort((a, b) => b.score - a.score)
                        .slice(0, 10);

                    if (matchedBooks.length > 0) {
                        await tx.insert(eventBooks).values(
                            matchedBooks.map(({ book, score }) => ({
                                eventId: input.eventId,
                                bookId: book.id,
                                matchScore: score,
                            }))
                        );
                    }

                    return matchedBooks.map(m => m.book);
                });

                relatedBooks = await ctx.db.query.eventBooks.findMany({
                    where: eq(eventBooks.eventId, input.eventId),
                });
            }

            // Get full book details with AI scores
            const bookIds = relatedBooks.map(r => r.bookId);
            const bookDetails = bookIds.length > 0
                ? await ctx.db.query.books.findMany({
                    where: (books, { inArray }) => inArray(books.id, bookIds),
                })
                : [];

            // Filter to only include books with AI score >= 5
            const highQualityBooks = relatedBooks
                .filter(eb => eb.aiScore !== null && eb.aiScore >= 5)
                .map(eb => {
                    const book = bookDetails.find(b => b.id === eb.bookId);
                    return book;
                })
                .filter((book): book is NonNullable<typeof book> => book !== undefined);

            console.log(`[Suggest Content] Found ${highQualityBooks.length} high-quality books (AI score >= 5) out of ${relatedBooks.length} total related books`);

            // Generate content using OpenAI
            const generatedContent = await generateEventContent(
                event.name,
                event.description,
                event.keywords,
                highQualityBooks.map(b => ({
                    title: b.title,
                    author: b.author,
                    description: b.description,
                })),
                ctx.user.userId, // Pass userId for credit tracking
                input.eventId // Pass eventId for metadata
            );

            // Store the generated content
            const highQualityBookIds = highQualityBooks.map(b => b.id);
            const storedContent = await ctx.db.insert(content).values(
                generatedContent.map(gc => ({
                    eventId: input.eventId,
                    title: gc.title,
                    content: gc.content,
                    relatedBookIds: JSON.stringify(highQualityBookIds),
                }))
            ).returning();

            return {
                content: storedContent,
                count: storedContent.length
            };
        }),

    delete: publicProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
            // Delete in the correct order to respect foreign key constraints
            // First delete content related to this event
            await ctx.db.delete(content).where(eq(content.eventId, input.id));

            // Then delete event-book relationships
            await ctx.db.delete(eventBooks).where(eq(eventBooks.eventId, input.id));

            // Finally delete the event itself
            const deleted = await ctx.db
                .delete(events)
                .where(eq(events.id, input.id))
                .returning();

            return deleted[0];
        }),
});
