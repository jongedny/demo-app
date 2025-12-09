import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { users, passwordResetTokens } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import {
    hashPassword,
    verifyPassword,
    generateToken,
    generateResetToken,
    setAuthCookie,
    clearAuthCookie,
    type UserTier,
    type UserStatus,
} from "~/server/auth";
import { TRPCError } from "@trpc/server";

export const authRouter = createTRPCRouter({
    /**
     * Register a new user
     */
    register: publicProcedure
        .input(
            z.object({
                firstName: z.string().min(1, "First name is required"),
                lastName: z.string().min(1, "Last name is required"),
                email: z.string().email("Invalid email address"),
                password: z.string().min(8, "Password must be at least 8 characters"),
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

            // Create user with Pending status
            const [newUser] = await ctx.db
                .insert(users)
                .values({
                    firstName: input.firstName,
                    lastName: input.lastName,
                    email: input.email.toLowerCase(),
                    password: hashedPassword,
                    userTier: "User" as UserTier,
                    status: "Pending" as UserStatus,
                })
                .returning();

            return {
                success: true,
                message:
                    "Registration successful! Your account is pending approval. You will be able to login once an administrator activates your account.",
                userId: newUser!.id,
            };
        }),

    /**
     * Login a user
     */
    login: publicProcedure
        .input(
            z.object({
                email: z.string().email("Invalid email address"),
                password: z.string().min(1, "Password is required"),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            // Find user by email
            const user = await ctx.db.query.users.findFirst({
                where: eq(users.email, input.email.toLowerCase()),
            });

            if (!user) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "Invalid email or password",
                });
            }

            // Verify password
            const isValidPassword = await verifyPassword(input.password, user.password);

            if (!isValidPassword) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "Invalid email or password",
                });
            }

            // Check if user is active
            if (user.status !== "Active") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message:
                        user.status === "Pending"
                            ? "Your account is pending approval. Please wait for an administrator to activate your account."
                            : "Your account has been closed. Please contact an administrator.",
                });
            }

            // Generate JWT token
            const token = generateToken({
                userId: user.id,
                email: user.email,
                userTier: user.userTier as UserTier,
                status: user.status as UserStatus,
            });

            // Set auth cookie
            await setAuthCookie(token);

            return {
                success: true,
                user: {
                    id: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    userTier: user.userTier,
                    status: user.status,
                },
            };
        }),

    /**
     * Logout a user
     */
    logout: publicProcedure.mutation(async () => {
        await clearAuthCookie();
        return { success: true };
    }),

    /**
     * Get current user
     */
    getCurrentUser: publicProcedure.query(async ({ ctx }) => {
        if (!ctx.user) {
            return null;
        }

        // Fetch fresh user data from database
        const user = await ctx.db.query.users.findFirst({
            where: eq(users.id, ctx.user.userId),
        });

        if (!user) {
            return null;
        }

        return {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            userTier: user.userTier,
            status: user.status,
            creditQuota: user.creditQuota,
            creditsUsed: user.creditsUsed,
            creditsRemaining: user.creditQuota - user.creditsUsed,
        };
    }),

    /**
     * Request password reset
     */
    requestPasswordReset: publicProcedure
        .input(
            z.object({
                email: z.string().email("Invalid email address"),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            // Find user by email
            const user = await ctx.db.query.users.findFirst({
                where: eq(users.email, input.email.toLowerCase()),
            });

            // Don't reveal if user exists or not for security
            if (!user) {
                return {
                    success: true,
                    message:
                        "If an account with that email exists, a password reset link has been sent.",
                };
            }

            // Generate reset token
            const token = generateResetToken();
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

            // Delete any existing reset tokens for this user
            await ctx.db
                .delete(passwordResetTokens)
                .where(eq(passwordResetTokens.userId, user.id));

            // Create new reset token
            await ctx.db.insert(passwordResetTokens).values({
                userId: user.id,
                token,
                expiresAt,
            });

            // TODO: Send email with reset link
            // For now, we'll just return the token (in production, this should be emailed)
            console.log(`Password reset token for ${user.email}: ${token}`);

            return {
                success: true,
                message:
                    "If an account with that email exists, a password reset link has been sent.",
                // In development, return the token for testing
                ...(process.env.NODE_ENV === "development" && { token }),
            };
        }),

    /**
     * Reset password with token
     */
    resetPassword: publicProcedure
        .input(
            z.object({
                token: z.string().min(1, "Token is required"),
                newPassword: z.string().min(8, "Password must be at least 8 characters"),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            // Find valid reset token
            const resetToken = await ctx.db.query.passwordResetTokens.findFirst({
                where: eq(passwordResetTokens.token, input.token),
            });

            if (!resetToken) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Invalid or expired reset token",
                });
            }

            // Check if token is expired
            if (new Date() > resetToken.expiresAt) {
                // Delete expired token
                await ctx.db
                    .delete(passwordResetTokens)
                    .where(eq(passwordResetTokens.id, resetToken.id));

                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Reset token has expired",
                });
            }

            // Hash new password
            const hashedPassword = await hashPassword(input.newPassword);

            // Update user password
            await ctx.db
                .update(users)
                .set({
                    password: hashedPassword,
                    updatedAt: new Date(),
                })
                .where(eq(users.id, resetToken.userId));

            // Delete used reset token
            await ctx.db
                .delete(passwordResetTokens)
                .where(eq(passwordResetTokens.id, resetToken.id));

            return {
                success: true,
                message: "Password has been reset successfully. You can now login with your new password.",
            };
        }),
});
