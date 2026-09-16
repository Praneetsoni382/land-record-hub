import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCase } from "@/lib/cases.functions";

export const Route = createFileRoute("/_authenticated/cases/new")({
  component: NewCasePage,
});

function NewCasePage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const submit = useServerFn(createCase);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    project_name: "",
    district: "",
    village: "",
    acquisition_reference: "",
    description: "",
  });

  function update(key: keyof typeof form) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const created = await submit({ data: form });
      toast.success(`Case ${created.case_id} created.`);
      await navigate({ to: "/cases/$caseId", params: { caseId: created.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Case could not be created.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="New Case" officer={user.email ?? "Officer"}>
      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project_name">Project Name</Label>
              <Input
                id="project_name"
                required
                value={form.project_name}
                onChange={update("project_name")}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="district">District</Label>
                <Input id="district" value={form.district} onChange={update("district")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="village">Village</Label>
                <Input id="village" value={form.village} onChange={update("village")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="acquisition_reference">Acquisition Reference</Label>
              <Input
                id="acquisition_reference"
                value={form.acquisition_reference}
                onChange={update("acquisition_reference")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={4} value={form.description} onChange={update("description")} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>
                {busy ? "Creating…" : "Create case"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate({ to: "/cases" })}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AppShell>
  );
}
