import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/kora/PageHeader";
import { api } from "@/lib/api";
import { souvenirsQuery } from "@/lib/kora-data";
import type { Souvenir } from "@/lib/types";

export default function Memoire() {
  const qc = useQueryClient();
  // useQuery (et non Suspense) : la page s'affiche toujours, avec un message clair en cas de problème.
  const { data, isPending, error, refetch } = useQuery(souvenirsQuery);
  const [q, setQ] = useState("");
  const [nouveau, setNouveau] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["souvenirs"] });

  async function add() {
    const contenu = nouveau.trim();
    if (!contenu) return;
    try { await api("/api/souvenirs", { method: "POST", body: { contenu } }); }
    catch (e) { toast.error((e as Error).message); return; }
    setNouveau("");
    refresh();
  }

  const souvenirs: Souvenir[] = Array.isArray(data) ? data : [];
  const needle = q.trim().toLowerCase();
  const list = souvenirs.filter((s) => !needle || `${s.contenu} ${s.categorie ?? ""}`.toLowerCase().includes(needle));

  const byCat: Record<string, Souvenir[]> = {};
  for (const s of list) { const k = s.categorie || "autre"; (byCat[k] = byCat[k] ?? []).push(s); }
  const groups = Object.entries(byCat);

  return (
    <div className="animate-fade-up">
      <PageHeader title="Mémoire" subtitle={`${souvenirs.length} souvenir${souvenirs.length > 1 ? "s" : ""} · ce que Kora sait de toi`} />
      <div className="mb-3">
        <Input placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="mb-5 flex gap-2">
        <Input placeholder="Nouveau souvenir (ex. : je m'appelle Kali, j'habite Abidjan)" value={nouveau} onChange={(e) => setNouveau(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
        <Button onClick={add} className="shrink-0">Ajouter</Button>
      </div>

      {isPending && <p className="py-8 text-center text-sm text-muted-foreground">Chargement…</p>}
      {error && (
        <div className="glass space-y-3 rounded-2xl p-4 text-center">
          <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
          <Button onClick={() => refetch()}>Réessayer</Button>
        </div>
      )}
      {!isPending && !error && list.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {souvenirs.length === 0 ? "Aucun souvenir pour l'instant. Ajoute ce que Kora doit savoir sur toi." : "Aucun résultat."}
        </p>
      )}
      {groups.map(([cat, items]) => (
        <section key={cat} className="mb-5">
          <h2 className="mb-2 text-sm font-semibold capitalize text-muted-foreground">{cat}</h2>
          <ul className="space-y-2">{items.map((s) => <SouvenirItem key={s.id} s={s} onChange={refresh} />)}</ul>
        </section>
      ))}
    </div>
  );
}

function SouvenirItem({ s, onChange }: { s: Souvenir; onChange: () => void }) {
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(s.contenu);
  async function save() {
    try { await api(`/api/souvenirs/${s.id}`, { method: "PATCH", body: { contenu: v } }); }
    catch (e) { toast.error((e as Error).message); return; }
    setEdit(false);
    onChange();
  }
  async function del() {
    try { await api(`/api/souvenirs/${s.id}`, { method: "DELETE" }); }
    catch (e) { toast.error((e as Error).message); return; }
    toast.success("Souvenir oublié");
    onChange();
  }
  return (
    <li className="glass flex items-center gap-2 rounded-2xl p-3">
      <div className="flex-1">
        {edit ? <Input value={v} onChange={(e) => setV(e.target.value)} autoFocus /> : <p className="text-sm">{s.contenu}</p>}
      </div>
      {edit
        ? <Button size="icon" variant="ghost" onClick={save} aria-label="Enregistrer"><Check className="h-4 w-4" /></Button>
        : <Button size="icon" variant="ghost" onClick={() => setEdit(true)} aria-label="Modifier"><Pencil className="h-4 w-4" /></Button>}
      <Button size="icon" variant="ghost" onClick={del} aria-label="Supprimer"><X className="h-4 w-4 text-destructive" /></Button>
    </li>
  );
}
