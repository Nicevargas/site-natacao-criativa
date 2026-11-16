// Monta mascote/base.json: tudo o que a foca do suporte sabe responder.
// Rode de novo sempre que mudar os textos do site:  node mascote/gerar-base.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// 1) Respostas escritas à mão, com base nas informações do site.
const fixas = [
  { t: 'Pós-Graduação em Personal Trainer Aquático', l: '/formacoes', k: 'pos graduacao posgraduacao especializacao personal trainer aquatico mec',
    r: 'A pós-graduação "Natação Aplicada ao Personal Trainer Aquático" é uma especialização 100% online com prática supervisionada. As inscrições têm vagas limitadas. Veja os detalhes no catálogo de Formações.' },
  { t: 'Formações, cursos, palestras e workshops', l: '/formacoes', k: 'formacao formacoes curso cursos palestra workshop catalogo imersao aula estudar aprender turma inscricao matricula matricular',
    r: 'O catálogo reúne cursos, palestras, workshops e imersões para profissionais, gestores e entusiastas da água, com opções online, ao vivo e presenciais. Para se matricular, escolha a formação e clique em "Saiba mais".' },
  { t: 'Quanto custam as formações', l: '/formacoes', k: 'preco precos valor valores custa quanto investimento mensalidade pagar parcelar gratuito gratis',
    r: 'Cada formação mostra o investimento no próprio card do catálogo. Há opções gratuitas, lotes promocionais e parcelamento, conforme o curso.' },
  { t: 'Certificados: como emitir', l: '/certificados', k: 'certificado certificados emitir emissao baixar download diploma comprovante segunda via',
    r: 'Depois de concluir a formação e as atividades, o certificado fica disponível em PDF na Área do Aluno, com seu nome, a carga horária e um código único. Você pode baixar quantas vezes precisar.' },
  { t: 'Certificados: como validar', l: '/certificados', k: 'validar validacao autenticidade codigo conferir verdadeiro verificar',
    r: 'Na página Certificados, digite o código que aparece no rodapé do certificado. Se precisar de confirmação imediata, fale com o atendimento informando o código.' },
  { t: 'Loja: e-books, planilhas e apostilas', l: '/loja', k: 'loja comprar compra ebook ebooks livro planilha planilhas apostila apostilas material materiais kit produto',
    r: 'A Loja tem e-books, planilhas, apostilas e kits com entrega digital por e-mail. O pedido é fechado com o atendimento, que envia o link de pagamento.' },
  { t: 'Conteúdos gratuitos', l: '/conteudos', k: 'conteudo conteudos podcast spotify youtube instagram video videos artigo artigos episodio entrevista dica dicas',
    r: 'Em Conteúdos você encontra o podcast (mais de 400 entrevistas no Spotify), vídeos no YouTube, pílulas pedagógicas no Instagram, artigos, e-books e planilhas.' },
  { t: 'Soluções para cada público', l: '/solucoes', k: 'solucao solucoes publico professor profissional gestor familia aluno caminho para quem serve',
    r: 'A Natação Criativa atende quatro públicos: Profissionais (formação e ferramentas), Gestores (escolas, clubes e academias), Famílias (natação infantil e segurança) e Alunos (treinos e evolução).' },
  { t: 'Consultoria para escolas e academias', l: '/solucoes', k: 'consultoria escola escolas academia academias clube gestao equipe capacitacao incompany in-company proposta retencao',
    r: 'Para escolas, clubes e academias há consultoria e capacitação in-company: treinamento da equipe, revisão da metodologia por nível e rotina de atendimento. Peça uma proposta pelo Atendimento.' },
  { t: 'Aulas personalizadas na piscina', l: '/atendimento', k: 'aula aulas personalizada personalizadas particular particulares individual acompanhamento medo trauma triathlon adulto crianca',
    r: 'Há aulas personalizadas e acompanhamento individual para adultos, crianças e atletas: superação do medo da água, aperfeiçoamento técnico ou preparação para provas. A disponibilidade é limitada por período; consulte pelo Atendimento.' },
  { t: 'Natação infantil e segurança', l: '/solucoes', k: 'infantil crianca criancas filho filha bebe seguranca afogamento adaptacao ludica ludico pais mae pai',
    r: 'Para as famílias, o site reúne orientações sobre como escolher a escola de natação, adaptação ao meio líquido sem traumas e prevenção de afogamentos. Há também formações de metodologia lúdica para professores.' },
  { t: 'Fale com o atendimento', l: '/atendimento', k: 'atendimento contato contatar falar email e-mail telefone whatsapp suporte ajuda duvida mensagem humano pessoa',
    r: 'Você pode escrever para contato@natacaocriativa.com.br ou enviar uma mensagem pelo formulário da página Atendimento.' },
  { t: 'Horário de atendimento', l: '/atendimento', k: 'horario hora horas funciona funcionamento aberto quando responde resposta prazo demora',
    r: 'O atendimento funciona de segunda a sexta, das 9h às 18h. As mensagens são respondidas por ordem de chegada.' },
  { t: 'Área do Aluno', l: '/admin', k: 'area aluno login entrar acessar acesso painel senha conta plataforma',
    r: 'A Área do Aluno fica no botão "Painel Admin / Aluno", no fim do menu lateral. É lá que você acessa suas formações e baixa os certificados.' },
  { t: 'Quem é o Renato e o que é a Natação Criativa', l: '/', k: 'renato fundador quem sobre historia projeto natacao criativa mentor proposito',
    r: 'A Natação Criativa foi fundada pelo Renato, especialista pedagógico, com a convicção de que a água é uma ferramenta de desenvolvimento motor, cognitivo e humano. Hoje é um ecossistema com podcast, formações continuadas, cursos temáticos e pós-graduação.' },
  { t: 'Cardume Criativo', l: '/', k: 'cardume comunidade newsletter novidades cadastro cadastrar inscrever lista receber',
    r: 'O Cardume Criativo é a comunidade da Natação Criativa. Quem entra recebe antes de todo mundo os novos cursos, episódios, e-books e oportunidades. O cadastro fica no fim de cada página.' },
];

// 2) O que está escrito nas páginas (cards e perguntas frequentes).
const texto = (html) => html
  .replace(/<span class="material-symbols-outlined[^>]*>[^<]*<\/span>/g, '')
  .replace(/<svg[\s\S]*?<\/svg>/g, '')
  .replace(/<\/(p|div|h2|h3|li|span|a)>/g, ' · ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ').replace(/(\s*·\s*)+/g, ' · ')
  .replace(/^\s*·\s*|\s*·\s*$/g, '').trim();

const PAGINAS = [
  ['forma_es_cat_logo_de_cursos_palestras_e_workshops', '/formacoes', 'Formações'],
  ['conteudos_nata_o_criativa', '/conteudos', 'Conteúdos'],
  ['loja_nata_o_criativa', '/loja', 'Loja'],
  ['solucoes_nata_o_criativa', '/solucoes', 'Soluções'],
  ['certificados_nata_o_criativa', '/certificados', 'Certificados'],
  ['atendimento_nata_o_criativa', '/atendimento', 'Atendimento'],
];
const BOTOES = /( · )?(Saiba mais|Comprar|Baixar|Ouvir|Assistir|Ler|Ver formações|Ver conteúdos|Pedir uma proposta|Falar com o atendimento)(?= · |$)/g;

const doSite = [];
for (const [pasta, link, nome] of PAGINAS) {
  const html = fs.readFileSync(path.join(raiz, pasta, 'code.html'), 'utf8');
  for (const m of html.matchAll(/<article[\s\S]*?<\/article>/g)) {
    const h2 = m[0].match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
    if (!h2) continue;
    const titulo = texto(h2[1]);
    const depois = texto(m[0].slice(m[0].indexOf('</h2>') + 5)).replace(BOTOES, '');
    const antes = texto(m[0].slice(0, m[0].indexOf('<h2')));
    doSite.push({ t: titulo, l: link, p: nome, k: antes, r: depois });
  }
  for (const m of html.matchAll(/<details[\s\S]*?<summary[^>]*>([\s\S]*?)<\/summary>\s*<p[^>]*>([\s\S]*?)<\/p>/g)) {
    doSite.push({ t: texto(m[1]), l: link, p: nome, k: '', r: texto(m[2]) });
  }
}

const base = [...fixas, ...doSite];
fs.writeFileSync(path.join(raiz, 'mascote', 'base.json'), JSON.stringify(base, null, 1));
console.log(`base.json: ${fixas.length} respostas fixas + ${doSite.length} tiradas das páginas`);
