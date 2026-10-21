SET log_statement = 'none';
SET log_min_error_statement = 'panic';
SET log_min_duration_statement = -1;
\set app_user `cat /run/secrets/app_user`
\set app_password `cat /run/secrets/app_password`
\set migration_user `cat /run/secrets/migration_user`
\set migration_password `cat /run/secrets/migration_password`
\set backup_user `cat /run/secrets/backup_user`
\set backup_password `cat /run/secrets/backup_password`
BEGIN;
SELECT format('CREATE ROLE %I LOGIN', :'migration_user')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'migration_user') \gexec
SELECT format('CREATE ROLE %I LOGIN', :'backup_user')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'backup_user') \gexec
ALTER ROLE :"app_user" WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD :'app_password';
ALTER ROLE :"migration_user" WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD :'migration_password';
ALTER ROLE :"backup_user" WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD :'backup_password';
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE fullstack_starter_db TO :"migration_user", :"backup_user";
ALTER SCHEMA public OWNER TO :"migration_user";
SELECT format('ALTER %s %I.%I OWNER TO %I',
              CASE relkind WHEN 'S' THEN 'SEQUENCE' WHEN 'v' THEN 'VIEW' WHEN 'm' THEN 'MATERIALIZED VIEW' ELSE 'TABLE' END,
              nspname, relname, :'migration_user')
FROM pg_class JOIN pg_namespace ON pg_namespace.oid = relnamespace
WHERE nspname = 'public' AND relkind IN ('r', 'p', 'S', 'v', 'm')
ORDER BY CASE WHEN relkind = 'S' THEN 1 ELSE 0 END \gexec
GRANT USAGE ON SCHEMA public TO :"app_user", :"backup_user";
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES ON ALL TABLES IN SCHEMA public TO :"app_user";
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO :"app_user";
GRANT SELECT ON ALL TABLES IN SCHEMA public TO :"backup_user";
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO :"backup_user";
REVOKE ALL ON TABLE public.flyway_schema_history FROM :"app_user";
ALTER DEFAULT PRIVILEGES FOR ROLE :"migration_user" IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES ON TABLES TO :"app_user";
ALTER DEFAULT PRIVILEGES FOR ROLE :"migration_user" IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO :"app_user";
ALTER DEFAULT PRIVILEGES FOR ROLE :"migration_user" IN SCHEMA public GRANT SELECT ON TABLES TO :"backup_user";
ALTER DEFAULT PRIVILEGES FOR ROLE :"migration_user" IN SCHEMA public GRANT SELECT ON SEQUENCES TO :"backup_user";
COMMIT;