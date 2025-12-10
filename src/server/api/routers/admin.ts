import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "~/server/api/trpc";
import { users, apiKeys } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, type UserTier, type UserStatus } from "~/server/auth";
import { TRPCError } from "@trpc/server";
import { generateApiKey, hashApiKey } from "~/server/api-key";

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

    /**
     * Get all API keys (Admin only)
     */
    getAllApiKeys: adminProcedure.query(async ({ ctx }) => {
        const allKeys = await ctx.db.query.apiKeys.findMany({
            orderBy: (apiKeys, { desc }) => [desc(apiKeys.createdAt)],
        });

        // Don't return the actual key hash for security
        return allKeys.map((key) => ({
            id: key.id,
            name: key.name,
            userId: key.userId,
            status: key.status,
            lastUsedAt: key.lastUsedAt,
            usageCount: key.usageCount,
            createdAt: key.createdAt,
            updatedAt: key.updatedAt,
        }));
    }),

    /**
     * Create a new API key (Admin only)
     */
    createApiKey: adminProcedure
        .input(
            z.object({
                name: z.string().min(1, "Name is required"),
                userId: z.number().optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            // If userId is provided, verify the user exists
            if (input.userId) {
                const user = await ctx.db.query.users.findFirst({
                    where: eq(users.id, input.userId),
                });

                if (!user) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "User not found",
                    });
                }
            }

            // Generate new API key
            const plainKey = generateApiKey();
            const hashedKey = hashApiKey(plainKey);

            // Store hashed key in database
            const [newKey] = await ctx.db
                .insert(apiKeys)
                .values({
                    key: hashedKey,
                    name: input.name,
                    userId: input.userId,
                    status: "active",
                })
                .returning();

            return {
                success: true,
                message: "API key created successfully",
                // Return the plain key ONLY on creation - it won't be shown again
                apiKey: plainKey,
                keyInfo: {
                    id: newKey!.id,
                    name: newKey!.name,
                    userId: newKey!.userId,
                    status: newKey!.status,
                    createdAt: newKey!.createdAt,
                },
            };
        }),

    /**
     * Revoke an API key (Admin only)
     */
    revokeApiKey: adminProcedure
        .input(
            z.object({
                keyId: z.number(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            // Check if key exists
            const existingKey = await ctx.db.query.apiKeys.findFirst({
                where: eq(apiKeys.id, input.keyId),
            });

            if (!existingKey) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "API key not found",
                });
            }

            // Update key status to revoked
            await ctx.db
                .update(apiKeys)
                .set({
                    status: "revoked",
                    updatedAt: new Date(),
                })
                .where(eq(apiKeys.id, input.keyId));

            return {
                success: true,
                message: "API key revoked successfully",
            };
        }),

    /**
     * Delete an API key (Admin only)
     */
    deleteApiKey: adminProcedure
        .input(
            z.object({
                keyId: z.number(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            // Check if key exists
            const existingKey = await ctx.db.query.apiKeys.findFirst({
                where: eq(apiKeys.id, input.keyId),
            });

            if (!existingKey) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "API key not found",
                });
            }

            // Delete key
            await ctx.db.delete(apiKeys).where(eq(apiKeys.id, input.keyId));

            return {
                success: true,
                message: "API key deleted successfully",
            };
        }),
});
