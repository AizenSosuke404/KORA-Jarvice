import { MessageCircle, MessageSquare } from "lucide-react";
import type { AppSource } from "@/lib/types";

export function AppBadge({ appli }: { appli: AppSource }) {
  const W = appli === "whatsapp";
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
      {W ? <MessageCircle className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
      {W ? "WhatsApp" : "SMS"}
    </span>
  );
}
