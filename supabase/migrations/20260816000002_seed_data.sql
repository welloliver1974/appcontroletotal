-- ============================================================================
-- Life OS Hub — Supabase Migration: Seed Data
-- Created: 2026-08-16
-- ============================================================================
-- This seed mirrors the mock data from src/data/seed.ts (SEED_VERSION = 8).
-- Run after initial_schema.sql to populate development data.
-- ============================================================================

-- NOTE: The dates below are relative to the migration run date.
-- In production, adjust the dates as needed or use the application UI to create data.

-- ============================================================================
-- AGENDA & INBOX
-- ============================================================================

-- events
INSERT INTO events (id, title, date, time_start, time_end, category, location) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Check-up clínico anual', CURRENT_DATE + 1, '09:30', '10:15', 'pessoal', 'Clínica São Lucas'),
  ('11111111-1111-1111-1111-111111111112', 'Reunião de trabalho — Sprint Review', CURRENT_DATE + 1, '15:00', '16:00', 'reuniao', 'Online (Meet)'),
  ('11111111-1111-1111-1111-111111111113', 'Treino na academia', CURRENT_DATE + 2, '07:00', '08:00', 'habit', 'Smart Fit'),
  ('11111111-1111-1111-1111-111111111114', 'Jantar em família', CURRENT_DATE + 3, '19:30', NULL, 'pessoal', 'Casa dos pais'),
  ('11111111-1111-1111-1111-111111111115', 'Voo para Florianópolis', CURRENT_DATE + 5, '11:45', NULL, 'viagem', 'GRU — Aeroporto'),
  ('11111111-1111-1111-1111-111111111116', 'Revisão do carro na oficina', CURRENT_DATE + 6, '14:00', NULL, 'pessoal', 'Oficina do Zé'),
  ('11111111-1111-1111-1111-111111111117', 'Entrevista — vaga senior', CURRENT_DATE + 8, '10:00', '11:00', 'reuniao', 'Online (Zoom)')
ON CONFLICT (id) DO NOTHING;

-- emails
INSERT INTO emails (id, from_name, subject, preview, importance, sent_at, tags, read) VALUES
  ('22222222-2222-2222-2222-222222222221', 'Hermes · Alerta', 'Fatura do cartão acima de R$ 3.000 este mês', 'Manutenção da oficina (R$ 1.240) + passagens Floripa (R$ 1.980) concentrados na mesma fatura. Revisar gastos da semana.', 'critico', NOW() - INTERVAL '2 hours', ARRAY['financas', 'alerta'], FALSE),
  ('22222222-2222-2222-2222-222222222222', 'Banco Central', 'Faturas em aberto — vencimentos próximos', 'Você tem 2 faturas vencendo em até 5 dias. Total: R$ 4.720,00.', 'critico', NOW() - INTERVAL '5 hours', ARRAY['financas'], FALSE),
  ('22222222-2222-2222-2222-222222222223', 'Recrutador · RH', 'Resposta à sua candidatura', 'Obrigado pelo interesse. Podemos agendar a entrevista técnica na próxima semana?', 'normal', NOW() - INTERVAL '7 hours', ARRAY['carreira'], FALSE)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- LIFE-LOG & LEITURA
-- ============================================================================

-- life_log
INSERT INTO life_log (id, title, body, tags, mood, created_at) VALUES
  ('33333333-3333-3333-3333-333333333331', 'Primeiro dia com o Life OS Hub', 'Configurei o Hermes Bridge, os ativos da casa e a despensa. Motivação renovada para organizar a vida financeira.', ARRAY['setup', 'produtividade'], 5, NOW() - INTERVAL '1 day'),
  ('33333333-3333-3333-3333-333333333332', 'Leitura: Deep Work encerrado', 'Terminei o capítulo 5. Destaque: a rotina do ritual — bloquear 90 min sem notificações logo pela manhã. Vou testar por 2 semanas.', ARRAY['leitura', 'foco'], 4, NOW() - INTERVAL '3 days'),
  ('33333333-3333-3333-3333-333333333333', 'Treino de perna — novo PR', 'Agachamento livre: 3x6 com 92 kg. Sensação ótima, gasto maior que o planejado nos suplementos.', ARRAY['saude', 'treino'], 5, NOW() - INTERVAL '5 days')
ON CONFLICT (id) DO NOTHING;

-- facts
INSERT INTO facts (id, content, source, tags, created_at) VALUES
  ('44444444-4444-4444-4444-444444444441', 'Trocar filtro do ar-condicionado a cada 3 meses (último: fev/2026).', 'Manual da casa', ARRAY['casa', 'filtro'], NOW() - INTERVAL '12 days'),
  ('44444444-4444-4444-4444-444444444442', 'Pneu traseiro esquerdo perde ~2 psi/semana — verificar na próxima manutenção.', 'Observação', ARRAY['carro', 'pneu'], NOW() - INTERVAL '9 days'),
  ('44444444-4444-4444-4444-444444444443', 'Meu horário de foco produtivo: 6h30–9h da manhã.', 'Reflexão', ARRAY['produtividade', 'rotina'], NOW() - INTERVAL '20 days')
ON CONFLICT (id) DO NOTHING;

-- reading
INSERT INTO reading (id, title, author, status, progress, note, tags, updated_at) VALUES
  ('55555555-5555-5555-5555-555555555551', 'Deep Work', 'Cal Newport', 'lendo', 62, 'Capítulo 5: rituais de foco profundo.', ARRAY['foco', 'produtividade'], NOW() - INTERVAL '2 days'),
  ('55555555-5555-5555-5555-555555555552', 'Hábitos Atômicos', 'James Clear', 'encerrado', 100, 'Fichamento pronto.', ARRAY['habitos'], NOW() - INTERVAL '10 days'),
  ('55555555-5555-5555-5555-555555555553', 'O Poder do Hábito', 'Charles Duhigg', 'lendo', 30, NULL, ARRAY['habitos', 'ciencia'], NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- media
INSERT INTO media (id, kind, url, title, source_label, thumbnail, summary, minutes, status, tags, created_at) VALUES
  ('66666666-6666-6666-6666-666666666661', 'youtube', 'https://youtu.be/habits-in-15', 'Como criar hábitos que duram — Atomic Habits em 15 min', 'YouTube · @produtividade', NULL, 'Resumo visual do método de James Clear: gatilho, rotina e recompensa — e como melhorar 1% por dia sem depender só de força de vontade.', 15, 'salvo', ARRAY['habitos', 'foco'], NOW() - INTERVAL '2 days'),
  ('66666666-6666-6666-6666-666666666662', 'youtube', 'https://youtu.be/dark-mode-with-life', 'Dark mode com vida — design systems na prática (Tailwind)', 'YouTube · @devconf', NULL, 'Camadas de superfície, sombras internas e glows ambiente: como montar um tema escuro sem preto chapado e com profundidade real na UI.', 24, 'consumido', ARRAY['design', 'frontend'], NOW() - INTERVAL '9 days'),
  ('66666666-6666-6666-6666-666666666663', 'instagram', 'https://instagram.com/reel/fit-recipe-10min', 'Receita fit de 10 minutos (rolê rápido)', 'Instagram · @receitasfit', NULL, 'Ovos, aveia e banana em reels: 320 kcal e 18 g de proteína — boa opção para o treino matinal.', 8, 'salvo', ARRAY['saude', 'comida'], NOW() - INTERVAL '1 day'),
  ('66666666-6666-6666-6666-666666666664', 'instagram', 'https://instagram.com/p/floripa-checklist', 'Checklist de viagem — Florianópolis', 'Instagram · @viajandolite', NULL, 'O que levar e os 3 pontos que valem a pena na temporada: Lagoinha, Jurerê e o centro histórico.', 6, 'consumido', ARRAY['viagem'], NOW() - INTERVAL '30 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- MANUTENÇÃO & ATIVOS
-- ============================================================================

-- assets
INSERT INTO assets (id, name, category, life_pct, next_maintenance, last_maintenance) VALUES
  ('77777777-7777-7777-7777-777777777771', 'Chevrolet Onix 2021', 'carro', 62, CURRENT_DATE + 6, CURRENT_DATE - 160),
  ('77777777-7777-7777-7777-777777777772', 'Apartamento — 3 quartos', 'casa', 88, CURRENT_DATE + 14, CURRENT_DATE - 90),
  ('77777777-7777-7777-7777-777777777773', 'Filtro de água gelada', 'casa', 18, CURRENT_DATE + 2, CURRENT_DATE - 88)
ON CONFLICT (id) DO NOTHING;

-- maintenance
INSERT INTO maintenance (id, asset_id, title, cost, date, odometer_km) VALUES
  ('88888888-8888-8888-8888-888888888881', '77777777-7777-7777-7777-777777777771', 'Troca de óleo + filtros', 420, CURRENT_DATE - 160, 48500),
  ('88888888-8888-8888-8888-888888888882', '77777777-7777-7777-7777-777777777771', 'Alinhamento e balanceamento', 180, CURRENT_DATE - 98, 52100),
  ('88888888-8888-8888-8888-888888888883', '77777777-7777-7777-7777-777777777772', 'Manutenção do ar-condicionado', 890, CURRENT_DATE - 90, NULL),
  ('88888888-8888-8888-8888-888888888884', '77777777-7777-7777-7777-777777777773', 'Troca do filtro de água', 95, CURRENT_DATE - 88, NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CONSUMO & DESPENSA
-- ============================================================================

-- pantry
INSERT INTO pantry (id, name, category, qty, unit, low_threshold, expires_at) VALUES
  ('99999999-9999-9999-9999-999999999991', 'Arroz integral 5kg', 'grãos', 3.2, 'kg', 1, NULL),
  ('99999999-9999-9999-9999-999999999992', 'Feijão preto 1kg', 'grãos', 0.4, 'kg', 1, CURRENT_DATE + 40),
  ('99999999-9999-9999-9999-999999999993', 'Leite desnatado', 'laticínios', 2, 'L', 3, CURRENT_DATE + 6),
  ('99999999-9999-9999-9999-999999999994', 'Ovos', 'proteínas', 4, 'dúzia', 2, NULL),
  ('99999999-9999-9999-9999-999999999995', 'Azeite extra virgem', 'condimentos', 0.5, 'L', 0.75, NULL),
  ('99999999-9999-9999-9999-999999999996', 'Café torrado 1kg', 'bebidas', 0.2, 'kg', 0.75, CURRENT_DATE + 30)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VIAGENS & EXPERIÊNCIAS
-- ============================================================================

-- trips
INSERT INTO trips (id, destination, start_date, end_date, status) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Florianópolis — SC', CURRENT_DATE + 5, CURRENT_DATE + 10, 'confirmado'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'Monte Verde — MG', CURRENT_DATE + 28, CURRENT_DATE + 31, 'planejado'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'Bonito — MS', CURRENT_DATE + 120, CURRENT_DATE + 127, 'planejado')
ON CONFLICT (id) DO NOTHING;

-- trip_stops (for trip 1 - Florianópolis)
INSERT INTO trip_stops (id, trip_id, day, time, title, note) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 1, '11:45', 'Voo GRU → Floripa + check-in pousada', 'Voo direto (1h20).'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 2, '09:00', 'Praia da Joaquina', NULL),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 2, '17:00', 'Mirante do Morro da Lagoa', NULL),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 3, NULL, 'Trilha da Lagoinha do Leste', 'Trilha 1h30 — levar água.'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb5', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 4, '10:00', 'Passeio de barco — Lagoa da Conceição', NULL),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb6', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 5, NULL, 'Jurerê Internacional + almoço no centrinho', NULL),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb7', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 6, NULL, 'Centro histórico', 'Catedral e Mercado Público pela manhã.')
ON CONFLICT (id) DO NOTHING;

-- trip_stops (for trip 2 - Monte Verde)
INSERT INTO trip_stops (id, trip_id, day, time, title, note) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb8', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 1, '14:00', 'Chegada em Monte Verde', 'Clima frio — casaco leve.'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb9', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 2, '08:00', 'Trilha do Pico do Selado', 'Vista 360° no topo.'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb10', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 3, '09:30', 'Pedra Redonda', NULL),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb11', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 4, '11:00', 'Chocolate artesanal + volta', NULL)
ON CONFLICT (id) DO NOTHING;

-- places
INSERT INTO places (id, name, where_text, visited, note) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc1', 'Jericoacoara', 'Ceará', FALSE, NULL),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc2', 'Chapada dos Veadeiros', 'Goiás', FALSE, 'Cachoeiras — melhor na seca.'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc3', 'Fernando de Noronha', 'Pernambuco', FALSE, 'Projeto Tamar — janela de tartarugas.'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc4', 'Ilha do Cardoso', 'Cananéia — SP', TRUE, 'Mergulho e trilha da restinga.'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc5', 'São Thomé das Letras', 'MG', TRUE, NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DASHBOARD — Analytics
-- ============================================================================

-- spending (8 weeks, starting from 7 weeks ago to current week)
INSERT INTO spending (id, week, despensa, manutencao, viagens) VALUES
  (gen_random_uuid(), (CURRENT_DATE - INTERVAL '7 weeks')::date + INTERVAL '1 day', 320, 0, 0),
  (gen_random_uuid(), (CURRENT_DATE - INTERVAL '6 weeks')::date + INTERVAL '1 day', 365, 0, 0),
  (gen_random_uuid(), (CURRENT_DATE - INTERVAL '5 weeks')::date + INTERVAL '1 day', 410, 0, 0),
  (gen_random_uuid(), (CURRENT_DATE - INTERVAL '4 weeks')::date + INTERVAL '1 day', 455, 612, 0),
  (gen_random_uuid(), (CURRENT_DATE - INTERVAL '3 weeks')::date + INTERVAL '1 day', 500, 0, 640),
  (gen_random_uuid(), (CURRENT_DATE - INTERVAL '2 weeks')::date + INTERVAL '1 day', 545, 0, 0),
  (gen_random_uuid(), (CURRENT_DATE - INTERVAL '1 weeks')::date + INTERVAL '1 day', 590, 1240, 1980),
  (gen_random_uuid(), CURRENT_DATE::date + INTERVAL '1 day', 635, 0, 0)
ON CONFLICT DO NOTHING;

-- maint_months (last 6 months)
INSERT INTO maint_months (id, month, count) VALUES
  (gen_random_uuid(), to_char(CURRENT_DATE - INTERVAL '5 months', 'YYYY-MM'), 2),
  (gen_random_uuid(), to_char(CURRENT_DATE - INTERVAL '4 months', 'YYYY-MM'), 1),
  (gen_random_uuid(), to_char(CURRENT_DATE - INTERVAL '3 months', 'YYYY-MM'), 3),
  (gen_random_uuid(), to_char(CURRENT_DATE - INTERVAL '2 months', 'YYYY-MM'), 2),
  (gen_random_uuid(), to_char(CURRENT_DATE - INTERVAL '1 months', 'YYYY-MM'), 4),
  (gen_random_uuid(), to_char(CURRENT_DATE, 'YYYY-MM'), 2)
ON CONFLICT DO NOTHING;