"use client";

import { useParams, useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export default function ImportDetailPage() {
    const params = useParams();
    const router = useRouter();
    const importLogId = parseInt(params.id as string);

    const { data: importLog, isLoading } = api.import.getLogDetails.useQuery({
        importLogId,
    });

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center">Loading...</div>
            </div>
        );
    }

    if (!importLog) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center text-red-600">Import log not found</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center text-blue-600 hover:text-blue-800"
                >
                    <span className="material-icons mr-1">arrow_back</span>
                    Back to Imports
                </button>
            </div>

            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Import Details</h1>
                <p className="text-gray-600">{importLog.filename}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="rounded-lg bg-white p-6 shadow">
                    <p className="text-sm text-gray-600 mb-1">Status</p>
                    <span
                        className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${importLog.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : importLog.status === 'failed'
                                    ? 'bg-red-100 text-red-800'
                                    : importLog.status === 'processing'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-gray-100 text-gray-800'
                            }`}
                    >
                        {importLog.status}
                    </span>
                </div>

                <div className="rounded-lg bg-white p-6 shadow">
                    <p className="text-sm text-gray-600 mb-1">Total Books</p>
                    <p className="text-3xl font-bold text-gray-900">{importLog.totalBooks || 0}</p>
                </div>

                <div className="rounded-lg bg-white p-6 shadow">
                    <p className="text-sm text-gray-600 mb-1">Imported</p>
                    <p className="text-3xl font-bold text-green-600">{importLog.importedBooks || 0}</p>
                </div>

                <div className="rounded-lg bg-white p-6 shadow">
                    <p className="text-sm text-gray-600 mb-1">Skipped</p>
                    <p className="text-3xl font-bold text-yellow-600">{importLog.skippedBooks || 0}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="rounded-lg bg-white p-6 shadow">
                    <h2 className="text-lg font-semibold mb-4">Import Information</h2>
                    <dl className="space-y-3">
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Source</dt>
                            <dd className="mt-1 text-sm text-gray-900">{importLog.importSource || 'Unknown'}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">File Path</dt>
                            <dd className="mt-1 text-sm text-gray-900 font-mono text-xs">{importLog.filepath}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Started At</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {importLog.startedAt ? new Date(importLog.startedAt).toLocaleString() : '-'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Completed At</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {importLog.completedAt ? new Date(importLog.completedAt).toLocaleString() : '-'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Duration</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {importLog.startedAt && importLog.completedAt
                                    ? `${Math.round((new Date(importLog.completedAt).getTime() - new Date(importLog.startedAt).getTime()) / 1000)}s`
                                    : '-'}
                            </dd>
                        </div>
                    </dl>
                </div>

                <div className="rounded-lg bg-white p-6 shadow">
                    <h2 className="text-lg font-semibold mb-4">Statistics</h2>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-sm text-gray-600">Success Rate</span>
                                <span className="text-sm font-semibold text-gray-900">
                                    {importLog.totalBooks
                                        ? Math.round(((importLog.importedBooks || 0) / importLog.totalBooks) * 100)
                                        : 0}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-green-600 h-2 rounded-full"
                                    style={{
                                        width: importLog.totalBooks
                                            ? `${((importLog.importedBooks || 0) / importLog.totalBooks) * 100}%`
                                            : '0%',
                                    }}
                                ></div>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-sm text-gray-600">Skipped</span>
                                <span className="text-sm font-semibold text-gray-900">
                                    {importLog.totalBooks
                                        ? Math.round(((importLog.skippedBooks || 0) / importLog.totalBooks) * 100)
                                        : 0}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-yellow-500 h-2 rounded-full"
                                    style={{
                                        width: importLog.totalBooks
                                            ? `${((importLog.skippedBooks || 0) / importLog.totalBooks) * 100}%`
                                            : '0%',
                                    }}
                                ></div>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-sm text-gray-600">Errors</span>
                                <span className="text-sm font-semibold text-gray-900">
                                    {importLog.totalBooks
                                        ? Math.round(((importLog.errorCount || 0) / importLog.totalBooks) * 100)
                                        : 0}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-red-600 h-2 rounded-full"
                                    style={{
                                        width: importLog.totalBooks
                                            ? `${((importLog.errorCount || 0) / importLog.totalBooks) * 100}%`
                                            : '0%',
                                    }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {importLog.errors && importLog.errors.length > 0 && (
                <div className="rounded-lg bg-white shadow">
                    <div className="border-b border-gray-200 px-6 py-4">
                        <h2 className="text-xl font-semibold text-red-800">
                            Errors ({importLog.errors.length})
                        </h2>
                    </div>
                    <div className="divide-y divide-gray-200">
                        {importLog.errors.map((error) => (
                            <div key={error.id} className="px-6 py-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="inline-flex rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
                                                {error.errorType}
                                            </span>
                                            {error.bookIdentifier && (
                                                <span className="text-sm text-gray-600">
                                                    ISBN: {error.bookIdentifier}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-900 font-medium">{error.errorMessage}</p>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        {new Date(error.createdAt).toLocaleString()}
                                    </span>
                                </div>
                                {error.errorDetails && (
                                    <details className="mt-2">
                                        <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                                            Show details
                                        </summary>
                                        <pre className="mt-2 overflow-x-auto rounded bg-gray-50 p-3 text-xs text-gray-800">
                                            {JSON.stringify(JSON.parse(error.errorDetails), null, 2)}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
