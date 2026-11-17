import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { Layout } from "@/components/kora/Layout";
import { getToken } from "@/lib/api";
import Accueil from "@/pages/Accueil";
import Auth from "@/pages/Auth";
import Chat from "@/pages/Chat";
import Contacts from "@/pages/Contacts";
import Memoire from "@/pages/Memoire";
import Reglages from "@/pages/Reglages";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false } },
});

function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-5xl font-bold text-gradient">404</h1>
      <p className="text-sm text-muted-foreground">Cette page n'existe pas.</p>
      <Link to="/accueil" className="text-sm font-semibold text-primary">Retour à l'accueil</Link>
    </main>
  );
}

// useLocation() force ces gardes à se réévaluer à chaque navigation (ex. juste après la connexion).
function RequireAuth() {
  useLocation();
  return getToken() ? <Layout /> : <Navigate to="/auth" replace />;
}
function PublicOnly() {
  useLocation();
  return getToken() ? <Navigate to="/accueil" replace /> : <Auth />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/accueil" replace />} />
          <Route path="/auth" element={<PublicOnly />} />
          <Route element={<RequireAuth />}>
            <Route path="/accueil" element={<Accueil />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/memoire" element={<Memoire />} />
            <Route path="/reglages" element={<Reglages />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
