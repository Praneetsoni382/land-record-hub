
-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'OFFICER',
  department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- generic updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- CASES
-- =========================================================
CREATE TABLE public.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id TEXT UNIQUE NOT NULL,
  project_name TEXT NOT NULL,
  district TEXT,
  village TEXT,
  acquisition_reference TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cases_status_check CHECK (status IN ('DRAFT','PROCESSING','PENDING_REVIEW','VERIFIED','INCONSISTENT'))
);
CREATE INDEX idx_cases_created_by ON public.cases(created_by);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cases TO authenticated;
GRANT ALL ON public.cases TO service_role;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cases_select_own" ON public.cases FOR SELECT TO authenticated USING (created_by = auth.uid());
CREATE POLICY "cases_insert_own" ON public.cases FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "cases_update_own" ON public.cases FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "cases_delete_own" ON public.cases FOR DELETE TO authenticated USING (created_by = auth.uid());

CREATE TRIGGER trg_cases_updated BEFORE UPDATE ON public.cases
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- sequential human-readable case id
CREATE SEQUENCE public.case_number_seq START 1;
GRANT USAGE ON SEQUENCE public.case_number_seq TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.assign_case_id()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.case_id IS NULL OR NEW.case_id = '' THEN
    NEW.case_id := 'LA-' || to_char(now(), 'YYYY') || '-' ||
      lpad(nextval('public.case_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_cases_assign_case_id BEFORE INSERT ON public.cases
FOR EACH ROW EXECUTE FUNCTION public.assign_case_id();

-- access helper (avoids recursive RLS in child tables)
CREATE OR REPLACE FUNCTION public.can_access_case(_case_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.cases c WHERE c.id = _case_id AND c.created_by = auth.uid());
$$;

-- =========================================================
-- DOCUMENTS
-- =========================================================
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  serial_number INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT,
  document_type TEXT,
  processing_status TEXT NOT NULL DEFAULT 'UPLOADED',
  processing_stage TEXT,
  overall_confidence NUMERIC,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  CONSTRAINT documents_case_serial_unique UNIQUE (case_id, serial_number),
  CONSTRAINT documents_processing_status_check CHECK (processing_status IN ('UPLOADED','PROCESSING','COMPLETED','FAILED')),
  CONSTRAINT documents_processing_stage_check CHECK (processing_stage IS NULL OR processing_stage IN ('INGESTION','DOCUMENT_UNDERSTANDING','CLASSIFICATION','EXTRACTION','VALIDATION','COMPLETED'))
);
CREATE INDEX idx_documents_case ON public.documents(case_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_select" ON public.documents FOR SELECT TO authenticated USING (public.can_access_case(case_id));
CREATE POLICY "documents_insert" ON public.documents FOR INSERT TO authenticated WITH CHECK (public.can_access_case(case_id) AND uploaded_by = auth.uid());
CREATE POLICY "documents_update" ON public.documents FOR UPDATE TO authenticated USING (public.can_access_case(case_id)) WITH CHECK (public.can_access_case(case_id));
CREATE POLICY "documents_delete" ON public.documents FOR DELETE TO authenticated USING (public.can_access_case(case_id));

-- serial numbers assigned by upload order inside a case
CREATE OR REPLACE FUNCTION public.assign_document_serial()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.serial_number IS NULL OR NEW.serial_number <= 0 THEN
    PERFORM pg_advisory_xact_lock(hashtext(NEW.case_id::text));
    SELECT COALESCE(MAX(d.serial_number), 0) + 1 INTO NEW.serial_number
    FROM public.documents d WHERE d.case_id = NEW.case_id;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_documents_serial BEFORE INSERT ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.assign_document_serial();

ALTER TABLE public.documents ALTER COLUMN serial_number DROP NOT NULL;

-- =========================================================
-- EXTRACTION TABLES (populated in later phases)
-- =========================================================
CREATE TABLE public.document_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  document_type TEXT,
  extracted_data JSONB,
  extraction_confidence NUMERIC,
  model_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_extractions TO authenticated;
GRANT ALL ON public.document_extractions TO service_role;
ALTER TABLE public.document_extractions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_document(_document_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.documents d
    JOIN public.cases c ON c.id = d.case_id
    WHERE d.id = _document_id AND c.created_by = auth.uid()
  );
$$;

CREATE POLICY "document_extractions_all" ON public.document_extractions FOR ALL TO authenticated
USING (public.can_access_document(document_id)) WITH CHECK (public.can_access_document(document_id));

CREATE TRIGGER trg_extractions_updated BEFORE UPDATE ON public.document_extractions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.extracted_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  field_name TEXT,
  field_value TEXT,
  confidence NUMERIC,
  validation_status TEXT,
  validation_reason TEXT,
  source_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.extracted_fields TO authenticated;
GRANT ALL ON public.extracted_fields TO service_role;
ALTER TABLE public.extracted_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "extracted_fields_all" ON public.extracted_fields FOR ALL TO authenticated
USING (public.can_access_document(document_id)) WITH CHECK (public.can_access_document(document_id));

CREATE TABLE public.processing_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.processing_steps TO authenticated;
GRANT ALL ON public.processing_steps TO service_role;
ALTER TABLE public.processing_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "processing_steps_all" ON public.processing_steps FOR ALL TO authenticated
USING (public.can_access_document(document_id)) WITH CHECK (public.can_access_document(document_id));

-- =========================================================
-- LEGACY INSTITUTIONAL RECORDS
-- =========================================================
CREATE TABLE public.legacy_land_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  land_record_id TEXT UNIQUE NOT NULL,
  owner_name TEXT,
  survey_number TEXT,
  khasra_number TEXT,
  village TEXT,
  district TEXT,
  area NUMERIC,
  area_unit TEXT,
  status TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.legacy_land_records TO authenticated;
GRANT ALL ON public.legacy_land_records TO service_role;
ALTER TABLE public.legacy_land_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "legacy_records_read" ON public.legacy_land_records FOR SELECT TO authenticated USING (true);

CREATE TRIGGER trg_legacy_updated BEFORE UPDATE ON public.legacy_land_records
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- VERIFICATION
-- =========================================================
CREATE TABLE public.verification_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  field_validation_status TEXT,
  cross_document_status TEXT,
  legacy_comparison_status TEXT,
  conflict_status TEXT,
  integrity_score NUMERIC,
  status TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.verification_runs TO authenticated;
GRANT ALL ON public.verification_runs TO service_role;
ALTER TABLE public.verification_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "verification_runs_all" ON public.verification_runs FOR ALL TO authenticated
USING (public.can_access_case(case_id)) WITH CHECK (public.can_access_case(case_id));

CREATE TABLE public.verification_field_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_run_id UUID NOT NULL REFERENCES public.verification_runs(id) ON DELETE CASCADE,
  field_name TEXT,
  source_type TEXT,
  submitted_value TEXT,
  legacy_value TEXT,
  match_status TEXT,
  confidence NUMERIC,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.verification_field_results TO authenticated;
GRANT ALL ON public.verification_field_results TO service_role;
ALTER TABLE public.verification_field_results ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_verification_run(_run_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.verification_runs v
    JOIN public.cases c ON c.id = v.case_id
    WHERE v.id = _run_id AND c.created_by = auth.uid()
  );
$$;

CREATE POLICY "verification_field_results_all" ON public.verification_field_results FOR ALL TO authenticated
USING (public.can_access_verification_run(verification_run_id))
WITH CHECK (public.can_access_verification_run(verification_run_id));

CREATE TABLE public.ownership_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  land_record_id TEXT,
  previous_owner TEXT,
  new_owner TEXT,
  mutation_number TEXT,
  mutation_date DATE,
  source_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ownership_history TO authenticated;
GRANT ALL ON public.ownership_history TO service_role;
ALTER TABLE public.ownership_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ownership_history_all" ON public.ownership_history FOR ALL TO authenticated
USING (public.can_access_case(case_id)) WITH CHECK (public.can_access_case(case_id));

CREATE TABLE public.verified_land_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  land_record_id TEXT UNIQUE NOT NULL,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  owner_name TEXT,
  survey_number TEXT,
  khasra_number TEXT,
  village TEXT,
  district TEXT,
  area NUMERIC,
  area_unit TEXT,
  registration_number TEXT,
  registration_date DATE,
  mutation_number TEXT,
  verification_status TEXT,
  integrity_score NUMERIC,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.verified_land_records TO authenticated;
GRANT ALL ON public.verified_land_records TO service_role;
ALTER TABLE public.verified_land_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "verified_land_records_all" ON public.verified_land_records FOR ALL TO authenticated
USING (public.can_access_case(case_id)) WITH CHECK (public.can_access_case(case_id));

CREATE TRIGGER trg_verified_records_updated BEFORE UPDATE ON public.verified_land_records
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- AUDIT LOGS
-- =========================================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_case ON public.audit_logs(case_id);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_select" ON public.audit_logs FOR SELECT TO authenticated
USING (user_id = auth.uid() OR (case_id IS NOT NULL AND public.can_access_case(case_id)));
CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND (case_id IS NULL OR public.can_access_case(case_id)));

-- reusable audit writer usable from app code and future server functions
CREATE OR REPLACE FUNCTION public.write_audit_log(
  p_action TEXT,
  p_description TEXT DEFAULT NULL,
  p_case_id UUID DEFAULT NULL,
  p_document_id UUID DEFAULT NULL,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.audit_logs (case_id, document_id, user_id, action, description, old_value, new_value)
  VALUES (p_case_id, p_document_id, auth.uid(), p_action, p_description, p_old_value, p_new_value)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.write_audit_log(TEXT, TEXT, UUID, UUID, JSONB, JSONB) TO authenticated, service_role;

-- =========================================================
-- PRIVATE STORAGE POLICIES (bucket: land-documents)
-- path layout: cases/{case_uuid}/{document_uuid}/{filename}
-- =========================================================
CREATE POLICY "land_documents_read_own_cases" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'land-documents' AND public.can_access_case(NULLIF((storage.foldername(name))[2], '')::uuid));
CREATE POLICY "land_documents_insert_own_cases" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'land-documents' AND public.can_access_case(NULLIF((storage.foldername(name))[2], '')::uuid));
CREATE POLICY "land_documents_delete_own_cases" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'land-documents' AND public.can_access_case(NULLIF((storage.foldername(name))[2], '')::uuid));

-- =========================================================
-- SEED DATA (demo only; hidden from normal app views)
-- =========================================================
INSERT INTO public.legacy_land_records
  (land_record_id, owner_name, survey_number, khasra_number, village, district, area, area_unit, status, is_demo)
VALUES
  ('LR-000124', 'Ramesh Sharma', '124/2', '87/3', 'Barkheda', 'Sehore', 2.35, 'hectare', 'ACTIVE', true);
