import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { content, apiKeys } from "~/server/db/schema";
import { hashApiKey } from "~/server/api-key";

/**
 * REST API endpoint for external content access
 * GET /api/content
 * 
 * Query Parameters:
 * - apiKey (required): Your API key
 * - limit (optional): Number of items to return (1-100, default: 50)
 * - offset (optional): Number of items to skip (default: 0)
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const apiKey = searchParams.get("apiKey");
        const limit = parseInt(searchParams.get("limit") ?? "50");
        const offset = parseInt(searchParams.get("offset") ?? "0");

        // Validate API key is provided
        if (!apiKey) {
            return NextResponse.json(
                {
                    success: false,
                    error: "API key is required",
                    message: "Please provide an API key in the 'apiKey' query parameter",
                },
                { status: 401 }
            );
        }

        // Validate limit
        if (limit < 1 || limit > 100) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid limit",
                    message: "Limit must be between 1 and 100",
                },
                { status: 400 }
            );
        }

        // Validate offset
        if (offset < 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid offset",
                    message: "Offset must be 0 or greater",
                },
                { status: 400 }
            );
        }

        // Validate API key
        const hashedKey = hashApiKey(apiKey);
        const apiKeyRecord = await db.query.apiKeys.findFirst({
            where: eq(apiKeys.key, hashedKey),
        });

        if (!apiKeyRecord) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid API key",
                    message: "The provided API key is not valid",
                },
                { status: 401 }
            );
        }

        if (apiKeyRecord.status !== "active") {
            return NextResponse.json(
                {
                    success: false,
                    error: "API key revoked",
                    message: "This API key has been revoked",
                },
                { status: 403 }
            );
        }

        // Update usage statistics
        await db
            .update(apiKeys)
            .set({
                lastUsedAt: new Date(),
                usageCount: apiKeyRecord.usageCount + 1,
            })
            .where(eq(apiKeys.id, apiKeyRecord.id));

        // Fetch content
        const allContent = await db.query.content.findMany({
            orderBy: (content, { desc }) => [desc(content.createdAt)],
            limit,
            offset,
        });

        return NextResponse.json(
            {
                success: true,
                data: allContent,
                pagination: {
                    limit,
                    offset,
                    count: allContent.length,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Internal server error",
                message: "An unexpected error occurred",
            },
            { status: 500 }
        );
    }
}
