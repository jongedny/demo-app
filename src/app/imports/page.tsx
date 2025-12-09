"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import Link from "next/link";

export default function ImportsPage() {
    const [isProcessing, setIsProcessing] = useState(false);

    const { data: importLogs, refetch } = api.import.getLogs.useQuery();
    const processFiles = api.import.processFiles.useMutation({
        onSuccess: () => {
            setIsProcessing(false);
            void refetch();
        },
        onError: (error) => {
            setIsProcessing(false);
            alert(`Error processing files: ${error.message}`);
        },
    });

    const handleProcessFiles = () => {
        setIsProcessing(true);
        processFiles.mutate();
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8 flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white">Book Imports</h1>
                <button
                    onClick={handleProcessFiles}
                    disabled={isProcessing}
                    className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:bg-gray-600"
                >
                    {isProcessing ? "Processing..." : "Process Incoming Files"}
                </button>
            </div>

            {processFiles.data && (
                <div className="mb-6 rounded-lg bg-green-900/30 p-4 border border-green-700">
                    <h2 className="text-lg font-semibold text-green-400 mb-2">Import Summary</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <p className="text-gray-400">Files Processed</p>
                            <p className="text-2xl font-bold text-green-400">{processFiles.data.totalFiles}</p>
                        </div>
                        <div>
                            <p className="text-gray-400">Books Imported</p>
                            <p className="text-2xl font-bold text-green-400">{processFiles.data.totalBooksImported}</p>
                        </div>
                        <div>
                            <p className="text-gray-400">Books Skipped</p>
                            <p className="text-2xl font-bold text-yellow-400">{processFiles.data.totalBooksSkipped}</p>
                        </div>
                        <div>
                            <p className="text-gray-400">Errors</p>
                            <p className="text-2xl font-bold text-red-400">{processFiles.data.totalErrors}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="mb-8 rounded-lg bg-gray-900 p-6 border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <span className="material-icons align-middle mr-2 text-blue-400">info</span>
                    How to Import Books
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-300">
                    <li>Place your ONIX XML files in the <code className="bg-gray-800 px-2 py-1 rounded text-blue-400">imports/incoming</code> folder</li>
                    <li>Click the "Process Incoming Files" button above</li>
                    <li>The system will automatically parse and import books from the XML files</li>
                    <li>Successfully processed files will be moved to <code className="bg-gray-800 px-2 py-1 rounded text-blue-400">imports/processed</code></li>
                    <li>Failed files will be moved to <code className="bg-gray-800 px-2 py-1 rounded text-blue-400">imports/failed</code></li>
                    <li>Duplicate books (based on ISBN) will be automatically skipped</li>
                </ol>
            </div>

            <div className="rounded-lg bg-gray-900 shadow border border-gray-800">
                <div className="border-b border-gray-800 px-6 py-4">
                    <h2 className="text-xl font-semibold text-white">Import History</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                                    Filename
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                                    Source
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                                    Total Books
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                                    Imported
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                                    Skipped
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                                    Errors
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                                    Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800 bg-gray-900">
                            {importLogs?.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-800">
                                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-white">
                                        {log.filename}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-400">
                                        {log.importSource || 'Unknown'}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                                        <span
                                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${log.status === 'completed'
                                                ? 'bg-green-900/50 text-green-400 border border-green-700'
                                                : log.status === 'failed'
                                                    ? 'bg-red-900/50 text-red-400 border border-red-700'
                                                    : log.status === 'processing'
                                                        ? 'bg-blue-900/50 text-blue-400 border border-blue-700'
                                                        : 'bg-gray-800 text-gray-400 border border-gray-700'
                                                }`}
                                        >
                                            {log.status}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-300">
                                        {log.totalBooks || 0}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-green-400">
                                        {log.importedBooks || 0}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-yellow-400">
                                        {log.skippedBooks || 0}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-red-400">
                                        {log.errorCount || 0}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-400">
                                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : '-'}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                                        <Link
                                            href={`/imports/${log.id}`}
                                            className="text-blue-400 hover:text-blue-300"
                                        >
                                            View Details
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {(!importLogs || importLogs.length === 0) && (
                                <tr>
                                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                                        No import history found. Drop XML files in the imports/incoming folder and click "Process Incoming Files".
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
