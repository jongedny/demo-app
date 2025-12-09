import { ContentList } from "~/app/_components/content-list";
import { api, HydrateClient } from "~/trpc/server";

export const dynamic = "force-dynamic";

interface ContentPageProps {
    searchParams: Promise<{ eventId?: string }>;
}

export default async function ContentPage({ searchParams }: ContentPageProps) {
    const params = await searchParams;
    const eventId = params.eventId ? parseInt(params.eventId, 10) : undefined;

    // Prefetch the appropriate data
    if (eventId) {
        void api.content.getByEvent.prefetch({ eventId });
        void api.event.getAll.prefetch();
    } else {
        void api.content.getAll.prefetch();
    }

    return (
        <HydrateClient>
            <main className="min-h-screen bg-gray-950">
                <div className="mx-auto max-w-7xl px-8 py-12">
                    {/* Header */}
                    <div className="mb-12">
                        <h1 className="mb-2 text-4xl font-bold text-white">
                            Content
                        </h1>
                        <p className="text-gray-400">
                            AI-generated content pieces for events
                        </p>
                    </div>

                    {/* Content List */}
                    <div>
                        <ContentList eventId={eventId} />
                    </div>
                </div>
            </main>
        </HydrateClient>
    );
}
