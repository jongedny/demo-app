"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export function EventList() {
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editValue, setEditValue] = useState("");
    const [editKeywords, setEditKeywords] = useState("");
    const [editDescription, setEditDescription] = useState("");

    const utils = api.useUtils();
    const { data: events, isLoading } = api.event.getAll.useQuery();
    const updateEvent = api.event.update.useMutation({
        onSuccess: async () => {
            await utils.event.getAll.invalidate();
            setEditingId(null);
            setEditValue("");
            setEditKeywords("");
            setEditDescription("");
        },
    });

    const handleEdit = (id: number, currentName: string, currentKeywords: string | null, currentDescription: string | null) => {
        setEditingId(id);
        setEditValue(currentName);
        setEditKeywords(currentKeywords || "");
        setEditDescription(currentDescription || "");
    };

    const handleSave = async (id: number) => {
        if (!editValue.trim()) return;
        await updateEvent.mutateAsync({
            id,
            name: editValue,
            keywords: editKeywords.trim() || undefined,
            description: editDescription.trim() || undefined,
        });
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditValue("");
        setEditKeywords("");
        setEditDescription("");
    };

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
                    <div className="mb-4 text-6xl">📅</div>
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

    return (
        <div className="w-full">
            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">
                    All Events
                </h2>
                <span className="rounded-full bg-gray-800 px-3 py-1 text-sm text-gray-400">
                    {events.length} {events.length === 1 ? "event" : "events"}
                </span>
            </div>
            <div className="space-y-3">
                {events.map((event) => (
                    <div
                        key={event.id}
                        className="group rounded-lg border border-gray-800 bg-gray-900 p-5 transition-colors hover:border-gray-700"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 text-xl">
                                    🎉
                                </div>
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
                                                    onClick={() => handleEdit(event.id, event.name, event.keywords, event.description)}
                                                    title="Click to edit"
                                                >
                                                    {event.name}
                                                </h3>
                                                <p className="text-sm text-gray-500">
                                                    {new Date(event.createdAt).toLocaleDateString("en-US", {
                                                        year: "numeric",
                                                        month: "long",
                                                        day: "numeric",
                                                    })}
                                                </p>
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
                                            <EventActions eventId={event.id} />
                                        </div>
                                    )}
                                </div>
                            </div>
                            {editingId !== event.id && (
                                <button
                                    onClick={() => handleEdit(event.id, event.name, event.keywords, event.description)}
                                    className="ml-4 rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-gray-700 hover:text-white"
                                >
                                    Edit
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function EventActions({ eventId }: { eventId: number }) {
    const utils = api.useUtils();
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const findRelatedBooks = api.event.findRelatedBooks.useMutation({
        onSuccess: (data) => {
            setMessage({
                type: 'success',
                text: data.cached
                    ? `${data.count} related books (cached)`
                    : `Found ${data.count} related books!`
            });
            setTimeout(() => setMessage(null), 3000);
        },
        onError: (error) => {
            setMessage({ type: 'error', text: error.message });
            setTimeout(() => setMessage(null), 3000);
        },
    });

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

    return (
        <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => findRelatedBooks.mutate({ eventId })}
                    disabled={findRelatedBooks.isPending}
                    className="rounded-lg bg-blue-500/20 px-3 py-1.5 text-sm text-blue-400 transition-colors hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {findRelatedBooks.isPending ? (
                        <span className="flex items-center gap-2">
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent"></div>
                            Finding...
                        </span>
                    ) : (
                        '📚 Related Books'
                    )}
                </button>
                <button
                    onClick={() => suggestContent.mutate({ eventId })}
                    disabled={suggestContent.isPending}
                    className="rounded-lg bg-purple-500/20 px-3 py-1.5 text-sm text-purple-400 transition-colors hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {suggestContent.isPending ? (
                        <span className="flex items-center gap-2">
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-purple-400 border-t-transparent"></div>
                            Generating...
                        </span>
                    ) : (
                        '✨ Suggest Content'
                    )}
                </button>
                <a
                    href={`/content?eventId=${eventId}`}
                    className="rounded-lg bg-green-500/20 px-3 py-1.5 text-sm text-green-400 transition-colors hover:bg-green-500/30"
                >
                    👁️ View Content
                </a>
            </div>
            {message && (
                <div className={`text-xs ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                    {message.text}
                </div>
            )}
        </div>
    );
}
