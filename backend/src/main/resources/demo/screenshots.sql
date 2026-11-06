INSERT INTO app_user (google_id, email, display_name, role, access_status, requested_role)
SELECT 'demo-data-owner', 'alice.morgan@example.com', 'Alice Morgan', 'OWNER', 'APPROVED', NULL
WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE google_id = 'demo-data-owner');

INSERT INTO app_user (google_id, email, display_name, role, access_status, requested_role)
SELECT 'google-user-alice', 'james.chen@example.com', 'James Chen', 'NONE', 'PENDING', 'VIEWER'
WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE google_id = 'google-user-alice');

INSERT INTO app_user (google_id, email, display_name, role, access_status, requested_role)
SELECT 'google-user-bob', 'sophia.patel@example.com', 'Sophia Patel', 'NONE', 'PENDING', 'EDITOR'
WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE google_id = 'google-user-bob');

INSERT INTO app_user (google_id, email, display_name, role, access_status, requested_role)
SELECT 'demo-olivia', 'olivia.bennett@example.com', 'Olivia Bennett', 'VIEWER', 'APPROVED', NULL
WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE google_id = 'demo-olivia');

INSERT INTO app_user (google_id, email, display_name, role, access_status, requested_role)
SELECT 'demo-noah', 'noah.reed@example.com', 'Noah Reed', 'EDITOR', 'APPROVED', NULL
WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE google_id = 'demo-noah');

INSERT INTO app_user (google_id, email, display_name, role, access_status, requested_role)
SELECT 'demo-daniel', 'daniel.brooks@example.com', 'Daniel Brooks', 'ADMIN', 'APPROVED', NULL
WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE google_id = 'demo-daniel');

INSERT INTO app_user (google_id, email, display_name, role, access_status, requested_role)
SELECT 'demo-emma', 'emma.wilson@example.com', 'Emma Wilson', 'NONE', 'NONE', NULL
WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE google_id = 'demo-emma');

INSERT INTO audit_log (id, action, target_type, target_id, actor_google_id, actor_email, occurred_at)
SELECT '00000000-0000-4000-8000-000000000001', 'REQUEST_ACCESS', 'access_request', 'google-user-alice', 'google-user-alice', 'james.chen@example.com', TIMESTAMP '2026-06-15 09:35:00'
WHERE NOT EXISTS (SELECT 1 FROM audit_log WHERE id = '00000000-0000-4000-8000-000000000001');

INSERT INTO audit_log (id, action, target_type, target_id, actor_google_id, actor_email, occurred_at)
SELECT '00000000-0000-4000-8000-000000000002', 'REQUEST_ACCESS', 'access_request', 'google-user-bob', 'google-user-bob', 'sophia.patel@example.com', TIMESTAMP '2026-06-15 09:48:00'
WHERE NOT EXISTS (SELECT 1 FROM audit_log WHERE id = '00000000-0000-4000-8000-000000000002');

INSERT INTO audit_log (id, action, target_type, target_id, actor_google_id, actor_email, occurred_at)
SELECT '00000000-0000-4000-8000-000000000003', 'APPROVE_ACCESS', 'access_request', 'demo-olivia', 'demo-data-owner', 'alice.morgan@example.com', TIMESTAMP '2026-06-15 10:02:00'
WHERE NOT EXISTS (SELECT 1 FROM audit_log WHERE id = '00000000-0000-4000-8000-000000000003');

INSERT INTO audit_log (id, action, target_type, target_id, actor_google_id, actor_email, occurred_at)
SELECT '00000000-0000-4000-8000-000000000004', 'CHANGE_ROLE', 'user', 'demo-noah', 'demo-data-owner', 'alice.morgan@example.com', TIMESTAMP '2026-06-15 10:14:00'
WHERE NOT EXISTS (SELECT 1 FROM audit_log WHERE id = '00000000-0000-4000-8000-000000000004');

INSERT INTO audit_log (id, action, target_type, target_id, actor_google_id, actor_email, occurred_at)
SELECT '00000000-0000-4000-8000-000000000005', 'EDIT_CONFIG', 'config_override', 'app.console.max-page-size', 'demo-data-owner', 'alice.morgan@example.com', TIMESTAMP '2026-06-15 10:24:00'
WHERE NOT EXISTS (SELECT 1 FROM audit_log WHERE id = '00000000-0000-4000-8000-000000000005');
