import { z } from "zod";
import { eq, inArray, like, ilike, or, and, sql } from "drizzle-orm";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { books, eventBooks, events, bookContributors, contributors, publishers } from "~/server/db/schema";

export const bookRouter = createTRPCRouter({
    create: publicProcedure
        .input(
            z.object({
                title: z.string().min(1, "Title is required"),
                contributorIds: z.string().optional(),
                description: z.string().optional(),
                isbn: z.string().optional(),
                publicationDate: z.string().optional(),
                keywords: z.string().optional(),
                price: z.string().optional(),
                genre: z.string().optional(),
                coverImageUrl: z.string().optional(),
                status: z.string().optional(),
                externalId: z.string().optional(),
                createdBy: z.string().optional(),
                isSample: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            await ctx.db.insert(books).values(input);
        }),

    createBulk: publicProcedure
        .input(
            z.object({
                books: z.array(
                    z.object({
                        title: z.string(),
                        contributorIds: z.string().optional(),
                        description: z.string().optional(),
                        isbn: z.string().optional(),
                        publicationDate: z.string().optional(),
                        keywords: z.string().optional(),
                        price: z.string().optional(),
                        genre: z.string().optional(),
                        coverImageUrl: z.string().optional(),
                        status: z.string().optional(),
                        externalId: z.string().optional(),
                        createdBy: z.string().optional(),
                        isSample: z.string().optional(),
                    })
                ),
            })
        )
        .mutation(async ({ ctx, input }) => {
            if (input.books.length === 0) {
                return { count: 0 };
            }

            await ctx.db.insert(books).values(input.books);
            return { count: input.books.length };
        }),

    getAll: publicProcedure
        .input(
            z
                .object({
                    limit: z.number().min(1).max(100).optional(),
                    offset: z.number().min(0).optional(),
                })
                .optional()
        )
        .query(async ({ ctx, input }) => {
            const limit = input?.limit ?? 50;
            const offset = input?.offset ?? 0;

            const allBooks = await ctx.db.query.books.findMany({
                orderBy: (books, { desc }) => [desc(books.createdAt)],
                limit,
                offset,
            });

            // Fetch contributors for all books
            const booksWithContributors = await Promise.all(
                allBooks.map(async (book) => {
                    const bookContributorRelations = await ctx.db.query.bookContributors.findMany({
                        where: (bookContributors, { eq }) => eq(bookContributors.bookId, book.id),
                        orderBy: (bookContributors, { asc }) => [asc(bookContributors.sequenceNumber)],
                    });

                    const bookContributorsData = [];
                    if (bookContributorRelations.length > 0) {
                        const contributorIds = bookContributorRelations.map(r => r.contributorId);
                        const contributorsList = await ctx.db.query.contributors.findMany({
                            where: (contributors, { inArray }) => inArray(contributors.id, contributorIds),
                        });

                        bookContributorsData.push(...contributorsList.map(contributor => {
                            const relation = bookContributorRelations.find(r => r.contributorId === contributor.id);
                            return {
                                ...contributor,
                                role: relation?.role,
                                sequenceNumber: relation?.sequenceNumber,
                            };
                        }));
                    }

                    return {
                        ...book,
                        contributors: bookContributorsData,
                    };
                })
            );

            return booksWithContributors;
        }),

    search: publicProcedure
        .input(
            z.object({
                isbn: z.string().optional(),
                title: z.string().optional(),
                contributor: z.string().optional(),
                limit: z.number().min(1).max(100).optional(),
                offset: z.number().min(0).optional(),
            })
        )
        .query(async ({ ctx, input }) => {
            const limit = input.limit ?? 50;
            const offset = input.offset ?? 0;

            // Build the where conditions
            const conditions = [];

            if (input.isbn) {
                conditions.push(eq(books.isbn, input.isbn));
            }

            if (input.title) {
                conditions.push(ilike(books.title, `%${input.title}%`));
            }

            let booksList;

            // If searching by contributor, we need to join with the contributors table
            if (input.contributor) {
                // First, find all contributor IDs that match the search term
                const matchingContributors = await ctx.db.query.contributors.findMany({
                    where: ilike(contributors.name, `%${input.contributor}%`),
                });

                const contributorIds = matchingContributors.map(c => c.id);

                if (contributorIds.length === 0) {
                    // No matching contributors found
                    return [];
                }

                // Find all book IDs that have these contributors
                const bookContributorRelations = await ctx.db.query.bookContributors.findMany({
                    where: inArray(bookContributors.contributorId, contributorIds),
                });

                const bookIds = [...new Set(bookContributorRelations.map(bc => bc.bookId))];

                if (bookIds.length === 0) {
                    return [];
                }

                // Now get the books, applying other filters if present
                let whereCondition;
                if (conditions.length > 0) {
                    whereCondition = and(inArray(books.id, bookIds), ...conditions);
                } else {
                    whereCondition = inArray(books.id, bookIds);
                }

                booksList = await ctx.db.query.books.findMany({
                    where: whereCondition,
                    orderBy: (books, { desc }) => [desc(books.createdAt)],
                    limit,
                    offset,
                });
            } else {
                // No contributor search, just apply other filters
                if (conditions.length > 0) {
                    booksList = await ctx.db.query.books.findMany({
                        where: and(...conditions),
                        orderBy: (books, { desc }) => [desc(books.createdAt)],
                        limit,
                        offset,
                    });
                } else {
                    booksList = await ctx.db.query.books.findMany({
                        orderBy: (books, { desc }) => [desc(books.createdAt)],
                        limit,
                        offset,
                    });
                }
            }

            // Fetch contributors for all books
            const booksWithContributors = await Promise.all(
                booksList.map(async (book) => {
                    const bookContributorRelations = await ctx.db.query.bookContributors.findMany({
                        where: (bookContributors, { eq }) => eq(bookContributors.bookId, book.id),
                        orderBy: (bookContributors, { asc }) => [asc(bookContributors.sequenceNumber)],
                    });

                    const bookContributorsData = [];
                    if (bookContributorRelations.length > 0) {
                        const contributorIds = bookContributorRelations.map(r => r.contributorId);
                        const contributorsList = await ctx.db.query.contributors.findMany({
                            where: (contributors, { inArray }) => inArray(contributors.id, contributorIds),
                        });

                        bookContributorsData.push(...contributorsList.map(contributor => {
                            const relation = bookContributorRelations.find(r => r.contributorId === contributor.id);
                            return {
                                ...contributor,
                                role: relation?.role,
                                sequenceNumber: relation?.sequenceNumber,
                            };
                        }));
                    }

                    return {
                        ...book,
                        contributors: bookContributorsData,
                    };
                })
            );

            return booksWithContributors;
        }),

    getById: publicProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ ctx, input }) => {
            const book = await ctx.db.query.books.findFirst({
                where: (books, { eq }) => eq(books.id, input.id),
            });

            if (!book) {
                return null;
            }

            // Get contributors for this book
            const bookContributorRelations = await ctx.db.query.bookContributors.findMany({
                where: (bookContributors, { eq }) => eq(bookContributors.bookId, input.id),
                orderBy: (bookContributors, { asc }) => [asc(bookContributors.sequenceNumber)],
            });

            const bookContributorsData = [];
            if (bookContributorRelations.length > 0) {
                const contributorIds = bookContributorRelations.map(r => r.contributorId);
                const contributorsList = await ctx.db.query.contributors.findMany({
                    where: (contributors, { inArray }) => inArray(contributors.id, contributorIds),
                });

                bookContributorsData.push(...contributorsList.map(contributor => {
                    const relation = bookContributorRelations.find(r => r.contributorId === contributor.id);
                    return {
                        ...contributor,
                        role: relation?.role,
                        sequenceNumber: relation?.sequenceNumber,
                    };
                }));
            }

            return {
                ...book,
                contributors: bookContributorsData,
            };
        }),

    getWithEvents: publicProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ ctx, input }) => {
            const book = await ctx.db.query.books.findFirst({
                where: (books, { eq }) => eq(books.id, input.id),
            });

            if (!book) {
                return null;
            }

            // Get contributors for this book
            const bookContributorRelations = await ctx.db.query.bookContributors.findMany({
                where: (bookContributors, { eq }) => eq(bookContributors.bookId, input.id),
                orderBy: (bookContributors, { asc }) => [asc(bookContributors.sequenceNumber)],
            });

            const bookContributorsData = [];
            if (bookContributorRelations.length > 0) {
                const contributorIds = bookContributorRelations.map(r => r.contributorId);
                const contributorsList = await ctx.db.query.contributors.findMany({
                    where: (contributors, { inArray }) => inArray(contributors.id, contributorIds),
                });

                bookContributorsData.push(...contributorsList.map(contributor => {
                    const relation = bookContributorRelations.find(r => r.contributorId === contributor.id);
                    return {
                        ...contributor,
                        role: relation?.role,
                        sequenceNumber: relation?.sequenceNumber,
                    };
                }));
            }

            // Get all event relationships for this book
            const relations = await ctx.db.query.eventBooks.findMany({
                where: (eventBooks, { eq }) => eq(eventBooks.bookId, input.id),
                orderBy: (eventBooks, { desc }) => [desc(eventBooks.createdAt)],
            });

            // Get the event details
            const relatedEvents = [];
            if (relations.length > 0) {
                const eventIds = relations.map(r => r.eventId);
                const eventsList = await ctx.db.query.events.findMany({
                    where: (events, { inArray }) => inArray(events.id, eventIds),
                });

                // Combine event data with AI scores
                relatedEvents.push(...eventsList.map(event => {
                    const relation = relations.find(r => r.eventId === event.id);
                    return {
                        ...event,
                        aiScore: relation?.aiScore,
                        aiExplanation: relation?.aiExplanation,
                        matchScore: relation?.matchScore,
                    };
                }));
            }

            return {
                ...book,
                contributors: bookContributorsData,
                relatedEvents,
            };
        }),

    getByIds: publicProcedure
        .input(z.object({ ids: z.array(z.number()) }))
        .query(async ({ ctx, input }) => {
            if (input.ids.length === 0) {
                return [];
            }

            const booksList = await ctx.db.query.books.findMany({
                where: inArray(books.id, input.ids),
            });

            return booksList;
        }),

    update: publicProcedure
        .input(
            z.object({
                id: z.number(),
                title: z.string().min(1, "Title is required").optional(),
                contributorIds: z.string().optional(),
                description: z.string().optional(),
                isbn: z.string().optional(),
                publicationDate: z.string().optional(),
                keywords: z.string().optional(),
                price: z.string().optional(),
                genre: z.string().optional(),
                coverImageUrl: z.string().optional(),
                status: z.string().optional(),
                externalId: z.string().optional(),
                createdBy: z.string().optional(),
                isSample: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { id, ...updateData } = input;

            const updated = await ctx.db
                .update(books)
                .set({ ...updateData, updatedAt: new Date() })
                .where(eq(books.id, id))
                .returning();

            return updated[0];
        }),

    delete: publicProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db.delete(books).where(eq(books.id, input.id));
        }),
});

