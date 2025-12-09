#!/usr/bin/env tsx

/**
 * CLI tool to test book imports
 * Usage: npm run import:test
 */

import { processIncomingFiles, type ImportResult } from '../src/server/services/bookImport.js';

async function main() {
    console.log('🚀 Starting book import process...\n');

    try {
        const results = await processIncomingFiles();

        console.log('\n📊 Import Summary:');
        console.log('═'.repeat(50));
        console.log(`Total files processed: ${results.length}`);
        console.log(`Successful: ${results.filter((r: ImportResult) => r.success).length}`);
        console.log(`Failed: ${results.filter((r: ImportResult) => !r.success).length}`);
        console.log(`Total books imported: ${results.reduce((sum: number, r: ImportResult) => sum + r.importedBooks, 0)}`);
        console.log(`Total books skipped: ${results.reduce((sum: number, r: ImportResult) => sum + r.skippedBooks, 0)}`);
        console.log(`Total errors: ${results.reduce((sum: number, r: ImportResult) => sum + r.errorCount, 0)}`);
        console.log('═'.repeat(50));

        console.log('\n📝 Detailed Results:');
        results.forEach((result: ImportResult, index: number) => {
            console.log(`\n${index + 1}. Import Log ID: ${result.importLogId}`);
            console.log(`   Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
            console.log(`   Books: ${result.totalBooks} total, ${result.importedBooks} imported, ${result.skippedBooks} skipped`);
            if (result.errorCount > 0) {
                console.log(`   ⚠️  Errors: ${result.errorCount}`);
                if (result.errors && result.errors.length > 0) {
                    result.errors.forEach((error: string) => {
                        console.log(`      - ${error}`);
                    });
                }
            }
        });

        console.log('\n✨ Import process completed!\n');
        process.exit(0);
    } catch (error: unknown) {
        console.error('\n❌ Import process failed:');
        console.error(error);
        process.exit(1);
    }
}

main();
