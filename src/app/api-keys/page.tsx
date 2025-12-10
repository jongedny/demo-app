"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { formatDistanceToNow } from "date-fns";

export default function ApiKeysPage() {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newKeyName, setNewKeyName] = useState("");
    const [createdKey, setCreatedKey] = useState<string | null>(null);
    const [copiedKey, setCopiedKey] = useState(false);

    const { data: apiKeys, refetch } = api.admin.getAllApiKeys.useQuery();
    const createKey = api.admin.createApiKey.useMutation({
        onSuccess: (data) => {
            setCreatedKey(data.apiKey);
            setNewKeyName("");
            void refetch();
        },
    });
    const revokeKey = api.admin.revokeApiKey.useMutation({
        onSuccess: () => {
            void refetch();
        },
    });
    const deleteKey = api.admin.deleteApiKey.useMutation({
        onSuccess: () => {
            void refetch();
        },
    });

    const handleCreateKey = () => {
        if (!newKeyName.trim()) return;
        createKey.mutate({ name: newKeyName });
    };

    const handleCopyKey = () => {
        if (createdKey) {
            void navigator.clipboard.writeText(createdKey);
            setCopiedKey(true);
            setTimeout(() => setCopiedKey(false), 2000);
        }
    };

    const handleCloseKeyModal = () => {
        setCreatedKey(null);
        setShowCreateModal(false);
    };

    return (
        <div className="container mx-auto p-6">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
                    <p className="mt-2 text-gray-600">
                        Manage API keys for external access to your content
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                >
                    Create API Key
                </button>
            </div>

            {/* API Keys Table */}
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Usage Count
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Last Used
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Created
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {apiKeys?.map((key) => (
                            <tr key={key.id} className="hover:bg-gray-50">
                                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                                    {key.name}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm">
                                    <span
                                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${key.status === "active"
                                                ? "bg-green-100 text-green-800"
                                                : "bg-red-100 text-red-800"
                                            }`}
                                    >
                                        {key.status}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                    {key.usageCount}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                    {key.lastUsedAt
                                        ? formatDistanceToNow(new Date(key.lastUsedAt), {
                                            addSuffix: true,
                                        })
                                        : "Never"}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                    {formatDistanceToNow(new Date(key.createdAt), {
                                        addSuffix: true,
                                    })}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                    {key.status === "active" && (
                                        <button
                                            onClick={() => revokeKey.mutate({ keyId: key.id })}
                                            className="mr-3 text-orange-600 hover:text-orange-900"
                                            disabled={revokeKey.isPending}
                                        >
                                            Revoke
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            if (
                                                confirm(
                                                    "Are you sure you want to delete this API key? This action cannot be undone."
                                                )
                                            ) {
                                                deleteKey.mutate({ keyId: key.id });
                                            }
                                        }}
                                        className="text-red-600 hover:text-red-900"
                                        disabled={deleteKey.isPending}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {(!apiKeys || apiKeys.length === 0) && (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="px-6 py-12 text-center text-sm text-gray-500"
                                >
                                    No API keys found. Create one to get started.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create API Key Modal */}
            {showCreateModal && !createdKey && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                        <h2 className="mb-4 text-xl font-bold text-gray-900">
                            Create New API Key
                        </h2>
                        <div className="mb-4">
                            <label
                                htmlFor="keyName"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Key Name
                            </label>
                            <input
                                id="keyName"
                                type="text"
                                value={newKeyName}
                                onChange={(e) => setNewKeyName(e.target.value)}
                                placeholder="e.g., Production Website"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setNewKeyName("");
                                }}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateKey}
                                disabled={!newKeyName.trim() || createKey.isPending}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {createKey.isPending ? "Creating..." : "Create"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Show Created Key Modal */}
            {createdKey && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
                        <h2 className="mb-4 text-xl font-bold text-gray-900">
                            API Key Created Successfully
                        </h2>
                        <div className="mb-4 rounded-lg bg-yellow-50 p-4">
                            <p className="mb-2 text-sm font-semibold text-yellow-800">
                                ⚠️ Important: Save this key now!
                            </p>
                            <p className="text-sm text-yellow-700">
                                This is the only time you'll see this key. Store it securely.
                            </p>
                        </div>
                        <div className="mb-4">
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                Your API Key
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={createdKey}
                                    readOnly
                                    className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-sm"
                                />
                                <button
                                    onClick={handleCopyKey}
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                                >
                                    {copiedKey ? "Copied!" : "Copy"}
                                </button>
                            </div>
                        </div>
                        <div className="mb-4 rounded-lg bg-gray-50 p-4">
                            <p className="mb-2 text-sm font-semibold text-gray-700">
                                Usage Example:
                            </p>
                            <pre className="overflow-x-auto text-xs text-gray-600">
                                {`// Using tRPC client
const result = await trpc.api.getContent.query({
  apiKey: "${createdKey}",
  limit: 10,
  offset: 0
});`}
                            </pre>
                        </div>
                        <div className="flex justify-end">
                            <button
                                onClick={handleCloseKeyModal}
                                className="rounded-lg bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
