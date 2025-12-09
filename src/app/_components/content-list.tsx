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
                                <RelatedBooksInfo bookIds={item.relatedBookIds} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function RelatedBooksInfo({ bookIds }: { bookIds: string }) {
    const ids = JSON.parse(bookIds) as number[];
    // Fetch all books with a high limit to ensure we get the related ones
    const { data: allBooks } = api.book.getAll.useQuery({ limit: 100 });

    if (!allBooks || ids.length === 0) {
        return null;
    }

    const relatedBooks = allBooks.filter(book => ids.includes(book.id));

    if (relatedBooks.length === 0) {
        return null;
    }

    return (
        <div>
            <p className="text-xs font-semibold text-gray-400 mb-3">Related Books:</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {relatedBooks.map(book => (
                    <div
                        key={book.id}
                        className="group flex flex-col rounded-lg border border-gray-700 bg-gray-800 p-2 transition-all hover:border-gray-600"
                    >
                        {/* Book Jacket Thumbnail */}
                        {book.isbn ? (
                            <div className="mb-2 overflow-hidden rounded-md bg-gray-700">
                                <img
                                    src={`https://cdn.anotherread.com/jackets/${book.isbn}.jpg`}
                                    alt={`${book.title} book cover`}
                                    className="h-32 w-full object-cover transition-transform group-hover:scale-105"
                                    onError={(e) => {
                                        // Fallback to book icon if image fails to load
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const fallback = target.nextElementSibling as HTMLElement;
                                        if (fallback) fallback.style.display = 'flex';
                                    }}
                                />
                                <div className="hidden h-32 w-full items-center justify-center text-4xl">
                                    <Icon name="menu_book" className="text-4xl text-gray-600" />
                                </div>
                            </div>
                        ) : (
                            <div className="mb-2 flex h-32 items-center justify-center rounded-md bg-gray-700 text-4xl">
                                <Icon name="menu_book" className="text-4xl text-gray-600" />
                            </div>
                        )}

                        {/* Book Info */}
                        <div className="flex-1">
                            <p className="line-clamp-2 text-xs font-medium text-gray-200">
                                {book.title}
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                                {book.author}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
