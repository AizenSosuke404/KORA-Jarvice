import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/kora/PageHeader";
import { api } from "@/lib/api";
import { souvenirsQuery } from "@/lib/kora-data";
import type { Souvenir } from "@/lib/types";

export default function Memoire() {
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(souvenirsQuery);
  const [q, setQ] = useState("");
  const [nouveau, setNouveau] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["souvenirs"] });

  async function add() {
    if (!nouveau.trim()) return;
    try { await api("/api/souvenirs", { method: "POST", body: { contenu: nouveau.trim() } }); }
    catch (e) { toast.error((e as Error).message); return; }
    setNouveau(""); refresh();
  }

  const list = data.filter((s) => (s.contenu + s.categorie).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="animate-fade-up">
      <PageHeader title="Mémoire" subtitle={`${data.length} souvenirs`} />
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Rechercher" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="mb-5 flex gap-2">
        <Input placeholder="Nouveau souvenir…" value={nouveau} onChange={(e) => setNouveau(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button onClick={add} size="icon" aria-label="Ajouter"><Plus className="h-4 w-4" /></Button>
      </div>
      <ul className="space-y-2">
        {list.map((s) => <SouvenirItem key={s.id} s={s} onChange={refresh} />)}
      </ul>
    </div>
  );
}

function SouvenirItem({ s, onChange }: { s: Souvenir; onChange: () => void }) {
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(s.contenu);
  async function save() {
    try { await api(`/api/souvenirs/${s.id}`, { method: "PATCH", body: { contenu: v } }); }
    catch (e) { toast.error((e as Error).message); return; }
    setEdit(false); onChange();
  }
  async function del() {
    try { await api(`/api/souvenirs/${s.id}`, { method: "DELETE" }); }
    catch (e) { toast.error((e as Error).message); return; }
    toast.success("Souvenir oublié"); onChange();
  }
  return (
    <li className="glass flex items-center gap-2 rounded-2xl p-3">
      <div className="flex-1">
        {edit ? <Input value={v} onChange={(e) => setV(e.target.value)} autoFocus /> : <p className="text-sm">{s.contenu}</p>}
        <span className="text-[10px] uppercase tracking-widest text-primary">{s.categorie}</span>
      </div>
      {edit ? <Button size="icon" variant="ghost" onClick={save} aria-label="Enregistrer"><Check className="h-4 w-4" /></Button>
        : <Button size="icon" variant="ghost" onClick={() => setEdit(true)} aria-label="Modifier"><Pencil className="h-4 w-4" /></Button>}
      <Button size="icon" variant="ghost" onClick={del} aria-label="Supprimer"><Trash2 className="h-4 w-4 text-destructive" /></Button>
    </li>
  );
}
