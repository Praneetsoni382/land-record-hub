import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FilePlus2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

async function loadStats() {
  const [cases, documents, awaiting] = await Promise.all([
    supabase.from("cases").select("id", { count: "exact", head: true }).eq("is_demo", false),
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("is_demo", false),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("is_demo", false)
      .eq("processing_status", "UPLOADED"),
  ]);

  const failure = cases.error ?? documents.error ?? awaiting.error;
  if (failure) throw new Error("Could not load your dashboard figures.");

  return {
    cases: cases.count ?? 0,
    documents: documents.count ?? 0,
    awaiting: awaiting.count ?? 0,
  };
}

function DashboardPage() {
  const { user } = Route.useRouteContext();
  const { data, isLoading, error } = useQuery({ queryKey: ["dashboard-stats"], queryFn: loadStats });

  const tiles = [
    { label: "Total Cases", value: data?.cases },
    { label: "Documents Uploaded", value: data?.documents },
    { label: "Documents Awaiting Processing", value: data?.awaiting },
  ];

  return (
    <AppShell title="Home" officer={user.email ?? "Officer"}>
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Land acquisition case overview for your account.
        </p>
        <Button asChild size="sm">
          <Link to="/cases/new">
            <FilePlus2 className="mr-2 h-4 w-4" />
            New Case
          </Link>
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {tiles.map((tile) => (
            <Card key={tile.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {tile.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{isLoading ? "—" : (tile.value ?? 0)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
