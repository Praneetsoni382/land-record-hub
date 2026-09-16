
REVOKE ALL ON FUNCTION public.can_access_case(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_document(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_verification_run(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.write_audit_log(TEXT, TEXT, UUID, UUID, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_case(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_document(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_verification_run(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.write_audit_log(TEXT, TEXT, UUID, UUID, JSONB, JSONB) TO authenticated, service_role;
