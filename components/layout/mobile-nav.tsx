"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavigationItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function MobileNav({ navigation }: { navigation: NavigationItem[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        className="inline-flex size-11 touch-manipulation items-center justify-center rounded-md border border-border bg-background text-foreground shadow-[0_10px_28px_-24px_hsl(var(--foreground)/0.45)] transition-colors active:bg-muted"
        aria-label="Open navigation"
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
        onClick={() => setIsOpen(true)}
      >
        <Menu className="size-5" />
      </button>

      {isOpen ? (
        <div id="mobile-navigation" className="fixed inset-0 z-[100] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/25 backdrop-blur-sm"
            aria-label="Close navigation"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col border-l border-border bg-background shadow-[0_24px_80px_-40px_hsl(var(--foreground)/0.55)]">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/80 px-4">
              <span className="font-semibold">Navigation</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Close navigation"
                onClick={() => setIsOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
            <nav className="grid gap-2 overflow-y-auto p-4">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "relative flex min-h-14 touch-manipulation items-center gap-3 overflow-hidden rounded-md border border-border bg-background px-4 text-sm font-semibold text-muted-foreground shadow-sm transition-colors active:bg-muted",
                    pathname === item.href &&
                      "border-accent/45 bg-accent/10 text-foreground before:absolute before:left-0 before:top-3 before:h-8 before:w-1 before:rounded-r-full before:bg-accent"
                  )}
                >
                  <item.icon className={cn("size-5", pathname === item.href && "text-accent")} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function MobileBottomNav({ navigation }: { navigation: NavigationItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-18px_48px_-38px_hsl(var(--foreground)/0.5)] backdrop-blur-xl lg:hidden"
      aria-label="Primary mobile navigation"
    >
      <div
        className="grid h-16 gap-1"
        style={{ gridTemplateColumns: `repeat(${navigation.length}, minmax(0, 1fr))` }}
      >
        {navigation.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-0 touch-manipulation flex-col items-center justify-center gap-1 rounded-md px-1 text-[10px] font-semibold leading-tight text-muted-foreground transition-colors active:bg-muted",
                isActive && "bg-accent/10 text-foreground"
              )}
            >
              <item.icon className={cn("size-5 shrink-0", isActive && "text-accent")} />
              <span className="max-w-full truncate">{item.shortLabel ?? item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
