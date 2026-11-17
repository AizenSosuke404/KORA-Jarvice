import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [nom, setNom] = useState("");
  const [appli, setAppli] = useState<Contact["appli"]>("whatsapp");

  async function add() {
    const n = nom.trim();
    if (!n) return;
    try { await api("/api/contacts", { method: "POST", body: { nom: n, appli } }); }
    catch (e) { toast.error((e as Error).message); return; }
    setNom("");
    qc.invalidateQueries({ queryKey: ["contacts"] });
  }
  async function remove(c: Contact) {
    try { await api(`/api/contacts/${c.id}`, { method: "DELETE" }); }
    catch (e) { toast.error((e as Error).message); return; }
    qc.invalidateQueries({ queryKey: ["contacts"] });
  }

  async function setMode(c: Contact, mode: Contact["mode"]) {
    qc.setQueryData<Contact[]>(contactsQuery.queryKey, (old) => old?.map((x) => (x.id === c.id ? { ...x, mode } : x)));
    try { await api(`/api/contacts/${c.id}`, { method: "PATCH", body: { mode } }); }
    catch (e) { toast.error((e as Error).message); }
    qc.invalidateQueries({ queryKey: ["contacts"] });
  }

  return (
    <div className="animate-fade-up">
      <PageHeader title="Contacts" subtitle="Auto · Brouillon à valider · Jamais" />
      <p className="mb-3 text-xs text-muted-foreground">Les personnes qui t'écrivent apparaissent ici toutes seules, en mode Brouillon. Passe en Auto pour que Kora réponde sans te demander.</p>
      <div className="mb-5 flex gap-2">
        <Input placeholder="Ajouter un contact (nom tel qu'il s'affiche)" value={nom} onChange={(e) => setNom(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
        <select value={appli} onChange={(e) => setAppli(e.target.value as Contact["appli"])} className="h-9 rounded-md border border-input bg-transparent px-2 text-sm" aria-label="Application">
          <option value="whatsapp">WhatsApp</option>
          <option value="sms">SMS</option>
        </select>
        <Button onClick={add} className="shrink-0">Ajouter</Button>
      </div>
      {data.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Aucun contact pour l'instant.</p>}
      <ul className="space-y-3">
        {data.map((c) => (
          <li key={c.id} className="glass rounded-2xl p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-accent font-display font-bold text-accent-foreground">{c.nom[0]}</div>
              <div className="flex-1">
                <p className="font-semibold">{c.nom}</p>
                <AppBadge appli={c.appli} />
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove(c)} aria-label={`Supprimer ${c.nom}`}><X className="h-4 w-4 text-destructive" /></Button>
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
