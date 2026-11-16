import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import api from './api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(express.json());

// Serve static files
app.use(express.static(__dirname));

// Specific application routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get(['/formacoes', '/catalogo', '/cursos-catalogo'], (req, res) => {
  res.sendFile(path.join(__dirname, 'forma_es_cat_logo_de_cursos_palestras_e_workshops', 'code.html'));
});

app.get(['/admin', '/painel', '/gestao'], (req, res) => {
  res.sendFile(path.join(__dirname, 'painel_admin_gest_o_e_crud_de_forma_es', 'code.html'));
});

app.get(['/cursos', '/workshops', '/palestras'], (req, res) => {
  res.sendFile(path.join(__dirname, 'cursos_palestras_e_workshops_nata_o_criativa', 'code.html'));
});

// Páginas do menu lateral
const paginasDoMenu = {
  '/conteudos': 'conteudos_nata_o_criativa',
  '/solucoes': 'solucoes_nata_o_criativa',
  '/certificados': 'certificados_nata_o_criativa',
  '/loja': 'loja_nata_o_criativa',
  '/atendimento': 'atendimento_nata_o_criativa',
};

for (const [rota, pasta] of Object.entries(paginasDoMenu)) {
  app.get(rota, (req, res) => {
    res.sendFile(path.join(__dirname, pasta, 'code.html'));
  });
}

// Suporte com a foca mascote (rotas explícitas para a Vercel incluir os arquivos)
app.get('/mascote/widget.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'mascote', 'widget.js'));
});
app.get('/mascote/base.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'mascote', 'base.json'));
});
app.get('/mascote/foca.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'mascote', 'foca.png'));
});

// Identidade visual (logo, fundo, favicon)
app.get('/marca/logo.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'marca', 'logo.png'));
});
app.get('/marca/favicon.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'marca', 'favicon.png'));
});
app.get('/marca/fundo.jpg', (req, res) => {
  res.sendFile(path.join(__dirname, 'marca', 'fundo.jpg'));
});
app.get('/marca/tema.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'marca', 'tema.css'));
});

app.get(['/mobile'], (req, res) => {
  res.sendFile(path.join(__dirname, 'home_nata_o_criativa_mobile_otimizado', 'code.html'));
});

app.get(['/mobile/catalogo'], (req, res) => {
  res.sendFile(path.join(__dirname, 'forma_es_cat_logo_mobile', 'code.html'));
});

// Script que liga os formulários e o catálogo ao banco
app.get('/dados/site.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'dados', 'site.js'));
});

// Rotas do banco (Supabase): /api/cursos, /api/cardume, /api/contato, /api/certificados/:codigo...
app.use('/api', api);

// API health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Natação Criativa', timestamp: new Date().toISOString() });
});

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`[Natação Criativa] Server active on http://${HOST}:${PORT}`);
});
