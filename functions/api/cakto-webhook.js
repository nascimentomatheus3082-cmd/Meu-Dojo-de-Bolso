/* POST /api/cakto-webhook
   A Cakto avisa aqui cada compra aprovada, reembolso e chargeback.
   Cadastre na Cakto (Integrações > Webhooks) a URL https://meudojodebolso.com/api/cakto-webhook
   com os eventos: purchase_approved, refund, chargeback. */
import { json, erro, faltaConfig, db, normEmail, soDigitos, produtoDoNome, assinaturaCaktoOk } from '../_shared/acesso.js';

const STATUS = { purchase_approved: 'pago', refund: 'cancelado', chargeback: 'cancelado' };

export async function onRequestPost({ request, env }) {
  const falta = faltaConfig(env);
  if (falta.length || !env.CAKTO_SECRET) return erro('servidor sem configuração', 503);

  const corpo = await request.text();
  let p; try { p = JSON.parse(corpo); } catch (e) { return erro('json inválido'); }

  // Autenticação: assinatura HMAC no cabeçalho (preferida) ou o "secret" no corpo.
  const assinatura = request.headers.get('x-cakto-signature');
  const ok = assinatura
    ? await assinaturaCaktoOk(env.CAKTO_SECRET, request.headers.get('x-cakto-timestamp'), corpo, assinatura)
    : p.secret === env.CAKTO_SECRET;
  if (!ok) return erro('não autorizado', 401);

  const status = STATUS[p.event];
  if (!status) return json({ ok: true, ignorado: p.event }); // outros eventos: só confirma o recebimento

  const pedidos = Array.isArray(p.data) ? p.data : [p.data]; // Webhook V2 manda uma lista
  const linhas = [];
  for (const d of pedidos) {
    if (!d || !d.id) continue;
    let email = normEmail(d.customer && d.customer.email);
    let telefone = soDigitos(d.customer && d.customer.phone);
    let documento = soDigitos(d.customer && d.customer.docNumber);
    // Order bump sem dados do cliente: herda do pedido principal
    if (!email && d.parent_order) {
      const [pai] = await db(env, `compras?ref_id=eq.${encodeURIComponent(d.parent_order)}&select=email,telefone,documento`);
      if (pai) ({ email, telefone, documento } = pai);
    }
    if (!email) continue;
    linhas.push({
      pedido_id: String(d.id),
      ref_id: d.refId || null,
      pedido_pai: d.parent_order || null,
      email, telefone: telefone || null, documento: documento || null,
      produto: produtoDoNome(d.product && d.product.name),
      produto_nome: (d.product && d.product.name) || null,
      valor: typeof d.amount === 'number' ? d.amount : null,
      status, evento: p.event,
      atualizado_em: new Date().toISOString(),
    });
  }
  if (linhas.length) {
    await db(env, 'compras?on_conflict=pedido_id', {
      method: 'POST', body: linhas, prefer: 'resolution=merge-duplicates,return=minimal',
    });
  }
  return json({ ok: true, gravados: linhas.length });
}
