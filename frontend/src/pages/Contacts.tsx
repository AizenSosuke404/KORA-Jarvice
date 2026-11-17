import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/kora/PageHeader";
import { AppBadge } from "@/components/kora/AppBadge";
import { api } from "@/lib/api";
import { contactsQuery } from "@/lib/kora-data";
import type { Contact } from "@/lib/types";
import { cn } from "@/lib/utils";

const modes: { v: Contact["mode"]; label: string }[] = [
  { v: "auto", label: "Auto" },
  { v: "brouillon", label: "Brouillon" },
  { v: "jamais", label: "Jamais" },
];

export default function Contacts() {
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(contactsQuery);

  async function setMode(c: Contact, mode: Contact["mode"]) {
    qc.setQueryData<Contact[]>(contactsQuery.queryKey, (old) => old?.map((x) => (x.id === c.id ? { ...x, mode } : x)));
    try { await api(`/api/contacts/${c.id}`, { method: "PATCH", body: { mode } }); }
    catch (e) { toast.error((e as Error).message); }
    qc.invalidateQueries({ queryKey: ["contacts"] });
  }

  return (
    <div className="animate-fade-up">
      <PageHeader title="Contacts" subtitle="Auto · Brouillon à valider · Jamais" />
      <ul className="space-y-3">
        {data.map((c) => (
          <li key={c.id} className="glass rounded-2xl p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-accent font-display font-bold text-accent-foreground">{c.nom[0]}</div>
              <div className="flex-1">
                <p className="font-semibold">{c.nom}</p>
                <AppBadge appli={c.appli} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1" role="radiogroup" aria-label={`Mode pour ${c.nom}`}>
              {modes.map((m) => (
                <button key={m.v} role="radio" aria-checked={c.mode === m.v} onClick={() => setMode(c, m.v)}
                  className={cn("rounded-lg py-1.5 text-xs font-semibold transition-all",
                    c.mode === m.v ? (m.v === "jamais" ? "bg-destructive text-destructive-foreground" : "bg-gradient-primary text-primary-foreground shadow-glow") : "text-muted-foreground")}>
                  {m.label}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
