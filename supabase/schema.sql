-- Dojô de Bolso: banco do acesso fechado.
-- Cole tudo no Supabase em SQL Editor > New query > Run.
-- Só o servidor (Worker da Cloudflare, com a chave service_role) lê e grava estas tabelas:
-- o RLS está ligado e não há nenhuma política, então o navegador não acessa nada direto.

-- Cada pedido aprovado na Cakto (vem do webhook). Plano e adicionais saem daqui.
create table if not exists compras (
  pedido_id     text primary key,          -- data.id da Cakto
  ref_id        text,                      -- data.refId (o código curto do painel)
  pedido_pai    text,                      -- data.parent_order (order bump aponta para o pedido principal)
  email         text not null,
  telefone      text,                      -- só dígitos
  documento     text,                      -- CPF só dígitos
  produto       text not null,             -- essencial | completo | anual | kit | fichas | familia (antigo) | outro
  produto_nome  text,
  valor         numeric,
  status        text not null,             -- pago | cancelado
  evento        text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists compras_email_idx on compras (email);
create index if not exists compras_ref_idx on compras (ref_id);

-- Uma linha por comprador que criou senha.
create table if not exists acessos (
  email         text primary key,
  senha_hash    text,
  faixa_plano   text,                      -- Essencial: a faixa escolhida no primeiro acesso (fica travada)
  aparelhos     jsonb not null default '[]'::jsonb,  -- até 2 aparelhos conectados
  versao        int not null default 1,    -- sobe quando a senha muda: derruba as sessões antigas
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Trava contra quem tenta adivinhar senha ou os dígitos do celular.
create table if not exists tentativas (
  chave         text primary key,
  falhas        int not null default 0,
  bloqueado_ate timestamptz
);

alter table compras    enable row level security;
alter table acessos    enable row level security;
alter table tentativas enable row level security;

-- ── Liberar manualmente (comprador antigo, venda fora da Cakto, cortesia):
-- insert into compras (pedido_id, email, telefone, produto, status, evento)
-- values ('manual-001', 'cliente@email.com', '5521999999999', 'completo', 'pago', 'manual');
--
-- ── Tirar o acesso de alguém:
-- update compras set status = 'cancelado', atualizado_em = now() where email = 'cliente@email.com';
