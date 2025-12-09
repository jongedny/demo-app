import { z } from "zod";
import { eq } from "drizzle-orm";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { content } from "~/server/db/schema";

export const contentRouter = createTRPCRouter({
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

            const allContent = await ctx.db.query.content.findMany({
                orderBy: (content, { desc }) => [desc(content.createdAt)],
                limit,
                offset,
            });

            return allContent;
        }),

    getByEvent: publicProcedure
        .input(z.object({ eventId: z.number() }))
        .query(async ({ ctx, input }) => {
            const eventContent = await ctx.db.query.content.findMany({
                where: eq(content.eventId, input.eventId),
                orderBy: (content, { desc }) => [desc(content.createdAt)],
            });

            return eventContent;
        }),

    getById: publicProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ ctx, input }) => {
            const contentItem = await ctx.db.query.content.findFirst({
                where: eq(content.id, input.id),
            });

            return contentItem;
        }),
});
