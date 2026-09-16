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

export const Route = createFileRoute("/_authenticated/audit")({
  component: AuditPage,
});

async function loadAudit() {
  const { data, error } = await supabase
    .from("audit_logs")
    .select(
      "id, action, description, created_at, cases!inner(case_id, is_demo), documents(file_name, serial_number)",
    )
    .eq("cases.is_demo", false)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw new Error("Could not load audit activity.");
  return data ?? [];
}

function AuditPage() {
  const { user } = Route.useRouteContext();
  const { data, isLoading, error } = useQuery({ queryKey: ["audit"], queryFn: loadAudit });

  return (
    <AppShell title="Audit Trail" officer={user.email ?? "Officer"}>
      <p className="mb-6 text-sm text-muted-foreground">
        Recorded activity on your cases and documents.
      </p>

      {error ? (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading activity…</p>
      ) : data && data.length > 0 ? (
        <div className="rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Case</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.action}</TableCell>
                  <TableCell>{row.description ?? "—"}</TableCell>
                  <TableCell>{row.cases?.case_id ?? "—"}</TableCell>
                  <TableCell>
                    {row.documents
                      ? `${String(row.documents.serial_number).padStart(2, "0")} · ${row.documents.file_name}`
                      : "—"}
                  </TableCell>
                  <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No audit activity yet.</p>
      )}
    </AppShell>
  );
}
