// Guarda os dados do painel admin no Supabase, para não se perderem quando a Vercel reinicia.
//
// Os dados ficam num único arquivo JSON dentro de um bucket PRIVADO do Storage
// (só a chave service_role, que fica no servidor, consegue ler e gravar).
// Precisa das variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.
import { createSupabaseServiceClient } from './supabaseAuth.js';

const BUCKET = 'painel-admin';
const CAMINHO = 'dados/site-data.json';

const texto = (erro) => String(erro?.message || erro || '');
const naoExiste = (erro) => /not found/i.test(texto(erro)) || erro?.status === 404 || erro?.statusCode === '404';
const bucketNaoExiste = (erro) => /bucket not found/i.test(texto(erro));
const jaExiste = (erro) => /already exists|duplicate/i.test(texto(erro)) || erro?.status === 409 || erro?.statusCode === '409';

export function criarEstadoRemoto() {
  const cliente = createSupabaseServiceClient();
  if (!cliente) return null;

  const arquivo = () => cliente.storage.from(BUCKET);
  const corpo = (dados) => Buffer.from(JSON.stringify(dados), 'utf8');
  const opcoes = (upsert) => ({ upsert, contentType: 'application/json', cacheControl: '0' });

  async function garantirBucket() {
    const { error } = await cliente.storage.createBucket(BUCKET, { public: false });
    if (error && !jaExiste(error)) throw error;
  }

  return {
    nome: `Supabase Storage (${BUCKET}/${CAMINHO})`,

    // Devolve os dados gravados, ou null quando o arquivo ainda não existe.
    // Qualquer outro problema vira erro, para nunca confundir "falhou" com "está vazio".
    async carregar() {
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
      if (!error) return true;
      if (jaExiste(error)) return false;
      throw error;
    },

    async salvar(dados) {
      const { error } = await arquivo().upload(CAMINHO, corpo(dados), opcoes(true));
      if (error) throw error;
    },
  };
}
