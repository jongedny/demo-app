import { z } from "zod";
import { eq } from "drizzle-orm";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { events } from "~/server/db/schema";

export const eventRouter = createTRPCRouter({
    create: publicProcedure
        .input(z.object({ name: z.string().min(1, "Event name is required") }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db.insert(events).values({
                name: input.name,
            });
        }),

    createBulk: publicProcedure
        .input(z.object({ names: z.array(z.string().min(1)) }))
        .mutation(async ({ ctx, input }) => {
            if (input.names.length === 0) {
                return { count: 0 };
            }

            const values = input.names.map((name) => ({ name }));
            await ctx.db.insert(events).values(values);

            return { count: input.names.length };
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
        }))
        .mutation(async ({ ctx, input }) => {
            const updated = await ctx.db
                .update(events)
                .set({ name: input.name })
                .where(eq(events.id, input.id))
                .returning();

            return updated[0];
        }),
});
