"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar() {
    const pathname = usePathname();

    const navItems = [
        { href: "/", label: "Events", icon: "📅" },
        { href: "/books", label: "Books", icon: "📚" },
        { href: "/content", label: "Content", icon: "📝" },
    ];

    return (
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-gray-800 bg-gray-950">
            <div className="flex h-full flex-col">
                {/* Logo/Brand */}
                <div className="border-b border-gray-800 p-6">
                    <h1 className="text-xl font-bold text-white">Another Read</h1>
                    <p className="mt-1 text-sm text-gray-400">Dashboard</p>
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-1 p-4">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${isActive
                                    ? "bg-gray-800 text-white"
                                    : "text-gray-400 hover:bg-gray-900 hover:text-white"
                                    }`}
                            >
                                <span className="text-lg">{item.icon}</span>
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="border-t border-gray-800 p-4">
                    <p className="text-xs text-gray-500">
                        Built with{" "}
                        <span className="font-semibold text-gray-400">T3 Stack</span>
                    </p>
                </div>
            </div>
        </aside>
    );
}
