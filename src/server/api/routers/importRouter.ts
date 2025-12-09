/**
 * Import tRPC Router
 * Handles book import operations
 */

import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import {
    processIncomingFiles,
    getImportLog,
    getAllImportLogs,
} from '~/server/services/bookImport';

export const importRouter = createTRPCRouter({
    /**
     * Process all files in the incoming directory
     */
    processFiles: protectedProcedure
        .mutation(async () => {
            const results = await processIncomingFiles();

            const summary = {
                totalFiles: results.length,
                successfulFiles: results.filter(r => r.success).length,
                failedFiles: results.filter(r => !r.success).length,
                totalBooksImported: results.reduce((sum, r) => sum + r.importedBooks, 0),
                totalBooksSkipped: results.reduce((sum, r) => sum + r.skippedBooks, 0),
                totalErrors: results.reduce((sum, r) => sum + r.errorCount, 0),
                results,
            };

            return summary;
        }),

    /**
     * Get all import logs
     */
    getLogs: protectedProcedure
        .query(async () => {
            return await getAllImportLogs();
        }),

    /**
     * Get details of a specific import log
     */
    getLogDetails: protectedProcedure
        .input(z.object({
            importLogId: z.number(),
        }))
        .query(async ({ input }) => {
            return await getImportLog(input.importLogId);
        }),
});
