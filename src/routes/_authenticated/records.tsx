import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/records")({
  component: RecordsPage,
});

async function loadVerifiedRecords() {
  const { data, error } = await supabase
    .from("verified_land_records")
    .select(
      "id, land_record_id, owner_name, survey_number, khasra_number, village, district, verification_status, integrity_score",
    )
    .eq("is_demo", false)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Could not load verified records.");
  return data ?? [];
}

function RecordsPage() {
  const { user } = Route.useRouteContext();
  const { data, isLoading, error } = useQuery({
    queryKey: ["verified-records"],
    queryFn: loadVerifiedRecords,
  });

  return (
    <AppShell title="Records" officer={user.email ?? "Officer"}>
      <p className="mb-6 text-sm text-muted-foreground">
        Land records finalised after verification.
      </p>

      {error ? (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading records…</p>
      ) : data && data.length > 0 ? (
        <div className="rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Record ID</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Survey</TableHead>
                <TableHead>Khasra</TableHead>
                <TableHead>Village</TableHead>
                <TableHead>District</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.land_record_id}</TableCell>
                  <TableCell>{row.owner_name ?? "—"}</TableCell>
                  <TableCell>{row.survey_number ?? "—"}</TableCell>
                  <TableCell>{row.khasra_number ?? "—"}</TableCell>
                  <TableCell>{row.village ?? "—"}</TableCell>
                  <TableCell>{row.district ?? "—"}</TableCell>
                  <TableCell>{row.verification_status ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No verified land records yet.</p>
      )}
    </AppShell>
  );
}
