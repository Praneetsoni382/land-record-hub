import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { FileText, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

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
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_BYTES,
  getDocumentUrl,
  registerDocument,
} from "@/lib/documents.functions";

export const Route = createFileRoute("/_authenticated/cases/$caseId")({
  component: CaseWorkspacePage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6 text-sm">Case not found.</div>,
});

async function loadCase(caseId: string) {
  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .eq("id", caseId)
    .maybeSingle();
  if (error) throw new Error("Could not load this case.");
  if (!data) throw new Error("This case does not exist or you do not have access to it.");
  return data;
}

async function loadDocuments(caseId: string) {
  const { data, error } = await supabase
    .from("documents")
    .select(
      "id, serial_number, file_name, mime_type, file_size, document_type, processing_status, processing_stage, overall_confidence, uploaded_at",
    )
    .eq("case_id", caseId)
    .order("serial_number", { ascending: true });
  if (error) throw new Error("Could not load documents for this case.");
  return data ?? [];
}

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function CaseWorkspacePage() {
  const { caseId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const register = useServerFn(registerDocument);
  const openUrl = useServerFn(getDocumentUrl);

  const caseQuery = useQuery({
    queryKey: ["case", caseId],
    queryFn: () => loadCase(caseId),
  });
  const docsQuery = useQuery({
    queryKey: ["case-documents", caseId],
    queryFn: () => loadDocuments(caseId),
  });

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);

    const list = Array.from(files);
    let uploaded = 0;

    for (let i = 0; i < list.length; i += 1) {
      const file = list[i]!;
      setProgress(`Uploading ${i + 1} of ${list.length}: ${file.name}`);

      if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
        toast.error(`${file.name} was skipped — only PDF, JPG and PNG files are accepted.`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        toast.error(`${file.name} was skipped — files must be 25 MB or smaller.`);
        continue;
      }

      const documentId = crypto.randomUUID();
      const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-120);
      const storagePath = `${user.id}/${caseId}/${documentId}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("land-documents")
        .upload(storagePath, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        toast.error(`${file.name} could not be stored. Please try again.`);
        continue;
      }

      try {
        await register({
          data: {
            case_id: caseId,
            document_id: documentId,
            file_name: file.name.slice(-300),
            storage_path: storagePath,
            mime_type: file.type as (typeof ALLOWED_MIME_TYPES)[number],
            file_size: file.size,
          },
        });
        uploaded += 1;
      } catch {
        await supabase.storage.from("land-documents").remove([storagePath]);
        toast.error(`${file.name} could not be recorded. Please try again.`);
      }
    }

    setProgress(null);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (uploaded > 0) {
      toast.success(`${uploaded} document${uploaded === 1 ? "" : "s"} uploaded.`);
      await queryClient.invalidateQueries({ queryKey: ["case-documents", caseId] });
      await queryClient.invalidateQueries({ queryKey: ["cases"] });
      await queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    }
  }

  async function handleOpen(documentId: string) {
    try {
      const { url } = await openUrl({ data: { document_id: documentId } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Could not open this document.");
    }
  }

  const caseRow = caseQuery.data;
  const docs = docsQuery.data ?? [];

  return (
    <AppShell
      title={caseRow ? `${caseRow.case_id} — ${caseRow.project_name}` : "Case"}
      officer={user.email ?? "Officer"}
    >
      {caseQuery.error ? (
        <p className="text-sm text-destructive">{(caseQuery.error as Error).message}</p>
      ) : !caseRow ? (
        <p className="text-sm text-muted-foreground">Loading case…</p>
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 rounded-md border bg-background p-5 sm:grid-cols-2 lg:grid-cols-4">
            <Detail label="Case ID" value={caseRow.case_id} />
            <Detail label="Project" value={caseRow.project_name} />
            <Detail label="District" value={caseRow.district ?? "—"} />
            <Detail label="Village" value={caseRow.village ?? "—"} />
            <Detail label="Reference" value={caseRow.acquisition_reference ?? "—"} />
            <Detail label="Status" value={caseRow.status} />
            <Detail label="Documents" value={String(docs.length)} />
            <Detail
              label="Created"
              value={new Date(caseRow.created_at).toLocaleDateString()}
            />
          </section>

          {caseRow.description ? (
            <section className="rounded-md border bg-background p-5">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground">
                DESCRIPTION
              </p>
              <p className="mt-1 text-sm">{caseRow.description}</p>
            </section>
          ) : null}

          <section className="rounded-md border bg-background p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Documents</h2>
                <p className="text-xs text-muted-foreground">
                  PDF, JPG or PNG · up to 25 MB each · numbered in upload order
                </p>
              </div>
              <div className="flex items-center gap-3">
                {progress ? (
                  <span className="text-xs text-muted-foreground">{progress}</span>
                ) : null}
                <Button size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UploadCloud className="mr-2 h-4 w-4" />
                  )}
                  Upload documents
                </Button>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept="application/pdf,image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => void handleFiles(e.target.files)}
                />
              </div>
            </div>

            <div className="mt-4">
              {docsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading documents…</p>
              ) : docs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No documents uploaded yet for this case.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {docs.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">
                          {String(doc.serial_number ?? 0).padStart(2, "0")}
                        </TableCell>
                        <TableCell className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">{doc.file_name}</span>
                        </TableCell>
                        <TableCell>{doc.document_type ?? "Not classified"}</TableCell>
                        <TableCell>{formatSize(doc.file_size)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{doc.processing_status}</Badge>
                        </TableCell>
                        <TableCell>{new Date(doc.uploaded_at).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleOpen(doc.id)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-muted-foreground">
        {label.toUpperCase()}
      </p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
