/* Dojô de Bolso: lógica do acesso fechado, usada pelo Worker da Cloudflare (worker/index.js).
   Variáveis de ambiente (Cloudflare > Workers & Pages > meu-dojo-de-bolso > Settings > Variables and Secrets):
     SUPABASE_URL          https://xxxx.supabase.co
     SUPABASE_SERVICE_KEY  chave service_role do Supabase (secreta)
     CAKTO_SECRET          o "secret" do webhook criado na Cakto
     SESSAO_SEGREDO        qualquer texto longo e aleatório (assina o login) */

export const MAX_APARELHOS = 2;
const SESSAO_DIAS = 90;
const enc = new TextEncoder();

/* ── Respostas */
export const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});
export const erro = (msg, status = 400, extra = {}) => json({ ok: false, erro: msg, ...extra }, status);
export function faltaConfig(env) {
  return ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'SESSAO_SEGREDO'].filter(k => !env[k]);
}

/* ── Normalização */
export const normEmail = e => String(e || '').trim().toLowerCase();
export const soDigitos = s => String(s || '').replace(/\D/g, '');

/* ── Supabase (REST com a chave service_role; o RLS bloqueia o resto) */
export async function db(env, caminho, { method = 'GET', body, prefer } = {}) {
  const r = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${caminho}`, {
    method,
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'content-type': 'application/json',
      ...(prefer ? { prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Supabase ${method} ${caminho.split('?')[0]}: ${r.status} ${await r.text()}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}
const q = encodeURIComponent;
export const comprasPagas = (env, email) => db(env, `compras?email=eq.${q(email)}&status=eq.pago&select=produto,telefone,documento`);
export async function lerAcesso(env, email) {
  const [a] = await db(env, `acessos?email=eq.${q(email)}&select=*`);
  return a || null;
}
export const salvarAcesso = (env, linha) => db(env, 'acessos?on_conflict=email', {
  method: 'POST', body: { ...linha, atualizado_em: new Date().toISOString() },
  prefer: 'resolution=merge-duplicates,return=minimal',
});

/* ── Plano: o melhor produto pago vence. Anual inclui Kit, Fichas e Família. */
export function calcularPlano(compras) {
  const tem = p => compras.some(c => c.produto === p);
  const plano = tem('anual') ? 'anual' : tem('completo') ? 'completo' : tem('essencial') ? 'essencial' : null;
  if (!plano) return null;
  return { plano, familia: plano === 'anual' || tem('familia'), fichas: plano === 'anual' || tem('fichas'), kit: plano === 'anual' || tem('kit') };
}

/* Nome do produto na Cakto -> código interno */
export function produtoDoNome(nome) {
  const n = String(nome || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (n.includes('upgrade') || n.includes('anual')) return 'anual';
  if (n.includes('kit')) return 'kit';        // "Kit do Exame para Imprimir" (substituiu o Plano Família)
  if (n.includes('familia')) return 'familia';
  if (n.includes('ficha')) return 'fichas';
  if (n.includes('completo')) return 'completo';
  if (n.includes('essencial')) return 'essencial';
  return 'outro';
}

/* ── Senha: PBKDF2-SHA256 (WebCrypto) */
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const deB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function pbkdf2(senha, sal, iter) {
  const chave = await crypto.subtle.importKey('raw', enc.encode(senha), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iter }, chave, 256);
}
export async function hashSenha(senha) {
  const sal = crypto.getRandomValues(new Uint8Array(16)), iter = 100000;
  return `pbkdf2$${iter}$${b64(sal)}$${b64(await pbkdf2(senha, sal, iter))}`;
}
export async function conferirSenha(senha, guardado) {
  const [tipo, iter, sal, hash] = String(guardado || '').split('$');
  if (tipo !== 'pbkdf2') return false;
  const calc = b64(await pbkdf2(senha, deB64(sal), +iter));
  return iguais(calc, hash);
}
function iguais(a, b) {
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/* ── HMAC (sessão e assinatura da Cakto) */
async function hmac(segredo, texto, saida = 'b64url') {
  const k = await crypto.subtle.importKey('raw', enc.encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(texto)));
  if (saida === 'hex') return [...sig].map(b => b.toString(16).padStart(2, '0')).join('');
  return b64url(sig);
}
const b64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const deB64url = s => atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));

export async function assinaturaCaktoOk(segredo, timestamp, corpo, assinatura) {
  if (!timestamp || !assinatura) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const esperado = 'v1=' + await hmac(segredo, `${timestamp}.${corpo}`, 'hex');
  return iguais(esperado, String(assinatura).trim());
}

/* ── Sessão: token assinado { e: email, d: aparelho, v: versão, x: expira } */
export async function criarToken(env, email, aparelho, versao) {
  const carga = b64url(enc.encode(JSON.stringify({ e: email, d: aparelho, v: versao, x: Date.now() + SESSAO_DIAS * 864e5 })));
  return `${carga}.${await hmac(env.SESSAO_SEGREDO, carga)}`;
}
export async function lerToken(env, request) {
  const tk = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const [carga, sig] = tk.split('.');
  if (!carga || !sig || !iguais(await hmac(env.SESSAO_SEGREDO, carga), sig)) return null;
  try {
    const p = JSON.parse(deB64url(carga));
    return p.x > Date.now() ? p : null;
  } catch (e) { return null; }
}

/* ── Aparelhos: no máximo 2. Entrar num terceiro desconecta o mais antigo. */
export function registrarAparelho(lista, id) {
  const outros = (Array.isArray(lista) ? lista : []).filter(a => a.id !== id);
  return [{ id, em: new Date().toISOString() }, ...outros].slice(0, MAX_APARELHOS);
}
export const aparelhoValido = id => typeof id === 'string' && /^[\w-]{8,64}$/.test(id);

/* ── Trava de tentativas */
export async function bloqueado(env, chave) {
  const [t] = await db(env, `tentativas?chave=eq.${q(chave)}&select=*`);
  return t && t.bloqueado_ate && new Date(t.bloqueado_ate) > new Date() ? t.bloqueado_ate : null;
}
export async function falhou(env, chave, limite, minutos) {
  const [t] = await db(env, `tentativas?chave=eq.${q(chave)}&select=*`);
  const falhas = (t && !(t.bloqueado_ate && new Date(t.bloqueado_ate) < new Date()) ? t.falhas : 0) + 1;
  const bloqueado_ate = falhas >= limite ? new Date(Date.now() + minutos * 6e4).toISOString() : null;
  await db(env, 'tentativas?on_conflict=chave', {
    method: 'POST', body: { chave, falhas: falhas >= limite ? 0 : falhas, bloqueado_ate },
    prefer: 'resolution=merge-duplicates,return=minimal',
  });
  return limite - falhas;
}
export const zerar = (env, chave) => db(env, `tentativas?chave=eq.${q(chave)}`, { method: 'DELETE' });

/* ── Corpo do pedido */
export async function lerJson(request) {
  try { return await request.json(); } catch (e) { return {}; }
}

/* ── Resposta padrão de um login que deu certo */
export async function respostaLogin(env, email, acesso, plano) {
  return json({
    ok: true,
    token: await criarToken(env, email, acesso.aparelhos[0].id, acesso.versao),
    acesso: { email, ...plano, faixaPlano: acesso.faixa_plano || null },
  });
}
