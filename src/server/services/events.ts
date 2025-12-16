import { db } from "~/server/db";
import { books, eventBooks } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { reviewBookRecommendations } from "./openai";

/**
 * Helper function to find and store related books for an event
 * @param eventId - The ID of the event
 * @param keywords - Comma-separated keywords
 * @param description - Event description
 * @returns Number of books found
 */
export async function findRelatedBooksForEvent(
    eventId: number,
    keywords: string | null,
    description: string | null
): Promise<number> {
    // Parse event keywords
    const eventKeywords = keywords
        ? keywords.split(',').map(k => k.trim().toLowerCase())
        : [];

    if (eventKeywords.length === 0 && !description) {
        return 0;
    }

    // Find matching books
    const allBooks = await db.query.books.findMany();

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
            if (description) {
                const descWords = description.toLowerCase().split(/\s+/).filter(w => w.length > 3);
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
        await db.insert(eventBooks).values(
            matchedBooks.map(({ book, score }) => ({
                eventId: eventId,
                bookId: book.id,
                matchScore: score,
            }))
        );
    }

    return matchedBooks.length;
}

/**
 * Generates AI reviews for books related to an event
 * @param eventId - The ID of the event
 * @param eventName - Name of the event
 * @returns Number of AI reviews generated
 */
export async function generateAIReviewsForEvent(
    eventId: number,
    eventName: string
): Promise<number> {
    // Fetch the related books with their details
    const relatedBookRecords = await db.query.eventBooks.findMany({
        where: eq(eventBooks.eventId, eventId),
    });

    if (relatedBookRecords.length === 0) {
        return 0;
    }

    const bookIds = relatedBookRecords.map(r => r.bookId);
    const bookDetails = await db.query.books.findMany({
        where: (books, { inArray }) => inArray(books.id, bookIds),
    });

    // Get AI reviews for the books (max 20)
    const reviews = await reviewBookRecommendations(
        eventName,
        bookDetails.map(b => ({
            title: b.title,
            author: b.author,
            description: b.description,
        }))
    );

    // Update the eventBooks records with AI scores and explanations
    let reviewsGenerated = 0;
    for (const review of reviews) {
        const matchingBook = bookDetails.find(b => b.title === review.bookTitle);
        if (matchingBook) {
            const eventBookRecord = relatedBookRecords.find(r => r.bookId === matchingBook.id);
            if (eventBookRecord) {
                await db.update(eventBooks)
                    .set({
                        aiScore: review.score,
                        aiExplanation: review.explanation,
                    })
                    .where(eq(eventBooks.id, eventBookRecord.id));
                reviewsGenerated++;
            }
        }
    }

    return reviewsGenerated;
}

/**
 * Processes an event by finding related books and generating AI reviews
 * @param eventId - The ID of the event
 * @param eventName - Name of the event
 * @param keywords - Comma-separated keywords
 * @param description - Event description
 * @returns Object with counts of books found and reviews generated
 */
export async function processEventRelatedBooks(
    eventId: number,
    eventName: string,
    keywords: string | null,
    description: string | null
): Promise<{ booksFound: number; reviewsGenerated: number }> {
    // Find related books
    const booksFound = await findRelatedBooksForEvent(eventId, keywords, description);

    // Generate AI reviews if books were found
    let reviewsGenerated = 0;
    if (booksFound > 0) {
        reviewsGenerated = await generateAIReviewsForEvent(eventId, eventName);
    }

    return { booksFound, reviewsGenerated };
}
