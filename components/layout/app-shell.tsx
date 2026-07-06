"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  BarChart3,
  PanelLeft,
  Search,
  Settings,
  Sparkles
} from "lucide-react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ARCHIVE_YEAR_LABEL } from "@/lib/archive-window";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/archive", label: "Historical Archive", icon: Archive },
  { href: "/forecasting", label: "Trend Forecasting", icon: BarChart3 },
  { href: "/price-finder", label: "Price Finder", icon: Search },
  { href: "/stylist", label: "AI Personal Stylist", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-border bg-background px-5 py-6 lg:block">
        <div className="flex h-full flex-col">
          <Link href="/archive" className="flex items-center gap-3 border-b border-border pb-6">
            <div className="grid size-10 place-items-center border border-foreground">
              <PanelLeft className="size-5" />
            </div>
            <div>
              <p className="text-base font-semibold">Atelier Signal</p>
              <p className="text-sm text-muted-foreground">Forecast archive</p>
            </div>
          </Link>

          <nav className="mt-8 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-md border border-transparent px-3 text-sm font-medium text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground",
                  pathname === item.href &&
                    "border-border bg-foreground text-background shadow-sm hover:bg-foreground hover:text-background"
                )}
              >
                <item.icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="mt-auto border-t border-border pt-5">
            <p className="text-xs text-muted-foreground">Data Window</p>
            <p className="mt-2 text-2xl font-semibold">{ARCHIVE_YEAR_LABEL}</p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:px-8 lg:hidden">
          <Link href="/archive" className="text-base font-semibold">
            Atelier Signal
          </Link>
          <MobileNav navigation={navigation} />
        </header>
        <main className="px-4 py-6 md:px-8 md:py-8 xl:px-12">{children}</main>
      </div>
    </div>
  );
}
