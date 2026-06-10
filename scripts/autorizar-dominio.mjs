// Adiciona um domínio à lista de authorizedDomains do Firebase Auth.
// Uso: node scripts/autorizar-dominio.mjs preco-justo-amazonia.netlify.app
// Requer firebase-tools logado (usa o refresh token do configstore local).
// Só funciona depois que o Firebase Auth foi inicializado no console.
import { readFileSync } from 'fs';
import { homedir } from 'os';

const PID = 'preco-justo-amazonia';
const dominio = process.argv[2];
if (!dominio) { console.error('Informe o domínio. Ex.: node scripts/autorizar-dominio.mjs meusite.netlify.app'); process.exit(1); }

const cfg = JSON.parse(readFileSync(`${homedir()}/.config/configstore/firebase-tools.json`, 'utf8'));
const tokRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: cfg.tokens.refresh_token,
    client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
    client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
  }),
});
const { access_token: at } = await tokRes.json();

const base = `https://identitytoolkit.googleapis.com/admin/v2/projects/${PID}/config`;
const h = { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json', 'x-goog-user-project': PID };

const atual = await (await fetch(base, { headers: h })).json();
if (atual.error) { console.error('Erro ao ler config (Auth já foi inicializado no console?):', JSON.stringify(atual.error)); process.exit(1); }

const dominios = new Set(atual.authorizedDomains || []);
dominios.add(dominio);
const r = await fetch(`${base}?updateMask=authorizedDomains`, {
  method: 'PATCH',
  headers: h,
  body: JSON.stringify({ authorizedDomains: [...dominios] }),
});
const j = await r.json();
if (j.error) { console.error('Falha:', JSON.stringify(j.error)); process.exit(1); }
console.log('Domínios autorizados agora:', (j.authorizedDomains || []).join(', '));
