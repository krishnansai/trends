"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavigationItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function MobileNav({ navigation }: { navigation: NavigationItem[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Open navigation"
        onClick={() => setIsOpen(true)}
      >
        <Menu className="size-4" />
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl lg:hidden">
          <div className="flex h-16 items-center justify-between border-b border-border/80 px-4 shadow-[0_16px_40px_-36px_hsl(var(--foreground)/0.55)]">
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
          <nav className="space-y-1 p-4">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex h-12 items-center gap-3 overflow-hidden rounded-md border border-border bg-background/70 px-3 text-sm font-medium text-muted-foreground shadow-sm transition-[background-color,border-color,color,transform] hover:-translate-y-0.5 hover:border-accent/35 hover:bg-muted/70 hover:text-foreground",
                  pathname === item.href &&
                    "border-accent/40 bg-accent/10 text-foreground before:absolute before:left-0 before:top-2 before:h-8 before:w-1 before:rounded-r-full before:bg-accent"
                )}
                onClick={() => setIsOpen(false)}
              >
                <item.icon className={cn("size-4", pathname === item.href && "text-accent")} />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </>
  );
}
