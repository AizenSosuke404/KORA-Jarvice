import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KoraOrb } from "@/components/kora/KoraOrb";
import { api, setToken } from "@/lib/api";
import { syncNative } from "@/lib/native";

export default function AuthPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: status } = useQuery({ queryKey: ["auth-status"], queryFn: () => api<{ needsSetup: boolean }>("/api/auth/status"), retry: 3 });
  const setup = !!status?.needsSetup;
  const [mode, setMode] = useState<"login" | "register">("login");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [loading, setLoading] = useState(false);

  const register = !setup && mode === "register";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const path = setup ? "/api/auth/setup" : register ? "/api/auth/register" : "/api/auth/login";
      const body = setup ? { nom, email, password, setupCode } : register ? { nom, email, password, code } : { email, password };
      const { token } = await api<{ token: string }>(path, { method: "POST", body });
      setToken(token);
      syncNative();
      qc.clear();
      navigate("/accueil", { replace: true });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-8 px-6">
      <KoraOrb state="ecoute" size={160} />
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gradient">Kora</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {setup ? "Première activation · crée le compte propriétaire" : "Ton assistant personnel · bêta privée"}
        </p>
      </div>
      <form onSubmit={submit} className="glass w-full space-y-3 rounded-2xl p-4">
        {setup && <Input placeholder="Code d'activation (SETUP_CODE)" value={setupCode} onChange={(e) => setSetupCode(e.target.value)} required autoComplete="off" />}
        {register && <Input placeholder="Code d'invitation" value={code} onChange={(e) => setCode(e.target.value)} required autoComplete="off" />}
        {(setup || register) && <Input placeholder="Ton prénom" value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="given-name" />}
        <Input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <Input type="password" placeholder="Mot de passe (8 caractères minimum)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={setup || register ? 8 : undefined} autoComplete={setup || register ? "new-password" : "current-password"} />
        <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground" disabled={loading}>
          {loading ? "Patiente…" : setup ? "Créer le compte propriétaire" : register ? "Créer mon compte" : "Se connecter"}
        </Button>
        {!setup && (
          <Button type="button" variant="ghost" className="w-full" onClick={() => setMode(register ? "login" : "register")}>
            {register ? "J'ai déjà un compte" : "J'ai un code d'invitation"}
          </Button>
        )}
        <p className="text-center text-xs text-muted-foreground">Accès uniquement sur invitation.</p>
      </form>
    </main>
  );
}
