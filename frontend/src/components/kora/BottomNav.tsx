import { NavLink } from "react-router-dom";
import { Home, Users, Brain, Settings, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/accueil", label: "Accueil", Icon: Home },
  { to: "/contacts", label: "Contacts", Icon: Users },
  { to: "/chat", label: "Kora", Icon: MessageCircle },
  { to: "/memoire", label: "Mémoire", Icon: Brain },
  { to: "/reglages", label: "Réglages", Icon: Settings },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background">
      <div className="mx-auto flex max-w-md px-2 pb-2 pt-1">
        {tabs.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => cn("flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium transition-colors", isActive ? "text-primary" : "text-muted-foreground")}>
            {({ isActive }) => (
              <>
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 1.8} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
