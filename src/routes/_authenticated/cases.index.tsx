import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FilePlus2 } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/cases/")({
  component: CaseListPage,
});

async function loadCases() {
  const { data, error } = await supabase
    .from("cases")
    .select("id, case_id, project_name, district, village, status, updated_at, documents(id)")
    .eq("is_demo", false)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Could not load your cases.");
  return data ?? [];
}

function CaseListPage() {
  const { user } = Route.useRouteContext();
  const { data, isLoading, error } = useQuery({ queryKey: ["cases"], queryFn: loadCases });

  return (
    <AppShell title="Cases" officer={user.email ?? "Officer"}>
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">Acquisition cases you have created.</p>
        <Button asChild size="sm">
          <Link to="/cases/new">
            <FilePlus2 className="mr-2 h-4 w-4" />
            New Case
          </Link>
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading cases…</p>
      ) : data && data.length > 0 ? (
        <div className="rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case ID</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>District</TableHead>
                <TableHead>Village</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.case_id}</TableCell>
                  <TableCell>{row.project_name}</TableCell>
                  <TableCell>{row.district ?? "—"}</TableCell>
                  <TableCell>{row.village ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{row.status}</Badge>
                  </TableCell>
                  <TableCell>{row.documents?.length ?? 0}</TableCell>
                  <TableCell>{new Date(row.updated_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link to="/cases/$caseId" params={{ caseId: row.id }}>
                        Open
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No cases yet. Create your first acquisition case.
        </p>
      )}
    </AppShell>
  );
}
