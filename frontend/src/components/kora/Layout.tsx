import { Suspense, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BottomNav } from "@/components/kora/BottomNav";
import { ErrorBoundary } from "@/components/kora/ErrorBoundary";
import { applyTheme, reglagesQuery } from "@/lib/kora-data";

export function Layout() {
  const { pathname } = useLocation();
  const { data } = useQuery(reglagesQuery);
  useEffect(() => applyTheme(data?.theme), [data?.theme]);
  return (
    <div className="mx-auto min-h-screen max-w-md px-4 pb-32">
      <ErrorBoundary key={pathname}>
        <Suspense fallback={<p className="pt-16 text-center text-sm text-muted-foreground">Chargement…</p>}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
      <BottomNav />
    </div>
  );
}
