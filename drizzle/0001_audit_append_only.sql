CREATE FUNCTION reject_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_event is append-only';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER audit_no_change BEFORE UPDATE OR DELETE ON audit_event
FOR EACH ROW EXECUTE FUNCTION reject_audit_mutation();
--> statement-breakpoint
CREATE TRIGGER audit_no_truncate BEFORE TRUNCATE ON audit_event
FOR EACH STATEMENT EXECUTE FUNCTION reject_audit_mutation();
