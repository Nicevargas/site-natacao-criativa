// Guarda os dados do painel admin no Supabase, para não se perderem quando a Vercel reinicia.
//
// Os dados ficam num único arquivo JSON dentro de um bucket PRIVADO do Storage
// (só a chave service_role, que fica no servidor, consegue ler e gravar).
// Precisa das variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.
import { createSupabaseServiceClient } from './supabaseAuth.js';

const BUCKET = 'painel-admin';
const PASTA = 'dados';
const ARQUIVO = 'site-data.json';
const CAMINHO = `${PASTA}/${ARQUIVO}`;

const bucketNaoExiste = (erro) => /bucket not found/i.test(String(erro?.message || ''));

export function criarEstadoRemoto() {
  const cliente = createSupabaseServiceClient();
  if (!cliente) return null;

  async function garantirBucket() {
    const { error } = await cliente.storage.createBucket(BUCKET, { public: false });
    if (error && !/already exists/i.test(String(error.message || ''))) throw error;
  }

  return {
    nome: `Supabase Storage (${BUCKET}/${CAMINHO})`,

    // Devolve os dados gravados, ou null quando ainda não existe nada gravado.
    // Qualquer outro problema vira erro, para nunca confundir "falhou" com "está vazio".
    async carregar() {
      const lista = await cliente.storage.from(BUCKET).list(PASTA, { search: ARQUIVO });
      if (lista.error) {
        if (bucketNaoExiste(lista.error)) return null;
        throw lista.error;
      }
      if (!(lista.data || []).some((item) => item.name === ARQUIVO)) return null;

      const baixado = await cliente.storage.from(BUCKET).download(CAMINHO);
      if (baixado.error) throw baixado.error;
      return JSON.parse(await baixado.data.text());
    },

    async salvar(dados) {
      const corpo = Buffer.from(JSON.stringify(dados), 'utf8');
      const opcoes = { upsert: true, contentType: 'application/json', cacheControl: '0' };
      let { error } = await cliente.storage.from(BUCKET).upload(CAMINHO, corpo, opcoes);
      if (error && bucketNaoExiste(error)) {
        await garantirBucket();
        ({ error } = await cliente.storage.from(BUCKET).upload(CAMINHO, corpo, opcoes));
      }
      if (error) throw error;
    },
  };
}
