-- The activity log stays append-only (no edits, no TRUNCATE). The owner may now delete entries, but only through the
-- app's owner-only purge, which switches on a setting that lasts for that one transaction. Any other DELETE still fails.
CREATE OR REPLACE FUNCTION reject_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('oanro.audit_purge', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'audit_event is append-only';
END;
$$;
