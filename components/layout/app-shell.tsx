"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  Database,
  PanelLeft,
  Search,
  Settings,
  Sparkles
} from "lucide-react";
import { MobileBottomNav, MobileNav } from "@/components/layout/mobile-nav";
import { ARCHIVE_YEAR_LABEL } from "@/lib/archive-window";
import { cn } from "@/lib/utils";

type NavigationItem = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  primary?: boolean;
  shortLabel?: string;
};

const navigation: NavigationItem[] = [
  { href: "/archive", label: "Historical Archive", shortLabel: "Archive", icon: Archive, primary: true },
  { href: "/price-finder", label: "Price Finder", shortLabel: "Prices", icon: Search, primary: true },
  { href: "/stylist", label: "AI Personal Stylist", shortLabel: "Stylist", icon: Sparkles, primary: true },
  { href: "/settings", label: "Settings", shortLabel: "Settings", icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentItem = navigation.find((item) => item.href === pathname) ?? navigation[0];

  return (
    <div className="min-h-screen bg-[#F6F0E6] text-neutral-950">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-[#D8CCBB] bg-white/85 px-5 py-6 backdrop-blur-xl lg:block">
        <div className="flex h-full flex-col">
          <Link href="/archive" className="flex items-center gap-3 border-b border-[#D8CCBB] pb-6">
            <div className="grid size-10 place-items-center rounded-sm border border-[#CDBFAE] bg-[#3A2A1E] text-[#FFF8EC] shadow-[0_18px_36px_-28px_rgba(89,63,43,0.45)]">
              <PanelLeft className="size-5" />
            </div>
            <div>
              <p className="text-sm font-light uppercase leading-none tracking-[0.25em]">
                PERSONAL STYLIST
              </p>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Fashion intelligence
              </p>
            </div>
          </Link>

          <nav className="mt-7 space-y-1.5">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex h-11 items-center gap-3 overflow-hidden rounded-sm border border-transparent px-3 text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500 transition-colors hover:border-[#D8CCBB] hover:bg-white/75 hover:text-neutral-950",
                  pathname === item.href &&
                    "border-[#BDAE9A] bg-[#EEE2D2] text-neutral-950 before:absolute before:left-0 before:top-2 before:h-7 before:w-px before:bg-[#7B5637] hover:border-[#AD9C87] hover:bg-[#E9DCCB] hover:text-neutral-950"
                )}
              >
                <item.icon className={cn("size-4", pathname === item.href && "text-[#7B5637]")} />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="mt-auto space-y-3">
            <div className="rounded-sm border border-[#D8CCBB] bg-white/70 p-4 shadow-sm backdrop-blur-xl">
              <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                <Database className="size-3.5" />
                Data Window
              </p>
              <p className="mt-3 text-2xl font-light leading-none tracking-[0.08em] text-neutral-950">
                {ARCHIVE_YEAR_LABEL}
              </p>
              <p className="mt-2 text-xs text-neutral-500">Local archive and context filters</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#D8CCBB] bg-[#F6F0E6]/92 px-4 backdrop-blur-xl md:px-8 lg:hidden">
          <Link href="/archive" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-sm bg-[#3A2A1E] text-[#FFF8EC]">
              <PanelLeft className="size-4" />
            </span>
            <span className="text-xs font-light uppercase tracking-[0.22em]">PERSONAL STYLIST</span>
          </Link>
          <MobileNav navigation={navigation} />
        </header>
        <header className="sticky top-0 z-30 hidden h-16 items-center justify-between border-b border-[#D8CCBB] bg-[#F6F0E6]/88 px-8 backdrop-blur-xl lg:flex xl:px-12">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-sm border border-[#D8CCBB] bg-white/70 shadow-sm">
              <currentItem.icon className="size-4 text-neutral-950" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase leading-none tracking-[0.18em] text-neutral-950">
                {currentItem.label}
              </p>
              <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Editorial workspace
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
            <span className="rounded-sm border border-[#D8CCBB] bg-white/70 px-3 py-1.5">
              {ARCHIVE_YEAR_LABEL}
            </span>
            <span className="rounded-sm border border-[#BDAE9A] bg-[#3A2A1E] px-3 py-1.5 text-[#FFF8EC]">
              Live
            </span>
          </div>
        </header>
        <main className="animate-fade-in px-4 pb-24 pt-6 md:px-8 md:pb-28 md:pt-8 lg:pb-10 lg:pt-8 xl:px-12">
          {children}
        </main>
        <MobileBottomNav navigation={navigation.filter((item) => item.primary)} />
      </div>
    </div>
  );
}
