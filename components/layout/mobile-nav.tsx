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
        <div className="fixed inset-0 z-50 bg-background lg:hidden">
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
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
                  "flex h-12 items-center gap-3 rounded-md border border-border px-3 text-sm font-medium text-muted-foreground",
                  pathname === item.href && "bg-foreground text-background"
                )}
                onClick={() => setIsOpen(false)}
              >
                <item.icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </>
  );
}
