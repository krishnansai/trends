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
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-border/80 bg-background/80 px-5 py-6 shadow-[24px_0_70px_-60px_hsl(var(--foreground)/0.55)] backdrop-blur-xl lg:block">
        <div className="flex h-full flex-col">
          <Link href="/archive" className="flex items-center gap-3 border-b border-border/80 pb-6">
            <div className="grid size-10 place-items-center rounded-md border border-accent/25 bg-accent text-accent-foreground shadow-[0_16px_36px_-26px_hsl(var(--accent)/0.9)]">
              <PanelLeft className="size-5" />
            </div>
            <div>
              <p className="text-base font-semibold leading-none">Atelier Signal</p>
              <p className="mt-1 text-sm text-muted-foreground">Premium forecast suite</p>
            </div>
          </Link>

          <nav className="mt-8 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex h-11 items-center gap-3 overflow-hidden rounded-md border border-transparent px-3 text-sm font-medium text-muted-foreground transition-[background-color,border-color,color,box-shadow,transform] hover:-translate-y-0.5 hover:border-border hover:bg-muted/70 hover:text-foreground",
                  pathname === item.href &&
                    "border-accent/35 bg-accent/10 text-foreground shadow-[0_14px_32px_-28px_hsl(var(--accent)/0.95)] before:absolute before:left-0 before:top-2 before:h-7 before:w-1 before:rounded-r-full before:bg-accent hover:border-accent/45 hover:bg-accent/15 hover:text-foreground"
                )}
              >
                <item.icon className={cn("size-4", pathname === item.href && "text-accent")} />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="mt-auto rounded-md border border-border bg-background/80 p-4 shadow-[0_16px_40px_-34px_hsl(var(--foreground)/0.5)]">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Data Window</p>
            <p className="mt-2 text-2xl font-semibold leading-none">{ARCHIVE_YEAR_LABEL}</p>
            <p className="mt-2 text-xs text-muted-foreground">Local archive and context filters</p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/80 bg-background/95 px-4 shadow-[0_16px_40px_-36px_hsl(var(--foreground)/0.55)] backdrop-blur-xl md:px-8 lg:hidden">
          <Link href="/archive" className="flex items-center gap-2 text-base font-semibold">
            <span className="grid size-8 place-items-center rounded-md bg-accent text-accent-foreground">
              <PanelLeft className="size-4" />
            </span>
            <span>Atelier Signal</span>
          </Link>
          <MobileNav navigation={navigation} />
        </header>
        <main className="px-4 py-6 md:px-8 md:py-8 xl:px-12">{children}</main>
      </div>
    </div>
  );
}
