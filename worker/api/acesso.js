/* GET  /api/acesso            -> confere a sessão e devolve o plano atual
   POST /api/acesso { faixa }  -> Essencial: grava a faixa escolhida (uma vez só)
   Cabeçalho: Authorization: Bearer <token> */
import { json, erro, faltaConfig, lerToken, lerAcesso, salvarAcesso, comprasPagas, calcularPlano, lerJson } from '../acesso.js';

const FAIXAS = ['branca', 'cinza', 'azul', 'amarela', 'laranja', 'verde', 'roxa', 'marrom', 'preta'];

async function sessao(env, request) {
  if (faltaConfig(env).length) return { r: erro('servidor sem configuração', 503) };
  const t = await lerToken(env, request);
  if (!t) return { r: erro('Sua sessão expirou. Entre de novo.', 401, { motivo: 'sessao' }) };
  const acesso = await lerAcesso(env, t.e);
  if (!acesso || acesso.versao !== t.v) return { r: erro('A senha foi trocada. Entre de novo.', 401, { motivo: 'senha' }) };
  if (!acesso.aparelhos.some(a => a.id === t.d)) {
    return { r: erro('Sua conta entrou em outro aparelho e este foi desconectado (limite de 2). Entre de novo.', 401, { motivo: 'aparelho' }) };
  }
  const plano = calcularPlano(await comprasPagas(env, t.e));
  if (!plano) return { r: erro('O acesso desta compra foi encerrado (reembolso ou cancelamento).', 403, { motivo: 'sem_compra' }) };
  return { email: t.e, acesso, plano };
}

export async function onRequestGet({ request, env }) {
  const s = await sessao(env, request);
  if (s.r) return s.r;
  return json({ ok: true, acesso: { email: s.email, ...s.plano, faixaPlano: s.acesso.faixa_plano || null } });
}

export async function onRequestPost({ request, env }) {
  const s = await sessao(env, request);
  if (s.r) return s.r;
  const { faixa } = await lerJson(request);
  if (!FAIXAS.includes(faixa)) return erro('Faixa inválida.');
  if (s.acesso.faixa_plano) return json({ ok: true, faixaPlano: s.acesso.faixa_plano }); // já escolhida: não muda
  await salvarAcesso(env, { email: s.email, faixa_plano: faixa });
  return json({ ok: true, faixaPlano: faixa });
}
