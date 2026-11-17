import { cn } from "@/lib/utils";

export function KoraLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 256 256" className={cn("h-8 w-8", className)} aria-label="Kora">
      <path d="M191.8 122.4A64 64 0 1 1 155 70" fill="none" className="stroke-primary" strokeWidth="22" strokeLinecap="round" />
      <circle cx="128" cy="128" r="20" className="fill-logo-core" />
      <circle cx="180.4" cy="91.3" r="9" className="fill-primary" />
    </svg>
  );
}
