import { eventRouter } from "~/server/api/routers/event";
import { bookRouter } from "~/server/api/routers/book";
import { contentRouter } from "~/server/api/routers/content";
import { authRouter } from "~/server/api/routers/auth";
import { adminRouter } from "~/server/api/routers/admin";
import { importRouter } from "~/server/api/routers/importRouter";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  event: eventRouter,
  book: bookRouter,
  content: contentRouter,
  auth: authRouter,
  admin: adminRouter,
  import: importRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
