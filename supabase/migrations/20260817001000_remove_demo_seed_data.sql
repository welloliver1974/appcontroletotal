-- ============================================================================
-- Life OS Hub — Supabase Migration: Remove Demo Seed Data
-- ============================================================================
-- Removes the sample/demo rows inserted by 20260816000002_seed_data.sql.
-- User-created rows are preserved.
-- ============================================================================

DELETE FROM trip_stops
WHERE id IN (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb5',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb6',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb7',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb8',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb9',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb10',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb11'
);

DELETE FROM maintenance
WHERE id IN (
  '88888888-8888-8888-8888-888888888881',
  '88888888-8888-8888-8888-888888888882',
  '88888888-8888-8888-8888-888888888883',
  '88888888-8888-8888-8888-888888888884'
);

DELETE FROM events
WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111112',
  '11111111-1111-1111-1111-111111111113',
  '11111111-1111-1111-1111-111111111114',
  '11111111-1111-1111-1111-111111111115',
  '11111111-1111-1111-1111-111111111116',
  '11111111-1111-1111-1111-111111111117'
);

DELETE FROM emails
WHERE id IN (
  '22222222-2222-2222-2222-222222222221',
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222223'
);

DELETE FROM life_log
WHERE id IN (
  '33333333-3333-3333-3333-333333333331',
  '33333333-3333-3333-3333-333333333332',
  '33333333-3333-3333-3333-333333333333'
);

DELETE FROM facts
WHERE id IN (
  '44444444-4444-4444-4444-444444444441',
  '44444444-4444-4444-4444-444444444442',
  '44444444-4444-4444-4444-444444444443'
);

DELETE FROM reading
WHERE id IN (
  '55555555-5555-5555-5555-555555555551',
  '55555555-5555-5555-5555-555555555552',
  '55555555-5555-5555-5555-555555555553'
);

DELETE FROM media
WHERE id IN (
  '66666666-6666-6666-6666-666666666661',
  '66666666-6666-6666-6666-666666666662',
  '66666666-6666-6666-6666-666666666663',
  '66666666-6666-6666-6666-666666666664'
);

DELETE FROM assets
WHERE id IN (
  '77777777-7777-7777-7777-777777777771',
  '77777777-7777-7777-7777-777777777772',
  '77777777-7777-7777-7777-777777777773'
);

DELETE FROM pantry
WHERE id IN (
  '99999999-9999-9999-9999-999999999991',
  '99999999-9999-9999-9999-999999999992',
  '99999999-9999-9999-9999-999999999993',
  '99999999-9999-9999-9999-999999999994',
  '99999999-9999-9999-9999-999999999995',
  '99999999-9999-9999-9999-999999999996'
);

DELETE FROM trips
WHERE id IN (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'
);

DELETE FROM places
WHERE id IN (
  'cccccccc-cccc-cccc-cccc-cccccccccccc1',
  'cccccccc-cccc-cccc-cccc-cccccccccccc2',
  'cccccccc-cccc-cccc-cccc-cccccccccccc3',
  'cccccccc-cccc-cccc-cccc-cccccccccccc4',
  'cccccccc-cccc-cccc-cccc-cccccccccccc5'
);

DELETE FROM spending
WHERE (week, despensa, manutencao, viagens) IN (
  (((CURRENT_DATE - INTERVAL '7 weeks')::date + INTERVAL '1 day')::date, 320, 0, 0),
  (((CURRENT_DATE - INTERVAL '6 weeks')::date + INTERVAL '1 day')::date, 365, 0, 0),
  (((CURRENT_DATE - INTERVAL '5 weeks')::date + INTERVAL '1 day')::date, 410, 0, 0),
  (((CURRENT_DATE - INTERVAL '4 weeks')::date + INTERVAL '1 day')::date, 455, 612, 0),
  (((CURRENT_DATE - INTERVAL '3 weeks')::date + INTERVAL '1 day')::date, 500, 0, 640),
  (((CURRENT_DATE - INTERVAL '2 weeks')::date + INTERVAL '1 day')::date, 545, 0, 0),
  (((CURRENT_DATE - INTERVAL '1 weeks')::date + INTERVAL '1 day')::date, 590, 1240, 1980),
  ((CURRENT_DATE::date + INTERVAL '1 day')::date, 635, 0, 0)
);

DELETE FROM maint_months
WHERE (month, count) IN (
  (to_char(CURRENT_DATE - INTERVAL '5 months', 'YYYY-MM'), 2),
  (to_char(CURRENT_DATE - INTERVAL '4 months', 'YYYY-MM'), 1),
  (to_char(CURRENT_DATE - INTERVAL '3 months', 'YYYY-MM'), 3),
  (to_char(CURRENT_DATE - INTERVAL '2 months', 'YYYY-MM'), 2),
  (to_char(CURRENT_DATE - INTERVAL '1 months', 'YYYY-MM'), 4),
  (to_char(CURRENT_DATE, 'YYYY-MM'), 2)
);
