"use client";

import { api } from "~/trpc/react";
import { Icon } from "./icon";

interface ContentListProps {
    eventId?: number;
}

export function ContentList({ eventId }: ContentListProps) {
    const { data: contentItems, isLoading } = eventId
        ? api.content.getByEvent.useQuery({ eventId })
        : api.content.getAll.useQuery();

    const { data: event } = eventId
        ? api.event.getAll.useQuery(undefined, {
            select: (events) => events.find(e => e.id === eventId)
        })
        : { data: undefined };

    if (isLoading) {
        return (
            <div className="w-full">
                <div className="flex items-center justify-center rounded-lg border border-gray-800 bg-gray-900 p-12">
                    <div className="flex items-center gap-3">
                        <div className="h-6 w-6 animate-spin rounded-full border-4 border-gray-600 border-t-transparent"></div>
                        <p className="text-gray-400">Loading content...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!contentItems || contentItems.length === 0) {
        return (
            <div className="w-full">
                <div className="rounded-lg border border-gray-800 bg-gray-900 p-12 text-center">
                    <Icon name="article" className="text-6xl text-gray-600" />
                    <h3 className="mb-2 text-xl font-semibold text-gray-300">
                        No content yet
                    </h3>
                    <p className="text-gray-500">
                        {eventId
                            ? "Generate content for this event using the 'Suggest Content' button on the Events page."
                            : "Generate content for events to see them here!"}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-white">
                        {eventId && event ? `Content for ${event.name}` : 'All Content'}
                    </h2>
                    {eventId && event?.description && (
                        <p className="text-sm text-gray-400 mt-1">{event.description}</p>
                    )}
                </div>
                <span className="rounded-full bg-gray-800 px-3 py-1 text-sm text-gray-400">
                    {contentItems.length} {contentItems.length === 1 ? "piece" : "pieces"}
                </span>
            </div>
            <div className="space-y-4">
                {contentItems.map((item) => (
                    <div
                        key={item.id}
                        className="group rounded-lg border border-gray-800 bg-gray-900 p-6 transition-colors hover:border-gray-700"
                    >
                        <div className="mb-3 flex items-start justify-between">
                            <h3 className="text-lg font-semibold text-white">
                                {item.title}
                            </h3>
                            <span className="text-xs text-gray-500">
                                {new Date(item.createdAt).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                })}
                            </span>
                        </div>
                        <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                            {item.content}
                        </div>
                        {item.relatedBookIds && (
                            <div className="mt-4 pt-4 border-t border-gray-800">
                                <RelatedBooksInfo bookIds={item.relatedBookIds} eventId={item.eventId} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function RelatedBooksInfo({ bookIds, eventId }: { bookIds: string; eventId: number }) {
    const ids = JSON.parse(bookIds) as number[];
    // Fetch only the specific books we need by their IDs
    const { data: relatedBooks } = api.book.getByIds.useQuery(
        { ids },
        { enabled: ids.length > 0 }
    );

    // Fetch event-book relationships to get AI scores
    const { data: eventBooks } = api.event.getEventBooksWithScores.useQuery(
        { eventId },
        { enabled: !!eventId }
    );

    if (!relatedBooks || relatedBooks.length === 0) {
        return null;
    }

    // Create a map of bookId to AI score/explanation
    const aiScoreMap = new Map(
        eventBooks?.map(eb => [eb.bookId, { score: eb.aiScore, explanation: eb.aiExplanation }]) ?? []
    );

    return (
        <div>
            <p className="text-xs font-semibold text-gray-400 mb-3">Related Books:</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {relatedBooks.map(book => {
                    const aiData = aiScoreMap.get(book.id);
                    return (
                        <div
                            key={book.id}
                            className="group flex gap-3 rounded-lg border border-gray-700 bg-gray-800 p-3 transition-all hover:border-gray-600"
                        >
                            {/* Book Jacket Thumbnail */}
                            <div className="flex-shrink-0">
                                {book.isbn ? (
                                    <div className="overflow-hidden rounded-md bg-gray-700 w-20">
                                        <img
                                            src={`https://cdn.anotherread.com/jackets/${book.isbn}.jpg`}
                                            alt={`${book.title} book cover`}
                                            className="h-28 w-20 object-cover transition-transform group-hover:scale-105"
                                            onError={(e) => {
                                                // Fallback to book icon if image fails to load
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                                const fallback = target.nextElementSibling as HTMLElement;
                                                if (fallback) fallback.style.display = 'flex';
                                            }}
                                        />
                                        <div className="hidden h-28 w-20 items-center justify-center">
                                            <Icon name="menu_book" className="text-2xl text-gray-600" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex h-28 w-20 items-center justify-center rounded-md bg-gray-700">
                                        <Icon name="menu_book" className="text-2xl text-gray-600" />
                                    </div>
                                )}
                            </div>

                            {/* Book Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <p className="text-sm font-medium text-gray-200 line-clamp-2">
                                        {book.title}
                                    </p>
                                    {aiData?.score !== null && aiData?.score !== undefined && (
                                        <span
                                            className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${aiData.score >= 8
                                                ? 'bg-green-500/20 text-green-400'
                                                : aiData.score >= 5
                                                    ? 'bg-blue-500/20 text-blue-400'
                                                    : 'bg-gray-500/20 text-gray-400'
                                                }`}
                                        >
                                            {aiData.score}/10
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400 mb-2">
                                    {book.author}
                                </p>
                                {aiData?.explanation && (
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        {aiData.explanation}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
