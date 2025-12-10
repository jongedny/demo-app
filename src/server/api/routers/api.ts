import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { content, apiKeys } from "~/server/db/schema";
import { hashApiKey } from "~/server/api-key";

/**
 * Public API router for external access with API key authentication
 * This router provides endpoints for third-party websites to access content
 */
export const apiRouter = createTRPCRouter({
    /**
     * Get all content with pagination
     * Requires valid API key
     */
    getContent: publicProcedure
        .input(
            z.object({
                apiKey: z.string().min(1, "API key is required"),
                limit: z.number().min(1).max(100).optional().default(50),
                offset: z.number().min(0).optional().default(0),
            })
        )
        .query(async ({ ctx, input }) => {
            // Validate API key
            const hashedKey = hashApiKey(input.apiKey);
            const apiKeyRecord = await ctx.db.query.apiKeys.findFirst({
                where: eq(apiKeys.key, hashedKey),
            });

            if (!apiKeyRecord) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "Invalid API key",
                });
            }

            if (apiKeyRecord.status !== "active") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "API key has been revoked",
                });
            }

            // Update usage statistics
            await ctx.db
                .update(apiKeys)
                .set({
                    lastUsedAt: new Date(),
                    usageCount: apiKeyRecord.usageCount + 1,
                })
                .where(eq(apiKeys.id, apiKeyRecord.id));

            // Fetch content
            const allContent = await ctx.db.query.content.findMany({
                orderBy: (content, { desc }) => [desc(content.createdAt)],
                limit: input.limit,
                offset: input.offset,
            });

            return {
                success: true,
                data: allContent,
                pagination: {
                    limit: input.limit,
                    offset: input.offset,
                    count: allContent.length,
                },
            };
        }),
});
