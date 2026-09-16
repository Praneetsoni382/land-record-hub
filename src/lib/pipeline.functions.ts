/**
 * Phase 1 backend pipeline structure.
 *
 * These server functions establish the secure, authenticated entry points that
 * later phases will implement (Gemini document understanding, classification,
 * extraction, validation, reconciliation, integrity scoring, finalisation).
 *
 * They intentionally perform NO processing and NO simulated AI work. Each one
 * verifies the caller and confirms the target row is accessible under RLS, then
 * reports that the capability is not available yet.
 *
 * Any future model call must happen inside these handlers (server-side only),
 * reading its credentials from process.env inside the handler body. No API key
 * may ever reach the browser bundle.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const documentInput = z.object({ document_id: z.string().uuid() });
const caseInput = z.object({ case_id: z.string().uuid() });

class NotImplementedInPhaseOne extends Error {
  constructor(step: string) {
    super(`${step} is not available yet. It is implemented in a later phase.`);
  }
}

async function assertDocumentAccess(
  supabase: { from: (t: string) => any },
  documentId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("documents")
    .select("id")
    .eq("id", documentId)
    .maybeSingle();
  if (error) throw new Error("Could not verify the document.");
  if (!data) throw new Error("You do not have access to this document.");
}

async function assertCaseAccess(
  supabase: { from: (t: string) => any },
  caseId: string,
): Promise<void> {
  const { data, error } = await supabase.from("cases").select("id").eq("id", caseId).maybeSingle();
  if (error) throw new Error("Could not verify the case.");
  if (!data) throw new Error("You do not have access to this case.");
}

/** Phase 2: ingestion + Gemini document understanding, classification, extraction. */
export const processDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => documentInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertDocumentAccess(context.supabase, data.document_id);
    throw new NotImplementedInPhaseOne("Document processing");
  });

/** Phase 3: field-level validation of extracted values. */
export const runValidation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => documentInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertDocumentAccess(context.supabase, data.document_id);
    throw new NotImplementedInPhaseOne("Field validation");
  });

/** Phase 3: cross-document reconciliation within a case. */
export const runReconciliation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => caseInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertCaseAccess(context.supabase, data.case_id);
    throw new NotImplementedInPhaseOne("Cross-document reconciliation");
  });

/** Phase 4: comparison against the legacy institutional record. */
export const compareLegacyRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => caseInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertCaseAccess(context.supabase, data.case_id);
    throw new NotImplementedInPhaseOne("Legacy record comparison");
  });

/** Phase 4: integrity score computation. */
export const calculateIntegrityScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => caseInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertCaseAccess(context.supabase, data.case_id);
    throw new NotImplementedInPhaseOne("Integrity scoring");
  });

/** Phase 5: officer finalisation into verified_land_records. */
export const finalizeVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => caseInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertCaseAccess(context.supabase, data.case_id);
    throw new NotImplementedInPhaseOne("Verification finalisation");
  });
