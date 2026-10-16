import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

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

app.get(['/mobile'], (req, res) => {
  res.sendFile(path.join(__dirname, 'home_nata_o_criativa_mobile_otimizado', 'code.html'));
});

app.get(['/mobile/catalogo'], (req, res) => {
  res.sendFile(path.join(__dirname, 'forma_es_cat_logo_mobile', 'code.html'));
});

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
