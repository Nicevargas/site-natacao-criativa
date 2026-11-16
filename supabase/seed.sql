-- ============================================================================
-- Seed Data: Natação Criativa Platform
-- Matches all initial catalog, admin CRUD, hero slides, ecosystem content,
-- testimonials, and trajectory settings present in the application UI.
-- ============================================================================

-- 1. Instructors
INSERT INTO public.instructors (id, name, initials, role_title, bio, is_active)
VALUES
  (
    '11111111-1111-4111-8111-111111111101',
    'Renato Cordani',
    'RC',
    'Coordenação Pedagógica',
    'Fundador da Natação Criativa e Especialista Pedagógico com ampla experiência na formação de educadores aquáticos e gestão de escolas de natação.',
    true
  ),
  (
    '11111111-1111-4111-8111-111111111102',
    'Prof. André Martins',
    'AM',
    'Fisiologista Aquático',
    'Especialista em fisiologia aplicada ao esporte aquático, biomecânica da propulsão e análise cinemática de alta performance.',
    true
  ),
  (
    '11111111-1111-4111-8111-111111111103',
    'Mariana Silva',
    'MS',
    'Especialista Salvamento',
    'Instrutora de protocolos de segurança aquática, prevenção a incidentes e suporte básico de vida para ambientes escolares e clubes.',
    true
  ),
  (
    '11111111-1111-4111-8111-111111111104',
    'Fernando Loureiro',
    'FL',
    'Analista de Desempenho',
    'Analista de desempenho técnico com foco em filmagem subaquática, correção dos 4 nados e eficiência hidrodinâmica.',
    true
  )
ON CONFLICT (id) DO NOTHING;

-- 2. Courses / Formações
INSERT INTO public.courses (
  id, code, slug, title, subtitle, description,
  category, theme, format, level, target_audience, status,
  is_free, has_certificate, certificate_badge,
  workload_hours, workload_label, modality_details, location_or_url, city_state,
  start_date, start_date_label, max_capacity, enrolled_count, waitlist_count,
  display_price_cents, installments_count, installment_value_cents, price_label,
  cover_image_alt, is_featured, featured_order, primary_instructor_id, instructor_display_name, published_at
)
VALUES
  (
    '22222222-2222-4222-8222-222222222201',
    'FOR-2025-01',
    'metodologia-ludica-e-segura-da-natacao-infantil',
    'Metodologia Lúdica e Segura da Natação Infantil',
    'Da Iniciação aos 4 Estilos sem traumas na água',
    'Abordagem pedagógica integrada para retenção e desenvolvimento motor sem traumas na água, concebendo aulas dinâmicas com segurança aquática.',
    'especializacao',
    'natacao_infantil',
    'online_hibrido',
    'intermediario',
    ARRAY['profissionais', 'gestores']::text[],
    'aberto',
    false,
    true,
    'Certificado Válido CREF',
    60,
    '60h certificadas',
    'Gravado + 4 Encontros Síncronos',
    'https://meet.natacaocriativa.com/turma-01',
    'Online (Nacional)',
    '2025-03-14',
    '14 Mar 2025',
    50,
    42,
    0,
    89000,
    12,
    8900,
    'R$ 890,00',
    'Criança sorrindo em aula lúdica de natação infantil com instrutor na piscina',
    true,
    1,
    '11111111-1111-4111-8111-111111111101',
    'Renato Cordani',
    timezone('utc', now())
  ),
  (
    '22222222-2222-4222-8222-222222222202',
    'PAL-2025-04',
    'biomecanica-e-eficiencia-no-nado-crawl-alta-performance',
    'Biomecânica e Eficiência no Nado Crawl de Alta Performance',
    'Análise cinemática de pegada, rolamento corporal e redução de arrasto',
    'Análise cinemática e propulsiva para correção de arrasto e ganhos imediatos de velocidade e economia de esforço para nadadores e treinadores.',
    'palestra',
    'biomecanica',
    'hibrido',
    'avancado',
    ARRAY['profissionais', 'alunos']::text[],
    'em_breve',
    false,
    true,
    'Ao Vivo + Gravação',
    8,
    '8h masterclass',
    'São Paulo + Transmissão 4K',
    'São Paulo/SP (e Online com replay)',
    'São Paulo / SP',
    '2025-04-02',
    '02 Abr 2025',
    150,
    0,
    128,
    24000,
    1,
    24000,
    'R$ 240,00',
    'Nadador realizando crawl subaquático com linhas de água hidrodinâmicas',
    true,
    2,
    '11111111-1111-4111-8111-111111111102',
    'Prof. André Martins',
    timezone('utc', now())
  ),
  (
    '22222222-2222-4222-8222-222222222203',
    'WKS-2025-02',
    'fundamentos-de-seguranca-aquatica-e-prevencao-de-incidentes',
    'Fundamentos de Segurança Aquática e Prevenção de Incidentes',
    'Protocolos de prevenção a afogamentos e suporte básico',
    'Protocolos essenciais para professores e academias minimizarem riscos, realizarem resgate rápido e aplicarem condutas de suporte básico.',
    'workshop',
    'seguranca_salvamento',
    'online_ao_vivo',
    'iniciacao',
    ARRAY['profissionais', 'gestores', 'familias']::text[],
    'aberto',
    true,
    true,
    'Certificado Chancelado',
    12,
    '12h com simulação',
    'Zoom Integrado + Gravação',
    'Plataforma Natação Criativa',
    'Online ao vivo',
    '2025-03-22',
    '22 Mar 2025',
    300,
    290,
    0,
    0,
    1,
    0,
    'Gratuito',
    'Equipamentos de salvamento e segurança aquática na borda da piscina',
    true,
    3,
    '11111111-1111-4111-8111-111111111103',
    'Mariana Silva',
    timezone('utc', now())
  ),
  (
    '22222222-2222-4222-8222-222222222204',
    'FOR-2025-08',
    'personal-trainer-aquatico-reabilitacao-ao-alto-rendimento',
    'Personal Trainer Aquático: Da Reabilitação ao Alto Rendimento',
    'Especialização 100% Online com Prática Supervisionada',
    'Domine a prescrição individualizada, periodização em água aquecida e atendimento diferenciado de alto valor para clientes particulares.',
    'pos_graduacao',
    'personal_aquatico',
    'hibrido',
    'avancado',
    ARRAY['profissionais']::text[],
    'aberto',
    false,
    true,
    'Certificação MEC',
    120,
    '120h Pós-Graduação',
    'Módulos EAD + Prática em Polo',
    'Curitiba/PR e Ambiente Virtual',
    'Curitiba / PR',
    '2025-04-10',
    '10 Abr 2025',
    35,
    28,
    0,
    165000,
    12,
    48000,
    'R$ 1.650,00',
    'Personal trainer aquático orientando aluno em exercício na piscina',
    true,
    4,
    '11111111-1111-4111-8111-111111111101',
    'Renato Cordani & Convidados',
    timezone('utc', now())
  ),
  (
    '22222222-2222-4222-8222-222222222205',
    'LAB-2025-01',
    'laboratorio-pratico-de-correcao-de-nados-e-analise-de-video',
    'Laboratório Prático de Correção de Nados e Análise de Vídeo',
    'Imersão Presencial de Borda de Piscina',
    'Identificação de erros biomecânicos em tempo real com metodologia exclusiva de filmagem subaquática e correção cinemática.',
    'imersao',
    'biomecanica',
    'presencial',
    'avancado',
    ARRAY['profissionais', 'alunos']::text[],
    'encerrado',
    false,
    true,
    '16 Horas Práticas',
    24,
    '24h Intensivas',
    'Presencial no Clube Mackenzie Aquática',
    'Clube Mackenzie Aquática - Belo Horizonte / MG',
    'Belo Horizonte / MG',
    '2025-02-15',
    '15 Fev 2025',
    20,
    20,
    0,
    115000,
    1,
    115000,
    'R$ 1.150,00',
    'Monitor de análise de vídeo biomecânica na borda da piscina',
    false,
    null,
    '11111111-1111-4111-8111-111111111104',
    'Fernando Loureiro',
    timezone('utc', now())
  ),
  (
    '22222222-2222-4222-8222-222222222206',
    'WKS-2025-05',
    'gestao-de-escolas-de-natacao-captacao-e-retencao-no-inverno',
    'Gestão de Escolas de Natação: Captação e Retenção no Inverno',
    'Estratégias comerciais, pedagógicas e motivacionais contra sazonalidade',
    'Estratégias comerciais, pedagógicas e motivacionais para combater a sazonalidade e manter elevada a taxa de rematrícula na academia.',
    'workshop',
    'gestao_escolas',
    'online_ao_vivo',
    'intermediario',
    ARRAY['gestores']::text[],
    'rascunho',
    false,
    true,
    'Planilhas Inclusas',
    16,
    '16h executivo',
    'Mentoria em Grupo Fechado',
    'Online Ao Vivo',
    'Online',
    NULL,
    'A definir (Mai 2025)',
    40,
    0,
    0,
    52000,
    1,
    52000,
    'R$ 520,00',
    'Recepção moderna de escola de natação com vista para piscina semi-aquecida',
    false,
    null,
    '11111111-1111-4111-8111-111111111101',
    'Renato Cordani',
    NULL
  ),
  (
    '22222222-2222-4222-8222-222222222207',
    'GUA-2025-01',
    'fundamentos-pedagogicos-da-ambientacao-sem-traumas',
    'Fundamentos Pedagógicos da Ambientação sem Traumas',
    'Aula Aberta & Guia Gratuito com Certificado Básico',
    'Princípios psicopedagógicos para adaptação gradual à água, respeito aos limites da criança e prevenção de traumas aquáticos.',
    'guia_aberto',
    'natacao_infantil',
    'online_gravado',
    'iniciacao',
    ARRAY['profissionais', 'familias']::text[],
    'aberto',
    true,
    true,
    'Certificado Básico Gratuito',
    4,
    '4h gravadas',
    '100% Online gravado com acesso imediato',
    'Plataforma Natação Criativa',
    'Online',
    NULL,
    'Disponível imediatamente',
    1000,
    0,
    0,
    0,
    1,
    0,
    'Gratuito',
    'Criança e instrutor sorrindo em adaptação aquática gentil',
    false,
    null,
    '11111111-1111-4111-8111-111111111101',
    'Renato Cordani',
    timezone('utc', now())
  )
ON CONFLICT (code) DO NOTHING;

-- 3. Commercial Lots (Lotes Comerciais)
INSERT INTO public.course_lots (id, course_id, name, price_cents, max_slots, sold_slots, status, sort_order)
VALUES
  ('33333333-3333-4333-8333-333333333301', '22222222-2222-4222-8222-222222222201', '1º Lote Antecipado', 74000, 30, 30, 'esgotado', 1),
  ('33333333-3333-4333-8333-333333333302', '22222222-2222-4222-8222-222222222201', '2º Lote Vigente', 89000, 20, 12, 'vigente', 2),
  ('33333333-3333-4333-8333-333333333303', '22222222-2222-4222-8222-222222222202', 'Lote Promocional Cardume', 24000, 150, 0, 'programado', 1),
  ('33333333-3333-4333-8333-333333333304', '22222222-2222-4222-8222-222222222203', 'Acesso Social Cardume', 0, 300, 290, 'vigente', 1),
  ('33333333-3333-4333-8333-333333333305', '22222222-2222-4222-8222-222222222204', '1º Lote Pós-Graduação', 165000, 35, 28, 'vigente', 1),
  ('33333333-3333-4333-8333-333333333306', '22222222-2222-4222-8222-222222222205', 'Lote Final', 115000, 20, 20, 'esgotado', 1),
  ('33333333-3333-4333-8333-333333333307', '22222222-2222-4222-8222-222222222206', 'Lote 1 (Planejamento)', 52000, 40, 0, 'programado', 1)
ON CONFLICT (id) DO NOTHING;

-- 4. Hero Carousel Highlights (3 Slides da Home)
INSERT INTO public.hero_highlights (
  id, badge_label, badge_icon, title, subtitle, cta_label, cta_url,
  trust_badge_label, trust_badge_icon, image_url, image_alt, image_caption, course_id, sort_order, is_active
)
VALUES
  (
    '44444444-4444-4444-8444-444444444401',
    'PÓS-GRADUAÇÃO',
    'school',
    'Natação Aplicada ao Personal Trainer Aquático',
    'Especialização 100% Online com Prática Supervisionada',
    'Conheça a formação',
    '/formacoes',
    'Certificação Reconhecida',
    'verified',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuD-JwfIDc9PpTOYOhX6sgdSPRDEecVyoQUKEo2EVvWM8N1sgfbjFLZXh3eHQozmBTJloxBLd_T8k1DS8vGZtL21iIyO0CEUjOXDqhDIVDIqXWFFV6_f-FCZTGbob1Fawd4DRfENL8A_t72741KPHHpSI5GyLIIYH3s0Z6yFrcmPj1LDxzJKciYOixVChkuXgp3GspW_j4D2u2DRAqvYi4npYogsLezfbcia4fsNKFo',
    'Personal trainer aquático demonstrando movimentos biomecânicos em piscina',
    'Inscrições com Vagas Limitadas',
    '22222222-2222-4222-8222-222222222204',
    1,
    true
  ),
  (
    '44444444-4444-4444-8444-444444444402',
    'GRUPO DE ESTUDOS',
    'groups',
    'Aula ao vivo + gravação',
    'Encontros quinzenais com discussão de casos reais e suporte contínuo',
    'Ver programação',
    '/formacoes',
    'Interação Direta ao Vivo',
    'videocam',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDUkkgrjBOv_2Ql75yJy6TsMap-jCTI0C7xim3lynbdgb2dnzt-Zz3O9yyJQo_eGq5CkztAgojDwtW2X5zqVk8-DnfrpCxxpL2o2kFUcJJ-j80tz1ycenEIJDOQCowBr8yno1F_ytY5my6w_LfjM26rrMxjPN0yO-jdEGFm9WmA_k8PpXxinHZ-a82i56L6royiyRmNvc600DzeLggNvDHGH1O6wjY6sHpzT_w8k90',
    'Conferência online sobre pedagogia aquática e biomecânica',
    'Encontros Quinzenais',
    NULL,
    2,
    true
  ),
  (
    '44444444-4444-4444-8444-444444444403',
    'TREINOS',
    'pool',
    '30 dias para evoluir com direção',
    'Periodização prática para piscina com foco em eficiência e condicionamento',
    'Experimentar agora',
    '/formacoes',
    'Planilhas Digitais Inclusas',
    'timer',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuA53Qt07X05PGC5PWmkXyfr6aFcrw6U1c4aQHyI9mPWIutGw5W5WRpHJ8Fi5yQ1kS9SyL9PhWisPBlbztfTiQLDIhQ_iR0AZ4d3GXD_CPILIMLBCWAbkHDfljdLjvnOfuqyAHgaV-RAGTV7gI7NsQMa1freFH0eSOIWrOLXYfq4fHJd2w4kk_R-r479v6BD8XdUY1GPjcXIpzxusgo4vycSr2dee0O0G_tlRXcXb6s',
    'Nadador na borda da piscina preparando-se para treino periodizado',
    'Acompanhamento e Metas',
    NULL,
    3,
    true
  )
ON CONFLICT (id) DO NOTHING;

-- 5. Ecosystem Contents (Instagram, Spotify Podcast, YouTube)
INSERT INTO public.ecosystem_contents (
  id, channel, title, summary, external_url, cta_label, badge_meta, episode_number, duration_minutes, is_featured, is_published
)
VALUES
  (
    '55555555-5555-4555-8555-555555555501',
    'instagram',
    '3 Dicas Práticas de Respiração Lateral sem Desequilíbrio',
    'Como manter o alinhamento corporal na respiração do crawl e evitar o afundamento do quadril.',
    'https://instagram.com/natacaocriativa',
    'Ver no Instagram',
    'Publicado há 2 dias',
    NULL,
    NULL,
    true,
    true
  ),
  (
    '55555555-5555-4555-8555-555555555502',
    'spotify',
    'A Revolução do Personal Trainer Aquático',
    'Conversa com especialistas sobre precificação, montagem de turmas exclusivas e posicionamento de mercado.',
    'https://open.spotify.com',
    'Ouvir no Spotify',
    'Duração: 48 min · Episódio #412',
    412,
    48,
    true,
    true
  ),
  (
    '55555555-5555-4555-8555-555555555503',
    'youtube',
    'Passo a Passo dos Educativos de Virada Olímpica',
    'Progressão didática segura para ensinar cambalhota e impulsão eficiente na parede sem perda de velocidade.',
    'https://youtube.com',
    'Assistir no YouTube',
    'Publicado há 5 dias',
    NULL,
    18,
    true,
    true
  )
ON CONFLICT (id) DO NOTHING;

-- 6. Testimonials (Depoimentos Verificados)
INSERT INTO public.testimonials (id, author_name, author_role_location, quote, is_verified, is_published, sort_order)
VALUES
  (
    '66666666-6666-4666-8666-666666666601',
    'Camila Vasconcelos',
    'Professora e Personal Aquática · São Paulo/SP',
    'A formação de Personal Trainer Aquático mudou totalmente a minha abordagem na borda da piscina. Consegui estruturar planos de aula mais claros, precificar meu trabalho com dignidade e dobrar minha carteira de alunos particulares.',
    true,
    true,
    1
  ),
  (
    '66666666-6666-4666-8666-666666666602',
    'Rodrigo Alcantara',
    'Coordenador Pedagógico · Curitiba/PR',
    'Como gestor de academia de natação, as capacitações da Natação Criativa elevaram o padrão de atendimento de toda a minha equipe. O método lúdico reduziu drasticamente o cancelamento de matrículas infantis no inverno.',
    true,
    true,
    2
  ),
  (
    '66666666-6666-4666-8666-666666666603',
    'Mariana Silveira',
    'Mãe do Theo (5 anos) · Belo Horizonte/MG',
    'Meu filho de 5 anos tinha pavor de colocar a cabeça na água. A visão de respeito e adaptação gradual apresentada pelos cursos me deu segurança como mãe para escolher a escola certa e acompanhar a evolução dele com tranquilidade.',
    true,
    true,
    3
  )
ON CONFLICT (id) DO NOTHING;

-- 7. Site Settings (Números da Trajetória & Configurações Institucionais)
INSERT INTO public.site_settings (key, value, description)
VALUES
  (
    'trajectory_metrics',
    '{"experience_years": 18, "certificates_issued": 4200, "students_impacted": 15000, "ebooks_published": 28, "courses_available": 24}'::jsonb,
    'Números exibidos na seção Trajetória da página inicial'
  ),
  (
    'contact_info',
    '{"email": "contato@natacaocriativa.com.br", "support_hours": "Segunda a sexta, das 9h às 18h", "cref_notice": "Chancelas e Metodologia em conformidade com as diretrizes do Conselho Federal de Educação Física."}'::jsonb,
    'Informações institucionais de atendimento e rodapé'
  )
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
