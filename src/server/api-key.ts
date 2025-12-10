import crypto from "crypto";

/**
 * Generate a secure random API key
 * Format: ar_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (36 chars total)
 */
export function generateApiKey(): string {
    const randomBytes = crypto.randomBytes(24);
    const key = randomBytes.toString("base64url").slice(0, 32);
    return `ar_live_${key}`;
}

/**
 * Hash an API key for secure storage
 */
export function hashApiKey(apiKey: string): string {
    return crypto.createHash("sha256").update(apiKey).digest("hex");
}

/**
 * Verify an API key against a hash
 */
export function verifyApiKey(apiKey: string, hash: string): boolean {
    const inputHash = hashApiKey(apiKey);
    return crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(hash));
}
