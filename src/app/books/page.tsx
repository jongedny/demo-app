import { BookList } from "~/app/_components/book-list";
import { api, HydrateClient } from "~/trpc/server";

export const dynamic = "force-dynamic";

export default async function BooksPage({
    searchParams,
}: {
    searchParams: Promise<{
        eventId?: string;
        isbn?: string;
        title?: string;
        contributor?: string;
    }>;
}) {
    const params = await searchParams;
    const eventId = params.eventId ? parseInt(params.eventId) : undefined;
    const searchFilters = {
        isbn: params.isbn,
        title: params.title,
        contributor: params.contributor,
    };

    void api.book.getAll.prefetch();

    return (
        <HydrateClient>
            <main className="min-h-screen bg-gray-950">
                <div className="mx-auto max-w-7xl px-8 py-12">
                    {/* Header */}
                    <div className="mb-12">
                        <h1 className="text-4xl font-bold text-white">
                            Books
                        </h1>
                    </div>

                    {/* Book List */}
                    <div>
                        <BookList
                            eventId={eventId}
                            showViewToggleAtTop={true}
                            searchFilters={searchFilters}
                        />
                    </div>
                </div>
            </main>
        </HydrateClient>
    );
}
