// Guarda os dados do painel admin no Supabase, para não se perderem quando a Vercel reinicia.
//
// Os dados ficam num único arquivo JSON dentro de um bucket PRIVADO do Storage
// (só a chave service_role, que fica no servidor, consegue ler e gravar).
// Precisa das variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.
import { createSupabaseServiceClient } from './supabaseAuth.js';
import { espelharNasTabelas } from './espelho.js';

const BUCKET = 'painel-admin';
const CAMINHO = 'dados/site-data.json';
const TRAVA = 'dados/trava.json';
const TRAVA_VENCE_MS = 30000; // trava de um servidor que caiu no meio da alteração
const TRAVA_ESPERA_MS = 20000;

const texto = (erro) => String(erro?.message || erro || '');
const naoExiste = (erro) => /not found/i.test(texto(erro)) || erro?.status === 404 || erro?.statusCode === '404';
const bucketNaoExiste = (erro) => /bucket not found/i.test(texto(erro));
const jaExiste = (erro) => /already exists|duplicate/i.test(texto(erro)) || erro?.status === 409 || erro?.statusCode === '409';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const limparEtag = (v) => String(v || '').replace(/^W\//, '').replace(/"/g, '');

export function criarEstadoRemoto() {
  const cliente = createSupabaseServiceClient();
  if (!cliente) return null;

  const arquivo = () => cliente.storage.from(BUCKET);
  const corpo = (dados) => Buffer.from(JSON.stringify(dados), 'utf8');
  const opcoes = (upsert) => ({ upsert, contentType: 'application/json', cacheControl: '0' });

  // Depois de guardar o arquivo, copia os dados para as tabelas do banco.
  // Um erro aqui não desfaz a gravação: fica registrado no diagnóstico.
  let ultimoEspelho = null;
  async function espelhar(dados) {
    try {
      ultimoEspelho = await espelharNasTabelas(cliente, dados);
    } catch (erro) {
      ultimoEspelho = { em: new Date().toISOString(), erro: String(erro?.message || erro).slice(0, 200) };
    }
  }

  async function garantirBucket() {
    const { error } = await cliente.storage.createBucket(BUCKET, { public: false });
    if (error && !jaExiste(error)) throw error;
  }

  async function infoDoArquivo(nome) {
    const { data, error } = await arquivo().list('dados', { search: nome, limit: 5 });
    if (error) throw error;
    return (data || []).find((item) => item.name === nome) || null;
  }

  // Lê o arquivo sem passar por cache: a lista de arquivos diz qual é a versão atual
  // e a leitura confere se recebeu exatamente essa versão.
  async function lerVersaoAtual() {
    const base = String(process.env.SUPABASE_URL).replace(/\/+$/, '');
    const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let ultimo = null;
    for (let tentativa = 0; tentativa < 4; tentativa += 1) {
      const info = await infoDoArquivo('site-data.json');
      if (!info) return null;
      const versao = limparEtag(info.metadata?.eTag);
      const url = `${base}/storage/v1/object/authenticated/${BUCKET}/${CAMINHO}?v=${encodeURIComponent(versao)}&t=${Date.now()}`;
      const resposta = await fetch(url, {
        cache: 'no-store',
        headers: { apikey: chave, Authorization: `Bearer ${chave}`, 'Cache-Control': 'no-cache' },
      });
      if (!resposta.ok) throw Object.assign(new Error(`leitura direta: ${resposta.status}`), { leituraDireta: true });
      ultimo = await resposta.text();
      const recebida = limparEtag(resposta.headers.get('etag'));
      if (!versao || !recebida || versao === recebida) return JSON.parse(ultimo);
      await pausa(150);
    }
    console.error('[painel] a versão lida não bateu com a lista de arquivos; usando a leitura sem cache.');
    return JSON.parse(ultimo);
  }

  return {
    nome: `Supabase Storage (${BUCKET}/${CAMINHO})`,
    diagnostico: () => ultimoEspelho,

    // Devolve os dados gravados, ou null quando o arquivo ainda não existe.
    // Qualquer outro problema vira erro, para nunca confundir "falhou" com "está vazio".
    async carregar() {
      try {
        return await lerVersaoAtual();
      } catch (erro) {
        if (!erro?.leituraDireta) throw erro;
        console.error('[painel]', erro.message, '- tentando a leitura padrão.');
      }
      const { data, error } = await arquivo().download(CAMINHO);
      if (error) {
        if (naoExiste(error)) return null;
        throw error;
      }
      return JSON.parse(await data.text());
    },

    // Cria o arquivo SOMENTE se ele ainda não existir (nunca grava por cima).
    // Devolve true se criou e false se já havia dados lá.
    async semear(dados) {
      let { error } = await arquivo().upload(CAMINHO, corpo(dados), opcoes(false));
      if (error && bucketNaoExiste(error)) {
        await garantirBucket();
        ({ error } = await arquivo().upload(CAMINHO, corpo(dados), opcoes(false)));
      }
      if (!error) {
        await espelhar(dados);
        return true;
      }
      if (jaExiste(error)) return false;
      throw error;
    },

    // Só um servidor por vez altera os dados. Criar o arquivo da trava é uma operação
    // que falha se ele já existir, então dois servidores nunca a pegam juntos.
    async travar() {
      const limite = Date.now() + TRAVA_ESPERA_MS;
      const conteudo = Buffer.from(JSON.stringify({ em: new Date().toISOString() }), 'utf8');
      while (Date.now() < limite) {
        let { error } = await arquivo().upload(TRAVA, conteudo, opcoes(false));
        if (error && bucketNaoExiste(error)) {
          await garantirBucket();
          ({ error } = await arquivo().upload(TRAVA, conteudo, opcoes(false)));
        }
        if (!error) return;
        if (!jaExiste(error)) throw error;
        const info = await infoDoArquivo('trava.json');
        if (info?.created_at && Date.now() - new Date(info.created_at).getTime() > TRAVA_VENCE_MS) {
          await arquivo().remove([TRAVA]);
          continue;
        }
        await pausa(120 + Math.random() * 180);
      }
      throw new Error('outra alteração ainda está sendo salva');
    },

    async destravar() {
      const { error } = await arquivo().remove([TRAVA]);
      if (error) console.error('[painel] não foi possível soltar a trava:', texto(error));
    },

    async salvar(dados) {
      const { error } = await arquivo().upload(CAMINHO, corpo(dados), opcoes(true));
      if (error) throw error;
      await espelhar(dados);
    },
  };
}
