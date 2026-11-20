# Dojo de Bolso 2.0

Nova interface React + TypeScript + Vite. A aplicação original permanece na raiz do repositório e não foi removida.

## Desenvolvimento
```bash
cd v2
npm install
cp .env.example .env.local
npm run dev
```

Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os dados do seu projeto Supabase. Sem essas variáveis, o app exibe uma tela de configuração e bloqueia o acesso.

## Banco de dados
Execute `supabase/migrations/001_initial_schema.sql` no SQL Editor do Supabase.

## Publicação
- Frontend: Cloudflare Pages, diretório raiz `v2`, comando de build `npm run build`, diretório de saída `dist`.
- Variáveis de ambiente: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- Configure também as URLs de redirecionamento e confirmação de e-mail no Supabase Auth.

## Estado atual
- Interface responsiva baseada no conceito visual aprovado.
- Tela de login/cadastro ligada ao Supabase Auth quando configurado.
- Migração inicial com perfis, progresso e políticas RLS.
- Catálogo visual de plugins e documentação de Skills de agentes.
- O Sensei Virtual é uma prévia de interface: o envio para um modelo de IA e a Edge Function ainda precisam ser implementados.
- Dados de XP, sequência, graduação e aulas mostrados no dashboard são conteúdo demonstrativo, não dados reais do aluno.

## Segurança e próximos passos
Não coloque chaves privadas de provedores de IA no navegador. A IA deve ser chamada por uma Supabase Edge Function com segredos no servidor. Configure confirmação de e-mail, recuperação de senha, políticas RLS e revise as políticas antes de publicar.
