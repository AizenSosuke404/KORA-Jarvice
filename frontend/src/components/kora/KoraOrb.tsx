import { cn } from "@/lib/utils";

export type KoraState = "ecoute" | "reflechit" | "repond" | "off";

const labels: Record<KoraState, string> = {
  ecoute: "À l'écoute",
  reflechit: "Réfléchit…",
  repond: "Répond",
  off: "En veille",
};

/** Symbole animé de Kora selon son état. */
export function KoraOrb({ state, size = 180 }: { state: KoraState; size?: number }) {
  const active = state !== "off";
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative grid place-items-center" style={{ width: size, height: size }}>
        {state === "ecoute" && (
          <>
            <span className="absolute inset-6 rounded-full border border-primary/40 animate-kora-ripple" />
            <span className="absolute inset-6 rounded-full border border-primary/30 animate-kora-ripple [animation-delay:1s]" />
          </>
        )}
        <div className={cn("absolute inset-8 rounded-full transition-all duration-700", active ? "bg-primary/10 shadow-glow" : "bg-muted/40")} />
        <svg viewBox="0 0 256 256" className={cn("relative h-3/5 w-3/5 transition-opacity", !active && "opacity-40", state === "repond" && "animate-kora-pulse")}>
          <g className={cn(state === "reflechit" && "animate-kora-spin")}>
            <path d="M191.8 122.4A64 64 0 1 1 155 70" fill="none" className="stroke-primary" strokeWidth="22" strokeLinecap="round" />
            <circle cx="180.4" cy="91.3" r="9" className={cn("fill-primary", state === "repond" && "animate-kora-blink")} />
          </g>
          <circle cx="128" cy="128" r="20" className="fill-logo-core" />
        </svg>
      </div>
      <span className={cn("font-display text-sm tracking-widest uppercase", active ? "text-primary" : "text-muted-foreground")}>{labels[state]}</span>
    </div>
  );
}
