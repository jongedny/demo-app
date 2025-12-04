import cron from "node-cron";
import { env } from "~/env";

/**
 * Initialize cron jobs for the application
 * This runs daily at 6:00 AM to fetch and save UK events
 */
export function initializeCronJobs() {
    // Only run cron jobs in development mode
    // In production (Vercel), use vercel.json cron configuration
    if (env.NODE_ENV !== "development") {
        console.log("[Cron] Skipping cron initialization in production (using Vercel Cron)");
        return;
    }

    console.log("[Cron] Initializing cron jobs...");

    // Schedule daily event fetch at 6:00 AM
    // Cron format: minute hour day month weekday
    // "0 6 * * *" = At 6:00 AM every day
    cron.schedule("0 6 * * *", async () => {
        console.log("[Cron] Running daily event fetch job...");

        try {
            const url = `http://localhost:3000/api/cron/daily-events${env.CRON_SECRET ? `?secret=${env.CRON_SECRET}` : ""}`;
            const response = await fetch(url);
            const data = await response.json();

            if (response.ok) {
                console.log("[Cron] Job completed successfully:", data);
            } else {
                console.error("[Cron] Job failed:", data);
            }
        } catch (error) {
            console.error("[Cron] Error running job:", error);
        }
    });

    console.log("[Cron] Daily event fetch scheduled for 6:00 AM");
}
