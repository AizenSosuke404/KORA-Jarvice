import { NavLink } from "react-router-dom";
import { Home, Users, Brain, Settings } from "lucide-react";
import { KoraLogo } from "./KoraLogo";
import { cn } from "@/lib/utils";

const item = "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground transition-colors";
const cls = ({ isActive }: { isActive: boolean }) => cn(item, isActive && "text-primary");

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-3 pb-3">
      <div className="glass relative flex items-end rounded-3xl px-2 shadow-lg">
        <NavLink to="/accueil" className={cls}><Home className="h-5 w-5" />Accueil</NavLink>
        <NavLink to="/contacts" className={cls}><Users className="h-5 w-5" />Contacts</NavLink>
        <div className="flex flex-1 justify-center">
          <NavLink
            to="/chat"
            aria-label="Parler à Kora"
            className={({ isActive }) => cn("-mt-7 grid h-16 w-16 place-items-center rounded-full bg-background ring-2 shadow-glow transition-transform active:scale-95", isActive ? "ring-primary" : "ring-primary/60")}
          >
            <KoraLogo className="h-10 w-10" />
          </NavLink>
        </div>
        <NavLink to="/memoire" className={cls}><Brain className="h-5 w-5" />Mémoire</NavLink>
        <NavLink to="/reglages" className={cls}><Settings className="h-5 w-5" />Réglages</NavLink>
      </div>
    </nav>
  );
}
