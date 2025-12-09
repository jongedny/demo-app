import { db } from "~/server/db";
import { users, creditUsage } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Credit Service
 * Manages user credit quotas and tracks OpenAI API usage
 */

export interface CreditUsageMetadata {
    eventId?: number;
    eventName?: string;
    model?: string;
    promptTokens?: number;
    completionTokens?: number;
    [key: string]: unknown;
}

/**
 * Check if a user has sufficient credits
 */
export async function checkUserCredits(userId: number, creditsRequired: number): Promise<boolean> {
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
    });

    if (!user) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
        });
    }

    const creditsRemaining = user.creditQuota - user.creditsUsed;
    return creditsRemaining >= creditsRequired;
}

/**
 * Get user's credit balance
 */
export async function getUserCreditBalance(userId: number): Promise<{
    quota: number;
    used: number;
    remaining: number;
}> {
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
    });

    if (!user) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
        });
    }

    return {
        quota: user.creditQuota,
        used: user.creditsUsed,
        remaining: user.creditQuota - user.creditsUsed,
    };
}

/**
 * Deduct credits from a user's quota and log the usage
 */
export async function deductCredits(
    userId: number,
    operation: string,
    tokensUsed: number,
    creditsDeducted: number,
    metadata?: CreditUsageMetadata
): Promise<void> {
    // Check if user has sufficient credits
    const hasCredits = await checkUserCredits(userId, creditsDeducted);

    if (!hasCredits) {
        const balance = await getUserCreditBalance(userId);
        throw new TRPCError({
            code: "FORBIDDEN",
            message: `Insufficient credits. You have ${balance.remaining} credits remaining, but this operation requires ${creditsDeducted} credits.`,
        });
    }

    // Deduct credits and log usage in a transaction
    await db.transaction(async (tx) => {
        // Get current user data
        const user = await tx.query.users.findFirst({
            where: eq(users.id, userId),
        });

        if (!user) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "User not found",
            });
        }

        // Update user's credits used
        await tx
            .update(users)
            .set({
                creditsUsed: user.creditsUsed + creditsDeducted,
                updatedAt: new Date(),
            })
            .where(eq(users.id, userId));

        // Log the credit usage
        await tx.insert(creditUsage).values({
            userId,
            operation,
            tokensUsed,
            creditsDeducted,
            metadata: metadata ? JSON.stringify(metadata) : null,
        });
    });
}

/**
 * Calculate credits based on tokens used
 * Using a simple formula: 1 credit = 1000 tokens
 * You can adjust this formula based on your pricing model
 */
export function calculateCreditsFromTokens(tokensUsed: number): number {
    return Math.ceil(tokensUsed / 1000);
}

/**
 * Update user's credit quota (Admin only)
 */
export async function updateUserCreditQuota(userId: number, newQuota: number): Promise<void> {
    await db
        .update(users)
        .set({
            creditQuota: newQuota,
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
}
