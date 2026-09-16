import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
] as const;

export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

const registerSchema = z.object({
  case_id: z.string().uuid(),
  document_id: z.string().uuid(),
  file_name: z.string().trim().min(1).max(300),
  storage_path: z.string().trim().min(1).max(600),
  mime_type: z.enum(ALLOWED_MIME_TYPES),
  file_size: z.number().int().positive().max(MAX_FILE_BYTES),
});

/**
 * Creates the documents row AFTER the file has been successfully stored in the
 * private bucket. Serial numbers are assigned by the database in upload order.
 */
export const registerDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => registerSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: caseRow, error: caseError } = await supabase
      .from("cases")
      .select("id, case_id")
      .eq("id", data.case_id)
      .maybeSingle();

    if (caseError) throw new Error("Could not verify the case.");
    if (!caseRow) throw new Error("You do not have access to this case.");

    const { data: document, error } = await supabase
      .from("documents")
      .insert({
        id: data.document_id,
        case_id: data.case_id,
        file_name: data.file_name,
        storage_path: data.storage_path,
        mime_type: data.mime_type,
        file_size: data.file_size,
        processing_status: "UPLOADED",
        processing_stage: null,
        uploaded_by: userId,
        is_demo: false,
        serial_number: null as unknown as number,
      })
      .select("*")
      .single();

    if (error || !document) {
      throw new Error("The document record could not be saved.");
    }

    const { error: auditError } = await supabase.rpc("write_audit_log", {
      p_action: "DOCUMENT_UPLOADED",
      p_description: `Document ${String(document.serial_number).padStart(2, "0")} (${document.file_name}) uploaded to ${caseRow.case_id}`,
      p_case_id: data.case_id,
      p_document_id: document.id,
      p_new_value: {
        file_name: document.file_name,
        serial_number: document.serial_number,
        processing_status: document.processing_status,
      },
    });
    if (auditError) console.error("audit log failed", auditError);

    return document;
  });

/** Returns a short-lived signed URL for a private document the officer owns. */
export const getDocumentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ document_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: document, error } = await supabase
      .from("documents")
      .select("id, case_id, storage_path")
      .eq("id", data.document_id)
      .maybeSingle();

    if (error) throw new Error("Could not load the document.");
    if (!document) throw new Error("You do not have access to this document.");

    const { data: signed, error: signError } = await supabase.storage
      .from("land-documents")
      .createSignedUrl(document.storage_path, 300);

    if (signError || !signed) throw new Error("Could not open the stored file.");

    await supabase.rpc("write_audit_log", {
      p_action: "DOCUMENT_VIEWED",
      p_description: "Document opened",
      p_case_id: document.case_id,
      p_document_id: document.id,
    });

    return { url: signed.signedUrl };
  });
