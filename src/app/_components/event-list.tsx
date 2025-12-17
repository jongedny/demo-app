"use client";

import { useState, useMemo } from "react";
import { api } from "~/trpc/react";
import { Icon } from "./icon";

export function EventList() {
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editValue, setEditValue] = useState("");
    const [editKeywords, setEditKeywords] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editEventDate, setEditEventDate] = useState("");
    const [currentMonthIndex, setCurrentMonthIndex] = useState(0);

    const utils = api.useUtils();
    const { data: events, isLoading } = api.event.getAll.useQuery();
    const updateEvent = api.event.update.useMutation({
        onSuccess: async () => {
            await utils.event.getAll.invalidate();
            setEditingId(null);
            setEditValue("");
            setEditKeywords("");
            setEditDescription("");
            setEditEventDate("");
        },
    });

    const handleEdit = (id: number, currentName: string, currentKeywords: string | null, currentDescription: string | null, currentEventDate: Date | null) => {
        setEditingId(id);
        setEditValue(currentName);
        setEditKeywords(currentKeywords || "");
        setEditDescription(currentDescription || "");
        setEditEventDate(currentEventDate ? new Date(currentEventDate).toISOString().split('T')[0]! : "");
    };

    const handleSave = async (id: number) => {
        if (!editValue.trim()) return;
        await updateEvent.mutateAsync({
            id,
            name: editValue,
            keywords: editKeywords.trim() || undefined,
            description: editDescription.trim() || undefined,
            eventDate: editEventDate ? new Date(editEventDate) : undefined,
        });
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditValue("");
        setEditKeywords("");
        setEditDescription("");
        setEditEventDate("");
    };

    // Group events by month (must be before conditional returns)
    const eventsByMonth = useMemo(() => {
        if (!events || events.length === 0) return [];

        const monthGroups = events.reduce((groups, event) => {
            const date = event.eventDate ? new Date(event.eventDate) : null;
            const monthKey = date
                ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                : 'no-date';

            if (!groups[monthKey]) {
                groups[monthKey] = {
                    monthKey,
                    displayName: date
                        ? date.toLocaleDateString("en-US", { year: "numeric", month: "long" })
                        : "No Date Set",
                    sortDate: date ? date.getTime() : 0,
                    events: [],
                };
            }
            groups[monthKey]!.events.push(event);
            return groups;
        }, {} as Record<string, { monthKey: string; displayName: string; sortDate: number; events: typeof events }>);

        // Sort months (most recent first)
        return Object.values(monthGroups).sort((a, b) => {
            if (a.monthKey === 'no-date') return 1;
            if (b.monthKey === 'no-date') return -1;
            return b.sortDate - a.sortDate;
        });
    }, [events]);

    // Get current month's data
    const currentMonth = eventsByMonth[currentMonthIndex];

    // Group events within the current month by date
    const groupedEvents = useMemo(() => {
        if (!currentMonth) return [];

        const dateGroups = currentMonth.events.reduce((groups, event) => {
            const dateKey = event.eventDate
                ? new Date(event.eventDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                })
                : "No Date Set";

            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey]!.push(event);
            return groups;
        }, {} as Record<string, typeof currentMonth.events>);

        // Sort groups by date (most recent first)
        return Object.entries(dateGroups).sort(([dateA], [dateB]) => {
            if (dateA === "No Date Set") return 1;
            if (dateB === "No Date Set") return -1;
            return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
    }, [currentMonth]);

    const handlePreviousMonth = () => {
        if (currentMonthIndex < eventsByMonth.length - 1) {
            setCurrentMonthIndex(currentMonthIndex + 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonthIndex > 0) {
            setCurrentMonthIndex(currentMonthIndex - 1);
        }
    };

    // Conditional returns AFTER all hooks
    if (isLoading) {
        return (
            <div className="w-full">
                <div className="flex items-center justify-center rounded-lg border border-gray-800 bg-gray-900 p-12">
                    <div className="flex items-center gap-3">
                        <div className="h-6 w-6 animate-spin rounded-full border-4 border-gray-600 border-t-transparent"></div>
                        <p className="text-gray-400">Loading events...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!events || events.length === 0) {
        return (
            <div className="w-full">
                <div className="rounded-lg border border-gray-800 bg-gray-900 p-12 text-center">
                    <Icon name="event" className="text-6xl text-gray-600" />
                    <h3 className="mb-2 text-xl font-semibold text-gray-300">
                        No events yet
                    </h3>
                    <p className="text-gray-500">
                        Create your first event to get started!
                    </p>
                </div>
            </div>
        );
    }

    if (!currentMonth) {
        return (
            <div className="w-full">
                <div className="rounded-lg border border-gray-800 bg-gray-900 p-12 text-center">
                    <Icon name="event" className="text-6xl text-gray-600" />
                    <h3 className="mb-2 text-xl font-semibold text-gray-300">
                        No events for this month
                    </h3>
                    <p className="text-gray-500">
                        Try navigating to a different month or create a new event!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Month Navigation */}
            <div className="mb-6 flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 p-4">
                <button
                    onClick={handlePreviousMonth}
                    disabled={currentMonthIndex >= eventsByMonth.length - 1}
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                >
                    <Icon name="chevron_left" className="text-lg" />
                    Previous
                </button>
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-white">
                        {currentMonth.displayName}
                    </h2>
                    <p className="text-sm text-gray-400">
                        {currentMonth.events.length} {currentMonth.events.length === 1 ? "event" : "events"}
                    </p>
                </div>
                <button
                    onClick={handleNextMonth}
                    disabled={currentMonthIndex <= 0}
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                >
                    Next
                    <Icon name="chevron_right" className="text-lg" />
                </button>
            </div>

            {/* Events grouped by date */}
            <div className="space-y-8">
                {groupedEvents.map(([dateKey, groupEvents]) => (
                    <div key={dateKey}>
                        <h2 className="text-lg font-semibold text-white mb-4">
                            {dateKey}
                        </h2>
                        <div className="space-y-3">
                            {groupEvents.map((event) => (
                                <div
                                    key={event.id}
                                    className="group rounded-lg border border-gray-800 bg-gray-900 p-5 transition-colors hover:border-gray-700"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            {editingId === event.id ? (
                                                <div className="flex flex-col gap-2 w-full">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-600"
                                                            disabled={updateEvent.isPending}
                                                            autoFocus
                                                            placeholder="Event name"
                                                        />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={editKeywords}
                                                        onChange={(e) => setEditKeywords(e.target.value)}
                                                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-600"
                                                        disabled={updateEvent.isPending}
                                                        placeholder="Keywords (comma separated)"
                                                    />
                                                    <input
                                                        type="date"
                                                        value={editEventDate}
                                                        onChange={(e) => setEditEventDate(e.target.value)}
                                                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-600"
                                                        disabled={updateEvent.isPending}
                                                    />
                                                    <textarea
                                                        value={editDescription}
                                                        onChange={(e) => setEditDescription(e.target.value)}
                                                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-600"
                                                        disabled={updateEvent.isPending}
                                                        placeholder="Description"
                                                        rows={3}
                                                    />
                                                    <div className="flex justify-end gap-2 mt-2">
                                                        <button
                                                            onClick={() => handleSave(event.id)}
                                                            disabled={updateEvent.isPending || !editValue.trim()}
                                                            className="rounded-lg bg-green-500/20 px-3 py-2 text-green-400 transition-colors hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                                        >
                                                            {updateEvent.isPending ? "Saving..." : "Save Changes"}
                                                        </button>
                                                        <button
                                                            onClick={handleCancel}
                                                            disabled={updateEvent.isPending}
                                                            className="rounded-lg bg-red-500/20 px-3 py-2 text-red-400 transition-colors hover:bg-red-500/30 disabled:opacity-50 text-sm"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="w-full">
                                                    <div className="flex items-center justify-between">
                                                        <h3
                                                            className="text-base font-medium text-white cursor-pointer hover:text-gray-300 transition-colors"
                                                            onClick={() => handleEdit(event.id, event.name, event.keywords, event.description, event.eventDate)}
                                                            title="Click to edit"
                                                        >
                                                            {event.name}
                                                        </h3>
                                                        {event.eventDate && (
                                                            <span className="text-base font-medium text-white">
                                                                {new Date(event.eventDate).toLocaleDateString("en-US", {
                                                                    year: "numeric",
                                                                    month: "short",
                                                                    day: "numeric",
                                                                })}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {event.description && (
                                                        <p className="text-sm text-gray-400 mt-1 mb-2">
                                                            {event.description}
                                                        </p>
                                                    )}
                                                    {event.keywords && (
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            {event.keywords.split(',').map((keyword, i) => (
                                                                <span key={i} className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-full border border-gray-700">
                                                                    {keyword.trim()}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <EventActions
                                                        eventId={event.id}
                                                        createdAt={event.createdAt}
                                                        onEdit={() => handleEdit(event.id, event.name, event.keywords, event.description, event.eventDate)}
                                                        isEditing={editingId === event.id}
                                                    />

                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function EventActions({ eventId, createdAt, onEdit, isEditing }: { eventId: number; createdAt: Date; onEdit: () => void; isEditing: boolean }) {
    const utils = api.useUtils();
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const suggestContent = api.event.suggestContent.useMutation({
        onSuccess: (data) => {
            setMessage({ type: 'success', text: `Generated ${data.count} content pieces!` });
            setTimeout(() => setMessage(null), 3000);
            void utils.content.getByEvent.invalidate({ eventId });
        },
        onError: (error) => {
            setMessage({ type: 'error', text: error.message });
            setTimeout(() => setMessage(null), 3000);
        },
    });

    const deleteEvent = api.event.delete.useMutation({
        onSuccess: async () => {
            await utils.event.getAll.invalidate();
            setMessage({ type: 'success', text: 'Event deleted successfully!' });
            setShowDeleteConfirm(false);
        },
        onError: (error) => {
            setMessage({ type: 'error', text: error.message });
            setTimeout(() => setMessage(null), 3000);
            setShowDeleteConfirm(false);
        },
    });

    const handleDelete = () => {
        setShowDeleteConfirm(true);
    };

    const confirmDelete = () => {
        deleteEvent.mutate({ id: eventId });
    };

    const cancelDelete = () => {
        setShowDeleteConfirm(false);
    };

    return (
        <div className="mt-4 -mx-5 -mb-5">
            <div className="flex items-center justify-between border-t border-gray-800">
                <div className="flex">
                    <a
                        href={`/books?eventId=${eventId}`}
                        className="px-4 py-3 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white border-r border-gray-800 flex items-center gap-1.5"
                    >
                        <Icon name="menu_book" className="text-base" />
                        Related Books
                    </a>
                    <button
                        onClick={() => suggestContent.mutate({ eventId })}
                        disabled={suggestContent.isPending}
                        className="px-4 py-3 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed border-r border-gray-800 flex items-center gap-1.5"
                    >
                        {suggestContent.isPending ? (
                            <>
                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"></div>
                                Generating...
                            </>
                        ) : (
                            <>
                                <Icon name="auto_awesome" className="text-base" />
                                Suggest Content
                            </>
                        )}
                    </button>
                    <a
                        href={`/content?eventId=${eventId}`}
                        className="px-4 py-3 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white border-r border-gray-800 flex items-center gap-1.5"
                    >
                        <Icon name="visibility" className="text-base" />
                        View Content
                    </a>
                    {!isEditing && (
                        <>
                            <button
                                onClick={onEdit}
                                className="px-4 py-3 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white border-r border-gray-800 flex items-center gap-1.5"
                            >
                                <Icon name="edit" className="text-base" />
                                Edit
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleteEvent.isPending}
                                className="px-4 py-3 text-sm text-gray-400 transition-colors hover:bg-red-900 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                            >
                                {deleteEvent.isPending ? (
                                    <>
                                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"></div>
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Icon name="delete" className="text-base" />
                                        Remove
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
                <p className="text-xs text-gray-500 whitespace-nowrap px-4 py-3">
                    Created {new Date(createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                    })}
                </p>
            </div>
            {message && (
                <div className={`text-xs px-5 py-2 ${message.type === 'success' ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
                    {message.text}
                </div>
            )}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={cancelDelete}>
                    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-white mb-2">Delete Event?</h3>
                        <p className="text-sm text-gray-400 mb-4">
                            Are you sure you want to delete this event? This will also remove all related content and book relationships. This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={cancelDelete}
                                disabled={deleteEvent.isPending}
                                className="px-4 py-2 text-sm text-gray-400 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={deleteEvent.isPending}
                                className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {deleteEvent.isPending && (
                                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                )}
                                {deleteEvent.isPending ? 'Deleting...' : 'Delete Event'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
