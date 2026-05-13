"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Search } from "lucide-react";

const ITEMS = [
  { href: "/", label: "Ads", icon: BarChart3, prefix: "/accounts" },
  { href: "/organic", label: "Orgánico", icon: Search, prefix: "/organic" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          pathname.startsWith(item.prefix) ||
          (item.href === "/" && pathname === "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition ${
              isActive
                ? "bg-accent/10 text-accent"
                : "text-muted hover:text-text hover:bg-bg"
            }`}
          >
            <Icon className="w-4 h-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
