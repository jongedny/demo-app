/**
 * Book Import Service
 * Handles importing books from ONIX XML files
 */

import { db } from '../db';
import { books, importLogs, importErrors } from '../db/schema';
import { parseOnixFile, detectOnixSource, type ParsedBook } from './onixParser';
import { eq } from 'drizzle-orm';
import { readdir, rename } from 'fs/promises';
import { join } from 'path';

const IMPORTS_DIR = join(process.cwd(), 'imports');
const INCOMING_DIR = join(IMPORTS_DIR, 'incoming');
const PROCESSED_DIR = join(IMPORTS_DIR, 'processed');
const FAILED_DIR = join(IMPORTS_DIR, 'failed');

export interface ImportResult {
    success: boolean;
    importLogId: number;
    totalBooks: number;
    importedBooks: number;
    skippedBooks: number;
    errorCount: number;
    errors?: string[];
}

/**
 * Check if a book already exists in the database and return it
 */
async function findExistingBook(isbn13?: string, isbn10?: string, recordReference?: string) {
    if (!isbn13 && !isbn10 && !recordReference) {
        return null;
    }

    try {
        const existingBooks = await db
            .select()
            .from(books)
            .where(
                isbn13 ? eq(books.isbn, isbn13) :
                    isbn10 ? eq(books.isbn, isbn10) :
                        eq(books.externalId, recordReference!)
            )
            .limit(1);

        return existingBooks.length > 0 ? existingBooks[0] : null;
    } catch (error) {
        console.error('Error checking book existence:', error);
        return null;
    }
}

/**
 * Import a single book to the database (insert new or update existing)
 */
async function importBook(book: ParsedBook, importLogId: number): Promise<{
    success: boolean;
    skipped: boolean;
    error?: string;
}> {
    try {
        // Check if book already exists
        const existingBook = await findExistingBook(book.isbn13, book.isbn10, book.recordReference);

        // Prepare book data
        const bookData = {
            title: book.title || 'Untitled',
            author: book.author || 'Unknown',
            description: book.description,
            isbn: book.isbn13 || book.isbn10,
            publicationDate: book.publicationDate,
            keywords: book.keywords ? JSON.stringify(book.keywords) : null,
            price: book.price,
            genre: book.genre,
            coverImageUrl: book.coverImageUrl,
            status: 'active',
            externalId: book.recordReference,
            createdBy: 'import',
            isSample: 'false',
        };

        if (existingBook) {
            // Update existing book
            await db.update(books)
                .set({
                    ...bookData,
                    updatedAt: new Date(),
                })
                .where(eq(books.id, existingBook.id));

            return { success: true, skipped: false };
        } else {
            // Insert new book
            await db.insert(books).values(bookData);

            return { success: true, skipped: false };
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Log error to import_errors table
        await db.insert(importErrors).values({
            importLogId,
            bookIdentifier: book.isbn13 || book.isbn10 || book.recordReference,
            errorType: 'database_error',
            errorMessage,
            errorDetails: JSON.stringify({
                book: book.title,
                author: book.author,
                stack: error instanceof Error ? error.stack : undefined,
            }),
        });

        return { success: false, skipped: false, error: errorMessage };
    }
}

/**
 * Import books from a single ONIX XML file
 */
export async function importOnixFile(filepath: string, filename: string): Promise<ImportResult> {
    // Create import log entry
    const [importLog] = await db.insert(importLogs).values({
        filename,
        filepath,
        status: 'processing',
        importSource: detectOnixSource(filename),
        startedAt: new Date(),
    }).returning();

    if (!importLog) {
        throw new Error('Failed to create import log');
    }

    const importLogId = importLog.id;
    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
        // Parse the ONIX file
        const { books: parsedBooks, error: parseError } = await parseOnixFile(filepath);

        if (parseError) {
            // Log parse error
            await db.insert(importErrors).values({
                importLogId,
                errorType: 'parse_error',
                errorMessage: parseError,
                errorDetails: JSON.stringify({ filepath, filename }),
            });

            // Update import log
            await db.update(importLogs)
                .set({
                    status: 'failed',
                    errorCount: 1,
                    completedAt: new Date(),
                })
                .where(eq(importLogs.id, importLogId));

            return {
                success: false,
                importLogId,
                totalBooks: 0,
                importedBooks: 0,
                skippedBooks: 0,
                errorCount: 1,
                errors: [parseError],
            };
        }

        // Import each book
        for (const book of parsedBooks) {
            const result = await importBook(book, importLogId);

            if (result.success) {
                if (result.skipped) {
                    skippedCount++;
                } else {
                    importedCount++;
                }
            } else {
                errorCount++;
                if (result.error) {
                    errors.push(result.error);
                }
            }
        }

        // Update import log with final status
        const status = errorCount === parsedBooks.length ? 'failed' : 'completed';

        await db.update(importLogs)
            .set({
                status,
                totalBooks: parsedBooks.length,
                importedBooks: importedCount,
                skippedBooks: skippedCount,
                errorCount,
                completedAt: new Date(),
            })
            .where(eq(importLogs.id, importLogId));

        // Move file to appropriate directory
        const targetDir = status === 'failed' ? FAILED_DIR : PROCESSED_DIR;
        const targetPath = join(targetDir, filename);
        await rename(filepath, targetPath);

        return {
            success: status === 'completed',
            importLogId,
            totalBooks: parsedBooks.length,
            importedBooks: importedCount,
            skippedBooks: skippedCount,
            errorCount,
            errors: errors.length > 0 ? errors : undefined,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Log unexpected error
        await db.insert(importErrors).values({
            importLogId,
            errorType: 'system_error',
            errorMessage,
            errorDetails: JSON.stringify({
                filepath,
                filename,
                stack: error instanceof Error ? error.stack : undefined,
            }),
        });

        // Update import log
        await db.update(importLogs)
            .set({
                status: 'failed',
                errorCount: errorCount + 1,
                completedAt: new Date(),
            })
            .where(eq(importLogs.id, importLogId));

        // Move file to failed directory
        try {
            const targetPath = join(FAILED_DIR, filename);
            await rename(filepath, targetPath);
        } catch (moveError) {
            console.error('Failed to move file to failed directory:', moveError);
        }

        return {
            success: false,
            importLogId,
            totalBooks: 0,
            importedBooks: importedCount,
            skippedBooks: skippedCount,
            errorCount: errorCount + 1,
            errors: [...errors, errorMessage],
        };
    }
}

/**
 * Process all XML files in the incoming directory
 */
export async function processIncomingFiles(): Promise<ImportResult[]> {
    try {
        const files = await readdir(INCOMING_DIR);
        const xmlFiles = files.filter(file => file.toLowerCase().endsWith('.xml'));

        const results: ImportResult[] = [];

        for (const filename of xmlFiles) {
            const filepath = join(INCOMING_DIR, filename);
            console.log(`Processing file: ${filename}`);

            const result = await importOnixFile(filepath, filename);
            results.push(result);

            console.log(`Completed ${filename}: ${result.importedBooks} imported, ${result.skippedBooks} skipped, ${result.errorCount} errors`);
        }

        return results;
    } catch (error) {
        console.error('Error processing incoming files:', error);
        throw error;
    }
}

/**
 * Get import log details
 */
export async function getImportLog(importLogId: number) {
    const [log] = await db
        .select()
        .from(importLogs)
        .where(eq(importLogs.id, importLogId));

    if (!log) {
        return null;
    }

    const errors = await db
        .select()
        .from(importErrors)
        .where(eq(importErrors.importLogId, importLogId));

    return {
        ...log,
        errors,
    };
}

/**
 * Get all import logs
 */
export async function getAllImportLogs() {
    return await db
        .select()
        .from(importLogs)
        .orderBy(importLogs.createdAt);
}
