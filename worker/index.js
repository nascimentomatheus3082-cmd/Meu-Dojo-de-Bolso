/* Dojô de Bolso: Worker da Cloudflare.
   /api/* passa por aqui (acesso fechado). Todo o resto é o site estático (pasta raiz, via ASSETS),
   com os redirecionamentos do arquivo _redirects. */
import * as cakto from './api/cakto-webhook.js';
import * as ativar from './api/ativar.js';
import * as entrar from './api/entrar.js';
import * as acesso from './api/acesso.js';
import { erro } from './acesso.js';

const ROTAS = {
  '/api/cakto-webhook': cakto,
  '/api/ativar': ativar,
  '/api/entrar': entrar,
  '/api/acesso': acesso,
};
const METODO = { GET: 'onRequestGet', POST: 'onRequestPost' };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    const mod = ROTAS[url.pathname.replace(/\/$/, '')];
    if (!mod) return erro('não encontrado', 404);
    const fn = mod[METODO[request.method]];
    if (!fn) return erro('método não permitido', 405);
    try {
      return await fn({ request, env, ctx });
    } catch (e) {
      console.error(url.pathname, e && e.stack || e);
      return erro('Erro no servidor. Tente de novo em instantes.', 500);
    }
  },
};
