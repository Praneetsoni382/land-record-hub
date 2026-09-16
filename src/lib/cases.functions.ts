import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DEMO_CASE_ID = "LA-2026-00027";

const createCaseSchema = z.object({
  project_name: z.string().trim().min(2, "Project name is required").max(200),
  district: z.string().trim().max(120).optional().default(""),
  village: z.string().trim().max(120).optional().default(""),
  acquisition_reference: z.string().trim().max(120).optional().default(""),
  description: z.string().trim().max(2000).optional().default(""),
});

/**
 * Ensures an officer profile exists for the signed-in user, and makes sure the
 * synthetic backend-testing records exist. Everything seeded here is flagged
 * is_demo = true and is excluded from every application query.
 */
export const ensureOfficerProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const email = (claims as { email?: string }).email ?? null;
    const metadata = (claims as { user_metadata?: { full_name?: string } }).user_metadata;

    const { data: profile, error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          email,
          full_name: metadata?.full_name ?? email?.split("@")[0] ?? "Officer",
        },
        { onConflict: "id" },
      )
      .select("*")
      .single();

    if (error) throw new Error("Could not load your officer profile.");

    // Seed the synthetic case used for backend/relationship testing (hidden in the UI).
    const { data: existingDemo } = await supabase
      .from("cases")
      .select("id")
      .eq("case_id", DEMO_CASE_ID)
      .maybeSingle();

    if (!existingDemo) {
      await supabase.from("cases").insert({
        case_id: DEMO_CASE_ID,
        project_name: "Bhopal–Sehore Road Expansion",
        district: "Sehore",
        village: "Barkheda",
        acquisition_reference: "DEMO-2026-001",
        status: "DRAFT",
        created_by: userId,
        is_demo: true,
      });
    }

    return profile;
  });

export const createCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createCaseSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: created, error } = await supabase
      .from("cases")
      .insert({
        project_name: data.project_name,
        district: data.district || null,
        village: data.village || null,
        acquisition_reference: data.acquisition_reference || null,
        description: data.description || null,
        status: "DRAFT",
        created_by: userId,
        is_demo: false,
        // case_id is generated sequentially by the database (LA-YYYY-NNNNN)
        case_id: null as unknown as string,
      })
      .select("*")
      .single();

    if (error || !created) {
      throw new Error("Case could not be created. Please try again.");
    }

    const { error: auditError } = await supabase.rpc("write_audit_log", {
      p_action: "CASE_CREATED",
      p_description: `Case ${created.case_id} created for ${created.project_name}`,
      p_case_id: created.id,
      p_new_value: {
        case_id: created.case_id,
        project_name: created.project_name,
        status: created.status,
      },
    });
    if (auditError) console.error("audit log failed", auditError);

    return created;
  });
