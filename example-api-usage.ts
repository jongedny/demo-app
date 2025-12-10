/**
 * Example usage of the Another Read API
 * This demonstrates how external applications can access content using an API key
 */

import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './src/server/api/root';

// Create a tRPC client
const client = createTRPCProxyClient<AppRouter>({
    links: [
        httpBatchLink({
            url: 'http://localhost:3000/api/trpc',
            // For production, use your deployed URL:
            // url: 'https://your-domain.vercel.app/api/trpc',
        }),
    ],
});

async function fetchContent() {
    try {
        // Replace with your actual API key
        const API_KEY = 'ar_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

        console.log('Fetching content from Another Read API...\n');

        // Fetch content with pagination
        const result = await client.api.getContent.query({
            apiKey: API_KEY,
            limit: 5,
            offset: 0,
        });

        if (result.success) {
            console.log(`✓ Successfully fetched ${result.data.length} content items\n`);

            // Display each content item
            result.data.forEach((item, index) => {
                console.log(`--- Content Item ${index + 1} ---`);
                console.log(`ID: ${item.id}`);
                console.log(`Title: ${item.title}`);
                console.log(`Event ID: ${item.eventId}`);
                console.log(`Content: ${item.content.substring(0, 100)}...`);
                console.log(`Created: ${item.createdAt}`);
                console.log('');
            });

            // Display pagination info
            console.log('Pagination Info:');
            console.log(`  Limit: ${result.pagination.limit}`);
            console.log(`  Offset: ${result.pagination.offset}`);
            console.log(`  Count: ${result.pagination.count}`);
        }
    } catch (error) {
        if (error instanceof Error) {
            console.error('Error fetching content:', error.message);

            // Handle specific error cases
            if (error.message.includes('Invalid API key')) {
                console.error('\n⚠️  Please check your API key and try again.');
            } else if (error.message.includes('revoked')) {
                console.error('\n⚠️  This API key has been revoked. Please create a new one.');
            }
        }
    }
}

// Alternative: Using fetch directly (without tRPC client)
async function fetchContentWithFetch() {
    try {
        const API_KEY = 'ar_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

        // Encode the input as a URL parameter
        const input = encodeURIComponent(JSON.stringify({
            apiKey: API_KEY,
            limit: 5,
            offset: 0,
        }));

        const response = await fetch(
            `http://localhost:3000/api/trpc/api.getContent?input=${input}`
        );

        const data = await response.json();
        console.log('Response:', data);
    } catch (error) {
        console.error('Error:', error);
    }
}

// Run the example
// Uncomment one of these to test:
// fetchContent();
// fetchContentWithFetch();

export { fetchContent, fetchContentWithFetch };
