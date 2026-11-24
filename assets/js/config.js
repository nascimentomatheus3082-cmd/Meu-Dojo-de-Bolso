/* ══════════════════════════════════════════════════════════════════
   ⚙️  CONFIGURAÇÃO DO DOJÔ DE BOLSO
   Este é o ÚNICO arquivo que você precisa editar.
   No GitHub: abra este arquivo, clique no lápis (Edit), troque o texto
   entre aspas e clique em "Commit changes". O site atualiza sozinho em 1 a 2 minutos.
   ══════════════════════════════════════════════════════════════════ */
const CONFIG = {
  marca: 'Dojô de Bolso',

  // ── 1. LINKS DE CHECKOUT DA CAKTO ─────────────────────────────────
  // Cole o link de cada produto entre as aspas, no lugar de COLE_AQUI.
  // Enquanto estiver COLE_AQUI, o botão mostra "pagamento em configuração".
  checkout: {
    'essencial':     'https://pay.cakto.com.br/m4s4uy4_1347618', // Produto "Dojô de Bolso Essencial" (R$ 17,90)
    'completo':      'https://pay.cakto.com.br/36hwngu_1347627', // Produto "Dojô de Bolso Completo" (R$ 27,90)
    'anual':         'https://pay.cakto.com.br/32spy49_1347636', // Produto "Dojô de Bolso Anual" (R$ 49,90, Pix único, acesso por 12 meses)
    'upgrade-anual': 'https://pay.cakto.com.br/dkodhwa_1347659', // Upsell da página de obrigado (R$ 24,90)

    // ── Opcional: um link por combinação de order bumps.
    // Se você cadastrar o Kit do Exame e as Fichas como order bump DENTRO da Cakto,
    // deixe estes vazios: o cliente vai para o link do plano e marca os bumps no checkout.
    'essencial+kit':        '',
    'essencial+fichas':     '',
    'essencial+kit+fichas': '',
    'completo+kit':         '',
    'completo+fichas':      '',
    'completo+kit+fichas':  '',
  },

  // ── 2. PIXEL DA META ──────────────────────────────────────────────
  // Gerenciador de Eventos > Fontes de dados > ID do conjunto de dados. Deixe '' para desligar.
  pixelId: '1685183036344661', // "Pixel Dojô de Bolso", conta OFERTAS-BRL

  // ── 3. WHATSAPP DE SUPORTE ────────────────────────────────────────
  // Só números, com 55 e DDD. Ex.: '5511999999999'
  suporteWhatsapp: '',

  // ── 4. PREÇOS EXIBIDOS NO SITE ────────────────────────────────────
  // Precisam bater com os preços cadastrados na Cakto.
  precos: { essencial: '17,90', completo: '27,90', anual: '49,90', anualMes: '4,99', kit: '9,90', fichas: '7,90', upgradeAnual: '24,90' },
  garantiaDias: 7,

  // ── 5. ACESSO FECHADO (login) ─────────────────────────────────────
  // true: o app só abre com e-mail e senha de quem comprou (o plano vem da compra na Cakto).
  // Só ligue depois de configurar o Supabase e as variáveis na Cloudflare (ACESSO-FECHADO.md).
  acessoFechado: true,
  dominio: 'https://meudojodebolso.com',
};

/* Devolve o link de checkout já preenchido, ou '' se ainda estiver COLE_AQUI/vazio. */
function linkCheckout(chave) {
  const v = (CONFIG.checkout[chave] || '').trim();
  return /^https?:\/\//i.test(v) ? v : '';
}

/* Pixel da Meta + eventos do funil.
   Os eventos levam faixa, quem faz o exame e o prazo: viram públicos personalizados depois. */
(function () {
  // Sem Pixel em testes locais (localhost / arquivo aberto direto): não suja os dados da Meta.
  const local = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  if (!CONFIG.pixelId || local) { window.fbq = function () { console.debug('[pixel off]', ...arguments); }; return; }
  !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s) }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', CONFIG.pixelId); fbq('track', 'PageView');
})();

function track(evento, dados = {}, custom = false) {
  try { custom ? fbq('trackCustom', evento, dados) : fbq('track', evento, dados); } catch (e) {}
}

/* Repassa UTMs e fbclid da URL do anúncio para o checkout */
function comUtm(url, extra = {}) {
  try {
    const u = new URL(url); const q = new URLSearchParams(location.search);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'src', 'sck'].forEach(k => { if (q.get(k)) u.searchParams.set(k, q.get(k)); });
    Object.entries(extra).forEach(([k, v]) => u.searchParams.set(k, v));
    return u.toString();
  } catch (e) { return url; }
}
