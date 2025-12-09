"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

type UserStatus = "Active" | "Closed" | "Pending";
type UserTier = "Admin" | "Marketer" | "User";

interface EditingUser {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    userTier: UserTier;
    status: UserStatus;
    creditQuota: number;
    password?: string;
}

export default function UserManagementPage() {
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingUser, setEditingUser] = useState<EditingUser | null>(null);
    const [newUser, setNewUser] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        userTier: "User" as UserTier,
        status: "Active" as UserStatus,
        creditQuota: 0,
    });

    const utils = api.useUtils();
    const { data: users, isLoading } = api.admin.getAllUsers.useQuery();

    const addUserMutation = api.admin.addUser.useMutation({
        onSuccess: () => {
            void utils.admin.getAllUsers.invalidate();
            setShowAddModal(false);
            setNewUser({
                firstName: "",
                lastName: "",
                email: "",
                password: "",
                userTier: "User",
                status: "Active",
                creditQuota: 0,
            });
        },
    });

    const updateUserMutation = api.admin.updateUser.useMutation({
        onSuccess: () => {
            void utils.admin.getAllUsers.invalidate();
            setEditingUser(null);
        },
    });

    const deleteUserMutation = api.admin.deleteUser.useMutation({
        onSuccess: () => {
            void utils.admin.getAllUsers.invalidate();
        },
    });

    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        addUserMutation.mutate(newUser);
    };

    const handleUpdateUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        const updateData: {
            userId: number;
            firstName?: string;
            lastName?: string;
            email?: string;
            userTier?: UserTier;
            status?: UserStatus;
            creditQuota?: number;
            password?: string;
        } = {
            userId: editingUser.id,
            firstName: editingUser.firstName,
            lastName: editingUser.lastName,
            email: editingUser.email,
            userTier: editingUser.userTier,
            status: editingUser.status,
            creditQuota: editingUser.creditQuota,
        };

        if (editingUser.password) {
            updateData.password = editingUser.password;
        }

        updateUserMutation.mutate(updateData);
    };

    const handleDeleteUser = (userId: number) => {
        if (confirm("Are you sure you want to delete this user?")) {
            deleteUserMutation.mutate({ userId });
        }
    };

    const getStatusBadgeColor = (status: string) => {
        switch (status) {
            case "Active":
                return "bg-green-500/20 text-green-400 border-green-500/30";
            case "Pending":
                return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
            case "Closed":
                return "bg-red-500/20 text-red-400 border-red-500/30";
            default:
                return "bg-gray-500/20 text-gray-400 border-gray-500/30";
        }
    };

    const getTierBadgeColor = (tier: string) => {
        switch (tier) {
            case "Admin":
                return "bg-purple-500/20 text-purple-400 border-purple-500/30";
            case "Marketer":
                return "bg-blue-500/20 text-blue-400 border-blue-500/30";
            case "User":
                return "bg-gray-500/20 text-gray-400 border-gray-500/30";
            default:
                return "bg-gray-500/20 text-gray-400 border-gray-500/30";
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-gray-400">Loading...</div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gray-950 px-8 py-12">
            <div className="mx-auto max-w-7xl">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="mb-2 text-4xl font-bold text-white">
                            User Management
                        </h1>
                        <p className="text-gray-400">
                            Manage user accounts, roles, and permissions
                        </p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3 font-semibold text-white transition-all hover:from-blue-500 hover:to-blue-400"
                    >
                        + Add User
                    </button>
                </div>

                {/* Users Table */}
                <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
                    <table className="w-full">
                        <thead className="border-b border-gray-800 bg-gray-900">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                                    Name
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                                    Email
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                                    Tier
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                                    Status
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                                    Credits
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                                    Created
                                </th>
                                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {users?.map((user) => (
                                <tr
                                    key={user.id}
                                    className="transition-colors hover:bg-gray-800/50"
                                >
                                    <td className="px-6 py-4 text-white">
                                        {user.firstName} {user.lastName}
                                    </td>
                                    <td className="px-6 py-4 text-gray-400">{user.email}</td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${getTierBadgeColor(user.userTier)}`}
                                        >
                                            {user.userTier}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadgeColor(user.status)}`}
                                        >
                                            {user.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-400">
                                        <div className="text-sm">
                                            <div className="font-medium text-white">
                                                {user.creditsRemaining?.toLocaleString() ?? 0} / {user.creditQuota?.toLocaleString() ?? 0}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                Used: {user.creditsUsed?.toLocaleString() ?? 0}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-400">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() =>
                                                setEditingUser({
                                                    id: user.id,
                                                    firstName: user.firstName,
                                                    lastName: user.lastName,
                                                    email: user.email,
                                                    userTier: user.userTier as UserTier,
                                                    status: user.status as UserStatus,
                                                    creditQuota: user.creditQuota ?? 0,
                                                })
                                            }
                                            className="mr-2 text-blue-400 transition-colors hover:text-blue-300"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(user.id)}
                                            className="text-red-400 transition-colors hover:text-red-300"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {users?.length === 0 && (
                        <div className="py-12 text-center text-gray-400">
                            No users found. Add your first user to get started.
                        </div>
                    )}
                </div>
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8">
                        <h2 className="mb-6 text-2xl font-bold text-white">Add New User</h2>
                        <form onSubmit={handleAddUser} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-300">
                                        First Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newUser.firstName}
                                        onChange={(e) =>
                                            setNewUser({ ...newUser, firstName: e.target.value })
                                        }
                                        required
                                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-300">
                                        Last Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newUser.lastName}
                                        onChange={(e) =>
                                            setNewUser({ ...newUser, lastName: e.target.value })
                                        }
                                        required
                                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-300">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={newUser.email}
                                    onChange={(e) =>
                                        setNewUser({ ...newUser, email: e.target.value })
                                    }
                                    required
                                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-300">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={newUser.password}
                                    onChange={(e) =>
                                        setNewUser({ ...newUser, password: e.target.value })
                                    }
                                    required
                                    minLength={8}
                                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-300">
                                    User Tier
                                </label>
                                <select
                                    value={newUser.userTier}
                                    onChange={(e) =>
                                        setNewUser({
                                            ...newUser,
                                            userTier: e.target.value as UserTier,
                                        })
                                    }
                                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                                >
                                    <option value="User">User</option>
                                    <option value="Marketer">Marketer</option>
                                    <option value="Admin">Admin</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-300">
                                    Status
                                </label>
                                <select
                                    value={newUser.status}
                                    onChange={(e) =>
                                        setNewUser({
                                            ...newUser,
                                            status: e.target.value as UserStatus,
                                        })
                                    }
                                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                                >
                                    <option value="Active">Active</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Closed">Closed</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-300">
                                    Credit Quota
                                </label>
                                <input
                                    type="number"
                                    value={newUser.creditQuota}
                                    onChange={(e) =>
                                        setNewUser({ ...newUser, creditQuota: parseInt(e.target.value) || 0 })
                                    }
                                    min="0"
                                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                                />
                                <p className="mt-1 text-xs text-gray-400">
                                    Total credits allocated to this user (1 credit ≈ 1000 tokens)
                                </p>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="submit"
                                    disabled={addUserMutation.isPending}
                                    className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2 font-semibold text-white transition-all hover:from-blue-500 hover:to-blue-400 disabled:opacity-50"
                                >
                                    {addUserMutation.isPending ? "Adding..." : "Add User"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 rounded-lg border border-gray-700 px-4 py-2 font-semibold text-gray-300 transition-colors hover:bg-gray-800"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8">
                        <h2 className="mb-6 text-2xl font-bold text-white">Edit User</h2>
                        <form onSubmit={handleUpdateUser} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-300">
                                        First Name
                                    </label>
                                    <input
                                        type="text"
                                        value={editingUser.firstName}
                                        onChange={(e) =>
                                            setEditingUser({
                                                ...editingUser,
                                                firstName: e.target.value,
                                            })
                                        }
                                        required
                                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-300">
                                        Last Name
                                    </label>
                                    <input
                                        type="text"
                                        value={editingUser.lastName}
                                        onChange={(e) =>
                                            setEditingUser({
                                                ...editingUser,
                                                lastName: e.target.value,
                                            })
                                        }
                                        required
                                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-300">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={editingUser.email}
                                    onChange={(e) =>
                                        setEditingUser({ ...editingUser, email: e.target.value })
                                    }
                                    required
                                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-300">
                                    New Password (leave blank to keep current)
                                </label>
                                <input
                                    type="password"
                                    value={editingUser.password || ""}
                                    onChange={(e) =>
                                        setEditingUser({ ...editingUser, password: e.target.value })
                                    }
                                    minLength={8}
                                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-300">
                                    User Tier
                                </label>
                                <select
                                    value={editingUser.userTier}
                                    onChange={(e) =>
                                        setEditingUser({
                                            ...editingUser,
                                            userTier: e.target.value as UserTier,
                                        })
                                    }
                                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                                >
                                    <option value="User">User</option>
                                    <option value="Marketer">Marketer</option>
                                    <option value="Admin">Admin</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-300">
                                    Status
                                </label>
                                <select
                                    value={editingUser.status}
                                    onChange={(e) =>
                                        setEditingUser({
                                            ...editingUser,
                                            status: e.target.value as UserStatus,
                                        })
                                    }
                                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                                >
                                    <option value="Active">Active</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Closed">Closed</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-300">
                                    Credit Quota
                                </label>
                                <input
                                    type="number"
                                    value={editingUser.creditQuota}
                                    onChange={(e) =>
                                        setEditingUser({ ...editingUser, creditQuota: parseInt(e.target.value) || 0 })
                                    }
                                    min="0"
                                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                                />
                                <p className="mt-1 text-xs text-gray-400">
                                    Total credits allocated to this user (1 credit ≈ 1000 tokens)
                                </p>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="submit"
                                    disabled={updateUserMutation.isPending}
                                    className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2 font-semibold text-white transition-all hover:from-blue-500 hover:to-blue-400 disabled:opacity-50"
                                >
                                    {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingUser(null)}
                                    className="flex-1 rounded-lg border border-gray-700 px-4 py-2 font-semibold text-gray-300 transition-colors hover:bg-gray-800"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}
