"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Icon } from "./icon";

type ViewMode = "grid" | "list";

export function BookList({ eventId }: { eventId?: number }) {
    const [currentPage, setCurrentPage] = useState(0);
    const [viewMode, setViewMode] = useState<ViewMode>("grid");
    const pageSize = 20;

    // Conditionally fetch either all books or related books based on eventId
    const { data: allBooks, isLoading: isLoadingAll } = api.book.getAll.useQuery(
        {
            limit: pageSize,
            offset: currentPage * pageSize,
        },
        {
            enabled: !eventId, // Only fetch all books if no eventId is provided
        }
    );

    const { data: relatedBooks, isLoading: isLoadingRelated } = api.event.getRelatedBooks.useQuery(
        { eventId: eventId! },
        {
            enabled: !!eventId, // Only fetch related books if eventId is provided
        }
    );

    // Fetch event-book relationships with AI scores when filtering by event
    const { data: eventBooks } = api.event.getEventBooksWithScores.useQuery(
        { eventId: eventId! },
        {
            enabled: !!eventId,
        }
    );

    // Create a map of bookId to AI score/explanation
    const aiScoreMap = new Map(
        eventBooks?.map(eb => [eb.bookId, { score: eb.aiScore, explanation: eb.aiExplanation }]) ?? []
    );

    const books = eventId ? relatedBooks : allBooks;
    const isLoading = eventId ? isLoadingRelated : isLoadingAll;

    if (isLoading) {
        return (
            <div className="w-full">
                <div className="flex items-center justify-center rounded-lg border border-gray-800 bg-gray-900 p-12">
                    <div className="flex items-center gap-3">
                        <div className="h-6 w-6 animate-spin rounded-full border-4 border-gray-600 border-t-transparent"></div>
                        <p className="text-gray-400">Loading books...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!books || books.length === 0) {
        return (
            <div className="w-full">
                <div className="rounded-lg border border-gray-800 bg-gray-900 p-12 text-center">
                    <Icon name="menu_book" className="text-6xl text-gray-600" />
                    <h3 className="mb-2 text-xl font-semibold text-gray-300">
                        No books found
                    </h3>
                    <p className="text-gray-500">
                        {eventId
                            ? "No related books found for this event."
                            : "The library is empty. Check back later!"}
                    </p>
                    {eventId && (
                        <a
                            href="/books"
                            className="mt-4 inline-block rounded-lg bg-blue-500/20 px-4 py-2 text-sm text-blue-400 transition-colors hover:bg-blue-500/30"
                        >
                            View All Books
                        </a>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Filter indicator */}
            {eventId && (
                <div className="mb-4 flex items-center justify-between rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3">
                    <div className="flex items-center gap-2">
                        <Icon name="filter_list" className="text-blue-400" />
                        <span className="text-sm text-blue-300">
                            Showing books related to this event
                        </span>
                    </div>
                    <a
                        href="/books"
                        className="rounded-lg bg-blue-500/20 px-3 py-1.5 text-sm text-blue-400 transition-colors hover:bg-blue-500/30"
                    >
                        Clear Filter
                    </a>
                </div>
            )}

            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold text-white">
                        {eventId ? "Related Books" : "All Books"}
                    </h2>
                    <span className="rounded-full bg-gray-800 px-3 py-1 text-sm text-gray-400">
                        {books.length} {books.length === 1 ? "book" : "books"}
                    </span>
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-2 rounded-lg bg-gray-900 border border-gray-800 p-1">
                    <button
                        onClick={() => setViewMode("grid")}
                        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${viewMode === "grid"
                            ? "bg-gray-800 text-white"
                            : "text-gray-400 hover:text-white"
                            }`}
                        title="Grid view"
                    >
                        <Icon name="grid_view" className="text-lg" />
                        <span>Grid</span>
                    </button>
                    <button
                        onClick={() => setViewMode("list")}
                        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${viewMode === "list"
                            ? "bg-gray-800 text-white"
                            : "text-gray-400 hover:text-white"
                            }`}
                        title="List view"
                    >
                        <Icon name="view_list" className="text-lg" />
                        <span>List</span>
                    </button>
                </div>
            </div>

            {/* Books Grid View */}
            {viewMode === "grid" && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {books.map((book) => {
                        const aiData = eventId ? aiScoreMap.get(book.id) : undefined;
                        return (
                            <a
                                key={book.id}
                                href={`/books/${book.id}`}
                                className="group rounded-lg border border-gray-800 bg-gray-900 p-5 transition-all hover:border-gray-700 hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer"
                            >
                                {/* Book Jacket Thumbnail */}
                                {book.isbn ? (
                                    <div className="mb-4 overflow-hidden rounded-lg bg-gray-800">
                                        <img
                                            src={`https://cdn.anotherread.com/jackets/${book.isbn}.jpg`}
                                            alt={`${book.title} book cover`}
                                            className="h-64 w-full object-cover transition-transform group-hover:scale-105"
                                            onError={(e) => {
                                                // Fallback to book icon if image fails to load
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                                const fallback = target.nextElementSibling as HTMLElement;
                                                if (fallback) fallback.style.display = 'flex';
                                            }}
                                        />
                                        <div className="hidden h-64 w-full items-center justify-center text-6xl">
                                            <Icon name="menu_book" className="text-6xl text-gray-600" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mb-4 flex h-64 items-center justify-center rounded-lg bg-gray-800 text-6xl">
                                        <Icon name="menu_book" className="text-6xl text-gray-600" />
                                    </div>
                                )}

                                <div className="mb-4 flex items-start justify-between gap-2">
                                    {book.price && (
                                        <span className="rounded-full bg-green-500/20 px-3 py-1 text-sm font-semibold text-green-400">
                                            £{book.price}
                                        </span>
                                    )}
                                    {aiData?.score !== null && aiData?.score !== undefined && (
                                        <span
                                            className={`rounded-full px-2.5 py-1 text-sm font-semibold ${aiData.score >= 8
                                                ? 'bg-green-500/20 text-green-400'
                                                : aiData.score >= 5
                                                    ? 'bg-blue-500/20 text-blue-400'
                                                    : 'bg-gray-500/20 text-gray-400'
                                                }`}
                                        >
                                            AI: {aiData.score}/10
                                        </span>
                                    )}
                                </div>

                                <h3 className="mb-2 line-clamp-2 text-base font-medium text-white">
                                    {book.title}
                                </h3>

                                <p className="mb-3 text-sm text-gray-400">
                                    by {book.author}
                                </p>

                                {aiData?.explanation && (
                                    <p className="mb-3 text-xs text-gray-500 leading-relaxed line-clamp-3">
                                        {aiData.explanation}
                                    </p>
                                )}

                                {book.description && !aiData?.explanation && (
                                    <p className="mb-4 line-clamp-3 text-sm text-gray-500">
                                        {book.description.replace(/<[^>]*>/g, '')}
                                    </p>
                                )}

                                <div className="flex flex-wrap gap-2">
                                    {book.isbn && (
                                        <span className="rounded-md bg-gray-800 px-2 py-1 text-xs text-gray-500">
                                            ISBN: {book.isbn}
                                        </span>
                                    )}
                                    {book.status && (
                                        <span className={`rounded-md px-2 py-1 text-xs ${book.status === 'active'
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-gray-800 text-gray-500'
                                            }`}>
                                            {book.status}
                                        </span>
                                    )}
                                </div>
                            </a>
                        );
                    })}
                </div>
            )}

            {/* Books List View */}
            {viewMode === "list" && (
                <div className="space-y-2">
                    {books.map((book) => {
                        const aiData = eventId ? aiScoreMap.get(book.id) : undefined;
                        return (
                            <a
                                key={book.id}
                                href={`/books/${book.id}`}
                                className="group block rounded-lg border border-gray-800 bg-gray-900 p-4 transition-all hover:border-gray-700 hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start gap-3 mb-2">
                                            <Icon name="menu_book" className="text-2xl text-gray-600 flex-shrink-0 mt-1" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <h3 className="text-base font-medium text-white">
                                                        {book.title}
                                                    </h3>
                                                    {aiData?.score !== null && aiData?.score !== undefined && (
                                                        <span
                                                            className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${aiData.score >= 8
                                                                    ? 'bg-green-500/20 text-green-400'
                                                                    : aiData.score >= 5
                                                                        ? 'bg-blue-500/20 text-blue-400'
                                                                        : 'bg-gray-500/20 text-gray-400'
                                                                }`}
                                                        >
                                                            AI: {aiData.score}/10
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-400 mb-2">
                                                    by {book.author}
                                                </p>
                                                {aiData?.explanation && (
                                                    <p className="text-xs text-gray-500 leading-relaxed mb-2">
                                                        {aiData.explanation}
                                                    </p>
                                                )}
                                                {book.description && !aiData?.explanation && (
                                                    <p className="line-clamp-2 text-sm text-gray-500">
                                                        {book.description.replace(/<[^>]*>/g, '')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {book.isbn && (
                                                <span className="rounded-md bg-gray-800 px-2 py-1 text-xs text-gray-500">
                                                    ISBN: {book.isbn}
                                                </span>
                                            )}
                                            {book.status && (
                                                <span className={`rounded-md px-2 py-1 text-xs ${book.status === 'active'
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : 'bg-gray-800 text-gray-500'
                                                    }`}>
                                                    {book.status}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {book.price && (
                                        <span className="rounded-full bg-green-500/20 px-3 py-1 text-sm font-semibold text-green-400 flex-shrink-0">
                                            £{book.price}
                                        </span>
                                    )}
                                </div>
                            </a>
                        );
                    })}
                </div>
            )}

            {/* Pagination - only show when not filtering by event */}
            {!eventId && (
                <div className="mt-8 flex items-center justify-center gap-4">
                    <button
                        onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                        disabled={currentPage === 0}
                        className="rounded-lg bg-gray-800 px-6 py-3 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        ← Previous
                    </button>
                    <span className="text-gray-400">
                        Page {currentPage + 1}
                    </span>
                    <button
                        onClick={() => setCurrentPage((p) => p + 1)}
                        disabled={books.length < pageSize}
                        className="rounded-lg bg-gray-800 px-6 py-3 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Next →
                    </button>
                </div>
            )}
        </div>
    );
}
