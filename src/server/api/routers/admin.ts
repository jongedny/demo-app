import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "~/server/api/trpc";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, type UserTier, type UserStatus } from "~/server/auth";
import { TRPCError } from "@trpc/server";

export const adminRouter = createTRPCRouter({
    /**
     * Get all users (Admin only)
     */
    getAllUsers: adminProcedure.query(async ({ ctx }) => {
        const allUsers = await ctx.db.query.users.findMany({
            orderBy: (users, { desc }) => [desc(users.createdAt)],
        });

        return allUsers.map((user) => ({
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            userTier: user.userTier,
            status: user.status,
            creditQuota: user.creditQuota,
            creditsUsed: user.creditsUsed,
            creditsRemaining: user.creditQuota - user.creditsUsed,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        }));
    }),

    /**
     * Add a new user (Admin only)
     */
    addUser: adminProcedure
        .input(
            z.object({
                firstName: z.string().min(1, "First name is required"),
                lastName: z.string().min(1, "Last name is required"),
                email: z.string().email("Invalid email address"),
                password: z.string().min(8, "Password must be at least 8 characters"),
                userTier: z.enum(["Admin", "Marketer", "User"]),
                status: z.enum(["Active", "Closed", "Pending"]),
                creditQuota: z.number().min(0, "Credit quota must be non-negative").optional().default(0),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            // Check if user already exists
            const existingUser = await ctx.db.query.users.findFirst({
                where: eq(users.email, input.email.toLowerCase()),
            });

            if (existingUser) {
                throw new TRPCError({
                    code: "CONFLICT",
                    message: "A user with this email already exists",
                });
            }

            // Hash password
            const hashedPassword = await hashPassword(input.password);

            // Create user
            const [newUser] = await ctx.db
                .insert(users)
                .values({
                    firstName: input.firstName,
                    lastName: input.lastName,
                    email: input.email.toLowerCase(),
                    password: hashedPassword,
                    userTier: input.userTier as UserTier,
                    status: input.status as UserStatus,
                    creditQuota: input.creditQuota,
                })
                .returning();

            return {
                success: true,
                message: "User created successfully",
                user: {
                    id: newUser!.id,
                    firstName: newUser!.firstName,
                    lastName: newUser!.lastName,
                    email: newUser!.email,
                    userTier: newUser!.userTier,
                    status: newUser!.status,
                },
            };
        }),

    /**
     * Update a user (Admin only)
     */
    updateUser: adminProcedure
        .input(
            z.object({
                userId: z.number(),
                firstName: z.string().min(1, "First name is required").optional(),
                lastName: z.string().min(1, "Last name is required").optional(),
                email: z.string().email("Invalid email address").optional(),
                password: z.string().min(8, "Password must be at least 8 characters").optional(),
                userTier: z.enum(["Admin", "Marketer", "User"]).optional(),
                status: z.enum(["Active", "Closed", "Pending"]).optional(),
                creditQuota: z.number().min(0, "Credit quota must be non-negative").optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { userId, password, email, ...updateData } = input;

            // Check if user exists
            const existingUser = await ctx.db.query.users.findFirst({
                where: eq(users.id, userId),
            });

            if (!existingUser) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "User not found",
                });
            }

            // If email is being changed, check if it's already in use
            if (email && email.toLowerCase() !== existingUser.email) {
                const emailInUse = await ctx.db.query.users.findFirst({
                    where: eq(users.email, email.toLowerCase()),
                });

                if (emailInUse) {
                    throw new TRPCError({
                        code: "CONFLICT",
                        message: "This email is already in use by another user",
                    });
                }
            }

            // Prepare update object
            const updates: Record<string, unknown> = {
                ...updateData,
                updatedAt: new Date(),
            };

            if (email) {
                updates.email = email.toLowerCase();
            }

            if (password) {
                updates.password = await hashPassword(password);
            }

            // Update user
            const [updatedUser] = await ctx.db
                .update(users)
                .set(updates)
                .where(eq(users.id, userId))
                .returning();

            return {
                success: true,
                message: "User updated successfully",
                user: {
                    id: updatedUser!.id,
                    firstName: updatedUser!.firstName,
                    lastName: updatedUser!.lastName,
                    email: updatedUser!.email,
                    userTier: updatedUser!.userTier,
                    status: updatedUser!.status,
                },
            };
        }),

    /**
     * Delete a user (Admin only)
     */
    deleteUser: adminProcedure
        .input(
            z.object({
                userId: z.number(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            // Check if user exists
            const existingUser = await ctx.db.query.users.findFirst({
                where: eq(users.id, input.userId),
            });

            if (!existingUser) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "User not found",
                });
            }

            // Prevent admin from deleting themselves
            if (existingUser.id === ctx.user.userId) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "You cannot delete your own account",
                });
            }

            // Delete user
            await ctx.db.delete(users).where(eq(users.id, input.userId));

            return {
                success: true,
                message: "User deleted successfully",
            };
        }),
});
