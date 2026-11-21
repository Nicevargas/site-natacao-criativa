import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword } from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
// Na Vercel o disco do projeto é só de leitura: lá os dados vão para a pasta temporária
// (somem quando o servidor reinicia). No computador, ficam em ./data.
const DATA_DIR = process.env.VERCEL ? path.join(os.tmpdir(), 'nc-data') : path.join(ROOT_DIR, 'data');
const DB_FILE = path.join(DATA_DIR, 'site-data.json');

function nowIso() {
  return new Date().toISOString();
}

function buildInitialData() {
  const defaultAdminEmail = process.env.ADMIN_EMAIL || 'admin@natacaocriativa.com.br';
  const defaultAdminPassword = process.env.ADMIN_PASSWORD || 'Natacao@2025';

  return {
    users: [
      {
        id: 'usr-admin-01',
        name: 'Renato Cordani',
        email: defaultAdminEmail,
        role: 'admin',
        title: 'Coordenação Pedagógica',
        active: true,
        passwordHash: hashPassword(defaultAdminPassword),
        lastLoginAt: null,
        createdAt: '2025-01-10T12:00:00.000Z',
        updatedAt: '2025-01-10T12:00:00.000Z',
      },
      {
        id: 'usr-coord-02',
        name: 'Mariana Silva',
        email: 'mariana@natacaocriativa.com.br',
        role: 'coordinator',
        title: 'Especialista Salvamento',
        active: true,
        passwordHash: hashPassword('Coord@2025'),
        lastLoginAt: null,
        createdAt: '2025-01-15T14:30:00.000Z',
        updatedAt: '2025-01-15T14:30:00.000Z',
      },
      {
        id: 'usr-editor-03',
        name: 'Prof. André Martins',
        email: 'andre@natacaocriativa.com.br',
        role: 'editor',
        title: 'Fisiologista Aquático',
        active: true,
        passwordHash: hashPassword('Editor@2025'),
        lastLoginAt: null,
        createdAt: '2025-02-01T09:00:00.000Z',
        updatedAt: '2025-02-01T09:00:00.000Z',
      },
    ],
    courses: [
      {
        id: 'crs-01',
        code: 'FOR-2025-01',
        title: 'Metodologia Lúdica e Segura da Natação Infantil',
        subtitle: 'Da Iniciação aos 4 Estilos sem traumas na água',
        description:
          'Abordagem pedagógica integrada para retenção e desenvolvimento motor sem traumas na água, concebendo aulas dinâmicas com segurança aquática.',
        category: 'Especialização Master',
        theme: 'natacao_infantil',
        format: 'Online Híbrido',
        modalityDetails: 'Gravado + 4 Encontros Síncronos',
        locationOrUrl: 'https://meet.natacaocriativa.com/turma-01',
        instructor: 'Renato Cordani',
        instructorInitials: 'RC',
        instructorRole: 'Coordenação Pedagógica',
        workload: '60h certificadas',
        status: 'aberto',
        isFree: false,
        enrolledCount: 42,
        maxCapacity: 50,
        priceFormatted: 'R$ 890,00',
        installmentInfo: 'ou 12x R$ 89,00',
        lotSummary: '2º Lote (Últimas 8)',
        startDate: '2025-03-14',
        startDateLabel: '14 Mar 2025',
        certificateBadge: 'Certificado Válido CREF',
        coverUrl:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCHV6xdYWqr3FlMxz-9f2525k4wA_f2zHq5L-ucMkTdZvSP3mkYtsU5WtxQ9Yu7ettL06Ww9TaY6vSelIztOox8ODT-gojeShsnf1VfVin3DqyGX3GjbfDM_7CFTcQel3Bhdr0krAJ4OGy1jzJqO7ZckjHMq3BmDooJMG95JpVhHPRs_ZpTal6SfgzCAT6L9dSafkAdk7kf3n_pxF-2LmgMR0_p6-dH44YKVCakaSw',
        lots: [
          { id: 'lot-1', name: '1º Lote Antecipado', price: 'R$ 740,00', status: 'esgotado', sold: 30, max: 30 },
          { id: 'lot-2', name: '2º Lote Vigente', price: 'R$ 890,00', status: 'vigente', sold: 12, max: 20 },
        ],
        featured: true,
        updatedAt: '2025-03-01T10:00:00.000Z',
      },
      {
        id: 'crs-02',
        code: 'PAL-2025-04',
        title: 'Biomecânica e Eficiência no Nado Crawl de Alta Performance',
        subtitle: 'Análise cinemática de pegada, rolamento corporal e redução de arrasto',
        description:
          'Análise cinemática e propulsiva para correção de arrasto e ganhos imediatos de velocidade e economia de esforço.',
        category: 'Palestra Exclusiva',
        theme: 'biomecanica',
        format: 'Híbrido',
        modalityDetails: 'São Paulo + Transmissão 4K',
        locationOrUrl: 'São Paulo/SP (e Online com replay)',
        instructor: 'Prof. André Martins',
        instructorInitials: 'AM',
        instructorRole: 'Fisiologista Aquático',
        workload: '8h masterclass',
        status: 'em_breve',
        isFree: false,
        enrolledCount: 0,
        maxCapacity: 150,
        waitlistCount: 128,
        priceFormatted: 'R$ 240,00',
        installmentInfo: 'Lote promocional',
        lotSummary: 'Lote Promocional Cardume',
        startDate: '2025-04-02',
        startDateLabel: '02 Abr 2025',
        certificateBadge: 'Ao Vivo + Gravação',
        coverUrl:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCLMbMBVJHlGuoBbDIXJRXST9BIikGCZ2eMOibajqRHKzHN9yjlgWd6a8g1zmhT6rvAxOUmFuuJw7ugD4Yf_RyEL8jt3VrFeXzl6aOMyf99l7p4xaEF5t1Za44iL2wTzOjmP51ec-HvIHJiBOGatSHQWRwNkH8mXuEZCLwcsJ-ZZr4AOyfTM3Nf_oB1_bAWaL0k7YGfn76N-Mi0mVr5Sr2d4J5x_owjriv-3k8DV9g',
        lots: [{ id: 'lot-3', name: 'Lote Promocional Cardume', price: 'R$ 240,00', status: 'programado', sold: 0, max: 150 }],
        featured: true,
        updatedAt: '2025-03-02T10:00:00.000Z',
      },
      {
        id: 'crs-03',
        code: 'WKS-2025-02',
        title: 'Fundamentos de Segurança Aquática e Prevenção de Incidentes',
        subtitle: 'Protocolos de prevenção a afogamentos e suporte básico',
        description:
          'Protocolos essenciais para professores e academias minimizarem riscos, realizarem resgate rápido e aplicarem condutas de suporte básico.',
        category: 'Workshop Prático',
        theme: 'seguranca_salvamento',
        format: 'Online ao Vivo',
        modalityDetails: 'Zoom Integrado + Gravação',
        locationOrUrl: 'Plataforma Natação Criativa',
        instructor: 'Mariana Silva',
        instructorInitials: 'MS',
        instructorRole: 'Especialista Salvamento',
        workload: '12h com simulação',
        status: 'aberto',
        isFree: true,
        enrolledCount: 290,
        maxCapacity: 300,
        priceFormatted: 'R$ 0,00',
        installmentInfo: '100% Gratuito',
        lotSummary: 'Acesso Social Cardume',
        startDate: '2025-03-22',
        startDateLabel: '22 Mar 2025',
        certificateBadge: 'Certificado Chancelado',
        coverUrl:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBZ8H3UxD70SihC6_TjtuStykN7uA-SphBEFEya8mTDzX03U_hqiMjqi6UvrW55OCpSrI2C2k1HaPe-ctMyVBAB13kxNw1x9lG-qPn3efxOuaoAwg5LryknRfhtC7Ku9yDnmt-mYeELsaHBEKzFcsW3ejpN9sKrkVh9HXwyMVcESA7Ekur6cdeZJK7lDpqUlb4NfSXejcOSlK9Bn1gU3jv1lXUmXt17D0gHybjCVoQ',
        lots: [{ id: 'lot-4', name: 'Acesso Social Cardume', price: 'R$ 0,00', status: 'vigente', sold: 290, max: 300 }],
        featured: true,
        updatedAt: '2025-03-03T10:00:00.000Z',
      },
      {
        id: 'crs-04',
        code: 'FOR-2025-08',
        title: 'Personal Trainer Aquático: Da Reabilitação ao Alto Rendimento',
        subtitle: 'Especialização 100% Online com Prática Supervisionada',
        description:
          'Domine a prescrição individualizada, periodização em água aquecida e atendimento diferenciado de alto valor.',
        category: 'Pós-Graduação',
        theme: 'personal_aquatico',
        format: 'Híbrido',
        modalityDetails: 'Módulos EAD + Prática em Polo',
        locationOrUrl: 'Curitiba/PR e Ambiente Virtual',
        instructor: 'Renato Cordani & Convidados',
        instructorInitials: 'RC',
        instructorRole: 'Corpo Docente',
        workload: '120h Pós-Graduação',
        status: 'aberto',
        isFree: false,
        enrolledCount: 28,
        maxCapacity: 35,
        priceFormatted: 'R$ 1.650,00',
        installmentInfo: 'R$ 480 /mês',
        lotSummary: '1º Lote encerra hoje',
        startDate: '2025-04-10',
        startDateLabel: '10 Abr 2025',
        certificateBadge: 'Certificação MEC',
        coverUrl:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuDLV_5-7_qRcPPQ1yr1sf-D_e9Me5Uynxyc-s0f3PwTKn5tLNafms1G8QDnKkr2qeciQwMc4tCZeW8yYnoGR8N25bNjXWqNeiDWrmW85--vE7SjJOn9s_pzxnmXoOeOacZrNPAL9METM6dYjZdTFlZn6ciICakoWR0Sm2IAcSF5NY7H-30DuJQvpqcHdJ1DxfbhNa50la_PklIANNwqGQEU8_ZeTFA1fBiS5iDhOss',
        lots: [{ id: 'lot-5', name: '1º Lote Pós-Graduação', price: 'R$ 1.650,00', status: 'vigente', sold: 28, max: 35 }],
        featured: true,
        updatedAt: '2025-03-04T10:00:00.000Z',
      },
      {
        id: 'crs-05',
        code: 'LAB-2025-01',
        title: 'Laboratório Prático de Correção de Nados e Análise de Vídeo',
        subtitle: 'Imersão Presencial de Borda de Piscina',
        description:
          'Identificação de erros biomecânicos em tempo real com metodologia exclusiva de filmagem subaquática e correção cinemática.',
        category: 'Imersão Prática',
        theme: 'biomecanica',
        format: 'Presencial',
        modalityDetails: 'Clube Mackenzie Aquática · BH/MG',
        locationOrUrl: 'Belo Horizonte / MG',
        instructor: 'Fernando Loureiro',
        instructorInitials: 'FL',
        instructorRole: 'Analista de Desempenho',
        workload: '24h Intensivas',
        status: 'encerrado',
        isFree: false,
        enrolledCount: 20,
        maxCapacity: 20,
        priceFormatted: 'R$ 1.150,00',
        installmentInfo: 'Lista de espera aberta',
        lotSummary: 'Lote Final Concluído',
        startDate: '2025-02-15',
        startDateLabel: '15 Fev 2025',
        certificateBadge: '16 Horas Práticas',
        coverUrl:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuDJqK4oLaWbIevH_gSEChEqjSIEVs67I9wREMY-gGVJaJknG9zFo-NdgKb95ng-4WlqxBV_KVFtFGEEMVy4wm1CczmsXhXVtO26j2gvXfVwRd84JB2Utb8ov_RypZ2mNqkgEwJEREgL7i8Zn4RH0TC7802nBBQdW_kxUtFDCnjYvAeBEJJKkxAWJIJGI7ff0Ru33DoAIPMumibCok-4ENCSXD4k6CKTdzGAd4e4Ei8',
        lots: [{ id: 'lot-6', name: 'Lote Final', price: 'R$ 1.150,00', status: 'esgotado', sold: 20, max: 20 }],
        featured: false,
        updatedAt: '2025-02-20T10:00:00.000Z',
      },
      {
        id: 'crs-06',
        code: 'WKS-2025-05',
        title: 'Gestão de Escolas de Natação: Captação e Retenção no Inverno',
        subtitle: 'Estratégias comerciais, pedagógicas e motivacionais contra sazonalidade',
        description:
          'Estratégias comerciais, pedagógicas e motivacionais para combater a sazonalidade e manter elevada a taxa de rematrícula.',
        category: 'Workshop Temático',
        theme: 'gestao_escolas',
        format: 'Online ao Vivo',
        modalityDetails: 'Mentoria em Grupo Fechado',
        locationOrUrl: 'E-learning Natação Criativa',
        instructor: 'Renato Cordani',
        instructorInitials: 'RC',
        instructorRole: 'Consultoria Academy',
        workload: '16h executivo',
        status: 'rascunho',
        isFree: false,
        enrolledCount: 0,
        maxCapacity: 40,
        priceFormatted: 'R$ 520,00',
        installmentInfo: 'Acesso vitalício',
        lotSummary: 'Definindo Lote 1',
        startDate: '',
        startDateLabel: 'A definir (Mai 2025)',
        certificateBadge: 'Planilhas Inclusas',
        coverUrl: '',
        lots: [{ id: 'lot-7', name: 'Lote 1 (Planejamento)', price: 'R$ 520,00', status: 'programado', sold: 0, max: 40 }],
        featured: false,
        updatedAt: '2025-03-05T10:00:00.000Z',
      },
    ],
    highlights: [
      {
        id: 'hl-1',
        badge: 'PÓS-GRADUAÇÃO',
        title: 'Natação Aplicada ao Personal Trainer Aquático',
        subtitle: 'Especialização 100% Online com Prática Supervisionada',
        ctaLabel: 'Conheça a formação',
        ctaUrl: '/formacoes',
        trustBadge: 'Certificação Reconhecida',
        imageCaption: 'Inscrições com Vagas Limitadas',
        sortOrder: 1,
        active: true,
      },
      {
        id: 'hl-2',
        badge: 'GRUPO DE ESTUDOS',
        title: 'Aula ao vivo + gravação',
        subtitle: 'Encontros quinzenais com discussão de casos reais e suporte contínuo',
        ctaLabel: 'Ver programação',
        ctaUrl: '/formacoes',
        trustBadge: 'Interação Direta ao Vivo',
        imageCaption: 'Encontros Quinzenais',
        sortOrder: 2,
        active: true,
      },
      {
        id: 'hl-3',
        badge: 'TREINOS',
        title: '30 dias para evoluir com direção',
        subtitle: 'Periodização prática para piscina com foco em eficiência e condicionamento',
        ctaLabel: 'Experimentar agora',
        ctaUrl: '/formacoes',
        trustBadge: 'Planilhas Digitais Inclusas',
        imageCaption: 'Acompanhamento e Metas',
        sortOrder: 3,
        active: true,
      },
    ],
    contents: [
      {
        id: 'cnt-1',
        channel: 'podcast',
        title: 'A Revolução do Personal Trainer Aquático',
        summary: 'Conversa com especialistas sobre precificação, montagem de turmas exclusivas e posicionamento de mercado.',
        badgeMeta: 'Duração: 48 min · Episódio #412',
        externalUrl: 'https://open.spotify.com',
        ctaLabel: 'Ouvir no Spotify',
        published: true,
        updatedAt: '2025-03-01T10:00:00.000Z',
      },
      {
        id: 'cnt-2',
        channel: 'video',
        title: 'Passo a Passo dos Educativos de Virada Olímpica',
        summary: 'Progressão didática segura para ensinar cambalhota e impulsão eficiente na parede sem perda de velocidade.',
        badgeMeta: 'Publicado há 5 dias',
        externalUrl: 'https://youtube.com',
        ctaLabel: 'Assistir no YouTube',
        published: true,
        updatedAt: '2025-03-01T10:00:00.000Z',
      },
      {
        id: 'cnt-3',
        channel: 'artigo',
        title: '3 Dicas Práticas de Respiração Lateral sem Desequilíbrio',
        summary: 'Como manter o alinhamento corporal na respiração do crawl e evitar o afundamento do quadril.',
        badgeMeta: 'Leitura de 5 minutos',
        externalUrl: 'https://instagram.com/natacaocriativa',
        ctaLabel: 'Ver no Instagram',
        published: true,
        updatedAt: '2025-03-01T10:00:00.000Z',
      },
      {
        id: 'cnt-4',
        channel: 'ebook',
        title: 'Guia de Adaptação ao Meio Líquido sem Traumas',
        summary: 'Etapas, sinais de prontidão e brincadeiras para a criança ganhar confiança na água no tempo dela.',
        badgeMeta: 'Gratuito · PDF',
        externalUrl: '/loja',
        ctaLabel: 'Baixar',
        published: true,
        updatedAt: '2025-03-01T10:00:00.000Z',
      },
      {
        id: 'cnt-5',
        channel: 'planilha',
        title: 'Planejamento Semanal de Aulas por Nível',
        summary: 'Modelo pronto para organizar objetivos, educativos e avaliação de cada turma ao longo da semana.',
        badgeMeta: 'Editável',
        externalUrl: '/loja',
        ctaLabel: 'Baixar',
        published: true,
        updatedAt: '2025-03-01T10:00:00.000Z',
      },
    ],
    storeItems: [
      {
        id: 'str-1',
        category: 'ebook',
        title: '100 Jogos e Brincadeiras para a Natação Infantil',
        summary: 'Atividades organizadas por faixa etária e objetivo, para aulas lúdicas e seguras.',
        badge: 'Mais procurado',
        price: 'R$ 47',
        delivery: 'Entrega imediata por e-mail',
        active: true,
      },
      {
        id: 'str-2',
        category: 'planilha',
        title: 'Planejamento Anual de Turmas por Nível',
        summary: 'Objetivos, conteúdos e avaliações distribuídos ao longo do ano, prontos para adaptar.',
        badge: 'Editável',
        price: 'R$ 37',
        delivery: 'Entrega imediata por e-mail',
        active: true,
      },
      {
        id: 'str-3',
        category: 'apostila',
        title: 'Educativos dos Quatro Nados: Guia Ilustrado',
        summary: 'Sequências pedagógicas de crawl, costas, peito e borboleta, do básico ao aperfeiçoamento.',
        badge: 'Com ilustrações',
        price: 'R$ 57',
        delivery: 'Entrega imediata por e-mail',
        active: true,
      },
      {
        id: 'str-4',
        category: 'ebook',
        title: 'Segurança Aquática para Famílias',
        summary: 'Cuidados simples em casa, na piscina e na praia para prevenir afogamentos.',
        badge: 'Gratuito',
        price: 'R$ 0,00',
        delivery: 'PDF · leitura rápida',
        active: true,
      },
      {
        id: 'str-5',
        category: 'planilha',
        title: 'Controle de Matrículas, Frequência e Retenção',
        summary: 'Acompanhe entradas, saídas e faltas e enxergue onde a escola perde alunos.',
        badge: 'Para gestores',
        price: 'R$ 67',
        delivery: 'Entrega imediata por e-mail',
        active: true,
      },
      {
        id: 'str-6',
        category: 'kit',
        title: 'Kit do Professor Criativo',
        summary: 'E-book de jogos, apostila dos quatro nados e planilha de planejamento em um só pacote.',
        badge: 'Melhor custo',
        price: 'R$ 117',
        delivery: '3 materiais no mesmo pedido',
        active: true,
      },
    ],
    testimonials: [
      {
        id: 'tst-1',
        authorName: 'Camila Vasconcelos',
        authorRoleLocation: 'Professora e Personal Aquática · São Paulo/SP',
        quote:
          'A formação de Personal Trainer Aquático mudou totalmente a minha abordagem na borda da piscina. Consegui estruturar planos de aula mais claros, precificar meu trabalho com dignidade e dobrar minha carteira de alunos particulares.',
        verified: true,
        published: false,
        sortOrder: 1,
      },
      {
        id: 'tst-2',
        authorName: 'Rodrigo Alcantara',
        authorRoleLocation: 'Coordenador Pedagógico · Curitiba/PR',
        quote:
          'Como gestor de academia de natação, as capacitações da Natação Criativa elevaram o padrão de atendimento de toda a minha equipe. O método lúdico reduziu drasticamente o cancelamento de matrículas infantis no inverno.',
        verified: true,
        published: false,
        sortOrder: 2,
      },
      {
        id: 'tst-3',
        authorName: 'Mariana Silveira',
        authorRoleLocation: 'Mãe do Theo (5 anos) · Belo Horizonte/MG',
        quote:
          'Meu filho de 5 anos tinha pavor de colocar a cabeça na água. A visão de respeito e adaptação gradual apresentada pelos cursos me deu segurança como mãe para escolher a escola certa e acompanhar a evolução dele com tranquilidade.',
        verified: true,
        published: false,
        sortOrder: 3,
      },
    ],
    certificates: [
      {
        id: 'crt-1',
        validationCode: 'NC-2025-001001',
        recipientName: 'Camila Vasconcelos',
        courseTitle: 'Personal Trainer Aquático: Da Reabilitação ao Alto Rendimento',
        workloadHours: 120,
        chancelaInfo: 'Conformidade CREF / Natação Criativa',
        issuedAt: '2025-02-18',
        isValid: true,
      },
      {
        id: 'crt-2',
        validationCode: 'NC-2025-001002',
        recipientName: 'Rodrigo Alcantara',
        courseTitle: 'Metodologia Lúdica e Segura da Natação Infantil',
        workloadHours: 60,
        chancelaInfo: 'Conformidade CREF / Natação Criativa',
        issuedAt: '2025-02-25',
        isValid: true,
      },
    ],
    cardumeSubscribers: [
      {
        id: 'sub-1',
        email: 'camila.vasconcelos@exemplo.com.br',
        profileType: 'professor',
        sourcePage: 'home',
        status: 'ativo',
        subscribedAt: '2025-02-10T11:20:00.000Z',
      },
      {
        id: 'sub-2',
        email: 'rodrigo.alcantara@exemplo.com.br',
        profileType: 'gestor',
        sourcePage: 'formacoes',
        status: 'ativo',
        subscribedAt: '2025-02-19T15:45:00.000Z',
      },
      {
        id: 'sub-3',
        email: 'mariana.silveira@exemplo.com.br',
        profileType: 'familia',
        sourcePage: 'conteudos',
        status: 'ativo',
        subscribedAt: '2025-03-01T09:15:00.000Z',
      },
    ],
    inquiries: [
      {
        id: 'inq-1',
        type: 'consultoria_academia',
        name: 'Academia Águas Claras',
        email: 'contato@aguasclaras.com.br',
        profileType: 'Gestor(a)',
        subject: 'Consultoria para escolas e academias',
        message: 'Gostaria de proposta para capacitação in-company da equipe de 12 professores.',
        status: 'em_atendimento',
        createdAt: '2025-03-02T14:00:00.000Z',
      },
      {
        id: 'inq-2',
        type: 'suporte',
        name: 'Lucas Ferreira',
        email: 'lucas.ferreira@exemplo.com.br',
        profileType: 'Professor(a)',
        subject: 'Formações e matrículas',
        message: 'Há desconto para inscrição de 3 professores da mesma escola na Pós-Graduação?',
        status: 'novo',
        createdAt: '2025-03-04T16:30:00.000Z',
      },
    ],
    settings: {
      brandName: 'NATAÇÃO CRIATIVA',
      brandTagline: 'A natação além da piscina',
      platformTitle: 'Plataforma Natação Criativa',
      experienceYears: 18,
      certificatesIssued: 4200,
      studentsImpacted: 15000,
      ebooksPublished: 28,
      coursesAvailable: 24,
      contactEmail: 'contato@natacaocriativa.com.br',
      supportHours: 'Segunda a sexta, das 9h às 18h',
      whatsappLabel: 'Atendimento Direto',
      crefNotice: 'Chancelas e Metodologia em conformidade com as diretrizes do Conselho Federal de Educação Física.',
      cardumeHeadline: 'Entre para o Cardume Criativo',
      cardumeSubtitle:
        'Receba novos cursos, episódios, treinos, e-books e oportunidades da Natação Criativa antes de todo mundo.',
      lastPublishedAt: nowIso(),
    },
    privacyPolicy: {
      title: 'Política de Privacidade e Proteção de Dados (LGPD)',
      version: '2.0',
      updatedAt: '2025-03-10',
      controllerName: 'Plataforma Natação Criativa Educacional',
      dpoEmail: 'privacidade@natacaocriativa.com.br',
      summary:
        'Esta Política de Privacidade descreve como a Plataforma Natação Criativa coleta, utiliza, armazena e protege os dados pessoais de alunos, professores, gestores, famílias e visitantes em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).',
      cookieBannerText:
        'Utilizamos cookies essenciais de autenticação, preferências de navegação e métricas de desempenho para melhorar sua experiência na Plataforma Natação Criativa.',
      sections: [
        {
          id: 'pp-1',
          heading: '1. Dados Pessoais Coletados',
          body: 'Coletamos apenas os dados estritamente necessários para a prestação dos nossos serviços educacionais: nome completo, endereço de e-mail, perfil de atuação (professor, gestor, família ou aluno), telefone de contato, registro profissional (quando aplicável à emissão de certificados chancelados) e mensagens enviadas voluntariamente nos formulários de atendimento, lista de espera e comunidade Cardume Criativo.',
        },
        {
          id: 'pp-2',
          heading: '2. Finalidades e Bases Legais do Tratamento',
          body: 'Os dados são tratados para: (a) execução de contrato e viabilização de matrículas em cursos, workshops e pós-graduações; (b) emissão, registro e validação pública de certificados por código único; (c) atendimento de solicitações comerciais, consultorias e aulas personalizadas; (d) envio de conteúdos e novidades do Cardume Criativo mediante consentimento expresso, revogável a qualquer momento; e (e) cumprimento de obrigações legais e regulatórias.',
        },
        {
          id: 'pp-3',
          heading: '3. Compartilhamento e Segurança da Informação',
          body: 'A Natação Criativa não comercializa nem cede listas de dados a terceiros. O acesso administrativo é protegido por autenticação individual, senhas criptografadas, controle de permissões por perfil e trilhas de auditoria. Dados podem ser processados apenas por provedores de infraestrutura e emissão acadêmica necessários à operação da plataforma, sob cláusulas de confidencialidade.',
        },
        {
          id: 'pp-4',
          heading: '4. Cookies e Tecnologias de Sessão',
          body: 'Utilizamos armazenamento local e cookies HTTP estritamente necessários para manter a sessão autenticada da área administrativa, preservar preferências de interface e registrar a ciência sobre esta Política de Privacidade. Você pode gerenciar cookies diretamente nas configurações do seu navegador.',
        },
        {
          id: 'pp-5',
          heading: '5. Direitos do Titular e Encarregado (DPO)',
          body: 'Nos termos do art. 18 da LGPD, você pode solicitar confirmação da existência de tratamento, acesso, correção de dados incompletos ou desatualizados, anonimização, portabilidade ou eliminação dos dados tratados com base no consentimento. Para exercer seus direitos ou solicitar a remoção da lista Cardume Criativo, utilize a página de Atendimento ou escreva para o Encarregado de Dados.',
        },
      ],
      termsTitle: 'Termos de Uso da Plataforma Natação Criativa',
      termsBody:
        'O acesso às formações, e-books, planilhas, apostilas e certificados digitais é pessoal e intransferível. O código de validação dos certificados permite a conferência pública de autenticidade por empregadores e instituições de ensino. Todo o conteúdo pedagógico e metodológico é protegido por direitos autorais.',
    },
    auditLogs: [
      {
        id: 'log-1',
        actorName: 'Renato Cordani',
        actorEmail: defaultAdminEmail,
        action: 'published',
        entity: 'site',
        summary: 'Estrutura inicial do site e Política de Privacidade LGPD publicadas.',
        createdAt: nowIso(),
      },
    ],
  };
}

export function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial = buildInitialData();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
  }
}

// ----------------------------------------------------------------------------
// Armazenamento remoto (Supabase): torna os dados do painel permanentes.
// Sem ele, tudo fica só no arquivo local (que na Vercel é temporário).
// ----------------------------------------------------------------------------
const VALIDADE_DA_COPIA_MS = 15000;
let remoto = null; // { nome, carregar(), salvar(dados) }
let copia = null; // última versão conhecida dos dados (texto JSON)
let copiaEm = 0;
let gravacao = null; // gravação remota em andamento
let remotoPronto = false; // só grava no remoto depois de ter conseguido ler de lá
let ultimoErroRemoto = null; // para diagnóstico em /api/painel/status

export function usarArmazenamentoRemoto(armazenamento) {
  remoto = armazenamento || null;
  copia = null;
  copiaEm = 0;
  remotoPronto = false;
}

export function armazenamentoRemotoAtivo() {
  return Boolean(remoto);
}

export function estadoDoRemoto() {
  return {
    dadosPermanentes: Boolean(remoto) && remotoPronto,
    chaveConfigurada: Boolean(remoto),
    ultimoErro: ultimoErroRemoto,
    tabelas: remoto?.diagnostico?.() ?? null,
  };
}

// Espera a gravação remota terminar (o servidor chama isto antes de responder).
export function aguardarGravacao() {
  return gravacao || Promise.resolve();
}

// Traz do remoto a versão mais recente. `forcar` ignora a cópia em memória
// (usado antes de qualquer alteração, para não gravar por cima de dados novos).
export async function sincronizarDoRemoto({ forcar = false } = {}) {
  if (!remoto) return;
  await aguardarGravacao();
  if (!forcar && copia && Date.now() - copiaEm < VALIDADE_DA_COPIA_MS) return;
  try {
    let dados = await remoto.carregar();
    if (!dados) {
      // O remoto diz que não há nada gravado. Tenta criar com os dados iniciais, numa
      // operação que só funciona se o arquivo realmente não existir (nunca grava por cima).
      ensureDataFile();
      const iniciais = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      const criou = await remoto.semear(iniciais);
      dados = criou ? iniciais : await remoto.carregar();
      if (!dados) throw new Error('o arquivo existe no Supabase, mas não foi possível lê-lo');
    }
    copia = JSON.stringify(dados);
    copiaEm = Date.now();
    remotoPronto = true;
    ultimoErroRemoto = null;
  } catch (erro) {
    // Falhou a leitura: segue com a cópia que já temos e NUNCA grava dados iniciais por cima.
    ultimoErroRemoto = 'leitura: ' + String(erro?.message || erro).slice(0, 200);
    console.error('[painel] não foi possível ler os dados no Supabase:', erro?.message || erro);
  }
}

export function readDb() {
  if (remoto && copia) return JSON.parse(copia);
  ensureDataFile();
  const raw = fs.readFileSync(DB_FILE, 'utf8');
  return JSON.parse(raw);
}

export function writeDb(data) {
  const texto = JSON.stringify(data, null, 2);
  try {
    ensureDataFile();
    fs.writeFileSync(DB_FILE, texto, 'utf8');
  } catch (erro) {
    if (!remoto) throw erro;
  }
  if (remoto && !remotoPronto) {
    console.error('[painel] alteração NÃO gravada no Supabase: a leitura inicial ainda não funcionou.');
  }
  if (remoto && remotoPronto) {
    copia = texto;
    copiaEm = Date.now();
    const anterior = gravacao || Promise.resolve();
    const atual = anterior
      .then(() => remoto.salvar(JSON.parse(texto)))
      .catch((erro) => {
        ultimoErroRemoto = 'gravação: ' + String(erro?.message || erro).slice(0, 200);
        console.error('[painel] não foi possível gravar os dados no Supabase:', erro?.message || erro);
      })
      .finally(() => {
        if (gravacao === atual) gravacao = null;
      });
    gravacao = atual;
  }
  return data;
}

export function appendAuditLog(db, actor, action, entity, summary) {
  db.auditLogs = db.auditLogs || [];
  db.auditLogs.unshift({
    id: `log-${crypto.randomUUID().slice(0, 8)}`,
    actorName: actor?.name || 'Sistema',
    actorEmail: actor?.email || 'sistema@natacaocriativa.com.br',
    action,
    entity,
    summary,
    createdAt: nowIso(),
  });
  if (db.auditLogs.length > 100) {
    db.auditLogs = db.auditLogs.slice(0, 100);
  }
}

export function getPublicSnapshot(db) {
  const publishedCourses = (db.courses || [])
    .filter((c) => c.status !== 'rascunho')
    .map(({ paymentUrl, pixKey, pixName, ...c }) => ({
      ...c,
      temPagamento: Boolean(paymentUrl || pixKey),
      locationOrUrl: /^https?:/i.test(c.locationOrUrl || '') ? '' : c.locationOrUrl,
    }));
  return {
    courses: publishedCourses,
    highlights: (db.highlights || []).filter((h) => h.active).sort((a, b) => a.sortOrder - b.sortOrder),
    contents: (db.contents || []).filter((c) => c.published),
    storeItems: (db.storeItems || []).filter((s) => s.active),
    partners: (db.partners || []).filter((p) => p.active !== false),
    testimonials: (db.testimonials || []).filter((t) => t.published).sort((a, b) => a.sortOrder - b.sortOrder),
    settings: db.settings,
    privacyPolicy: db.privacyPolicy,
  };
}

export function sanitizeUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}
