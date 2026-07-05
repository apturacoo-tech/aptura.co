-- ============================================================================
-- aptura.co — schema do Supabase
-- Rode este arquivo inteiro no SQL Editor do Supabase (Project > SQL Editor > New query).
-- Pode rodar de uma vez só, de cima para baixo.
-- ============================================================================

-- Extensao para gerar UUIDs
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. PROFILES — um por usuario autenticado (espelha auth.users)
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('prestador', 'empresa')),
  name text not null,
  email text not null,
  is_moderator boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: dono pode ver o proprio"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: dono pode criar o proprio"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles: dono pode atualizar o proprio"
  on public.profiles for update
  using (auth.uid() = id);

-- ============================================================================
-- 2. PROFESSIONALS — dados publicos do prestador (o que qualquer visitante ve)
-- ============================================================================
create table if not exists public.professionals (
  id uuid primary key references public.profiles(id) on delete cascade,
  name text not null,
  profession text not null,
  categories text[] not null default '{}',
  city text not null default 'Nao informado',
  address text not null default 'Nao informado',
  lat double precision,
  lng double precision,
  photo_path text,
  description text not null default 'Sem descricao ainda.',
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'rejeitado')),
  views integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.professionals enable row level security;

create policy "professionals: publico ve aprovados"
  on public.professionals for select
  using (
    status = 'aprovado'
    or auth.uid() = id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_moderator)
  );

create policy "professionals: dono cria o proprio"
  on public.professionals for insert
  with check (auth.uid() = id);

create policy "professionals: dono ou moderador atualiza"
  on public.professionals for update
  using (
    auth.uid() = id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_moderator)
  );

-- Impede que o proprio prestador mude o status (so moderador pode aprovar/rejeitar)
create or replace function public.protect_professional_status()
returns trigger as $$
begin
  if new.status is distinct from old.status then
    if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_moderator) then
      raise exception 'Apenas moderadores podem alterar o status de aprovacao.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_protect_professional_status on public.professionals;
create trigger trg_protect_professional_status
  before update on public.professionals
  for each row execute function public.protect_professional_status();

-- Views (visualizacoes de perfil) incrementadas por qualquer visitante autenticado
create or replace function public.increment_professional_views(prof_id uuid)
returns void as $$
begin
  update public.professionals set views = views + 1 where id = prof_id;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- 3. PROFESSIONAL_VERIFICATIONS — RG, telefone e fotos de documento (PRIVADO)
--    So o proprio dono e moderadores podem ver.
-- ============================================================================
create table if not exists public.professional_verifications (
  professional_id uuid primary key references public.professionals(id) on delete cascade,
  telefone text,
  rg text,
  rg_frente_path text,
  rg_verso_path text,
  created_at timestamptz not null default now()
);

alter table public.professional_verifications enable row level security;

create policy "verifications: dono ou moderador ve"
  on public.professional_verifications for select
  using (
    auth.uid() = professional_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_moderator)
  );

create policy "verifications: dono cria a propria"
  on public.professional_verifications for insert
  with check (auth.uid() = professional_id);

create policy "verifications: dono atualiza a propria"
  on public.professional_verifications for update
  using (auth.uid() = professional_id);

-- ============================================================================
-- 4. COMPANIES — dados publicos da empresa
-- ============================================================================
create table if not exists public.companies (
  id uuid primary key references public.profiles(id) on delete cascade,
  name text not null,
  segment text,
  description text,
  created_at timestamptz not null default now()
);

alter table public.companies enable row level security;

create policy "companies: qualquer um ve"
  on public.companies for select
  using (true);

create policy "companies: dono cria a propria"
  on public.companies for insert
  with check (auth.uid() = id);

create policy "companies: dono atualiza a propria"
  on public.companies for update
  using (auth.uid() = id);

-- ============================================================================
-- 5. COMPANY_VERIFICATIONS — documento da empresa (PRIVADO)
-- ============================================================================
create table if not exists public.company_verifications (
  company_id uuid primary key references public.companies(id) on delete cascade,
  documento_path text,
  created_at timestamptz not null default now()
);

alter table public.company_verifications enable row level security;

create policy "company_verifications: dono ou moderador ve"
  on public.company_verifications for select
  using (
    auth.uid() = company_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_moderator)
  );

create policy "company_verifications: dono cria a propria"
  on public.company_verifications for insert
  with check (auth.uid() = company_id);

-- ============================================================================
-- 6. VAGAS — publicadas por empresas, visiveis a todos
-- ============================================================================
create table if not exists public.vagas (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  company_name text not null,
  title text not null,
  city text not null,
  category text not null default 'Geral',
  description text,
  created_at timestamptz not null default now()
);

alter table public.vagas enable row level security;

create policy "vagas: qualquer um ve"
  on public.vagas for select
  using (true);

create policy "vagas: usuario autenticado publica"
  on public.vagas for insert
  with check (auth.uid() is not null);

create policy "vagas: dono edita ou apaga"
  on public.vagas for update using (auth.uid() = company_id);

create policy "vagas: dono apaga"
  on public.vagas for delete using (auth.uid() = company_id);

-- ============================================================================
-- 7. REVIEWS — avaliacoes de terceiros (nao exige login, como antes)
-- ============================================================================
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  author text not null,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

create policy "reviews: qualquer um ve"
  on public.reviews for select using (true);

create policy "reviews: qualquer um pode avaliar"
  on public.reviews for insert with check (true);

-- ============================================================================
-- 8. CONVERSATIONS + MESSAGES — chat entre visitante autenticado e prestador
-- ============================================================================
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  visitor_id uuid not null references public.profiles(id) on delete cascade,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (professional_id, visitor_id)
);

alter table public.conversations enable row level security;

create policy "conversations: participantes veem"
  on public.conversations for select
  using (auth.uid() = visitor_id or auth.uid() = professional_id);

create policy "conversations: visitante inicia"
  on public.conversations for insert
  with check (auth.uid() = visitor_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  text text,
  image_path text,
  video_url text,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "messages: participantes veem"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (auth.uid() = c.visitor_id or auth.uid() = c.professional_id)
    )
  );

create policy "messages: participante envia"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (auth.uid() = c.visitor_id or auth.uid() = c.professional_id)
    )
  );

-- Mantem conversations.updated_at em dia a cada nova mensagem
create or replace function public.touch_conversation()
returns trigger as $$
begin
  update public.conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_touch_conversation on public.messages;
create trigger trg_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation();

-- ============================================================================
-- 9. PORTFOLIO_ITEMS — fotos/videos do trabalho do prestador (opcional, publico)
-- ============================================================================
create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  type text not null check (type in ('image', 'video')),
  path text not null,
  created_at timestamptz not null default now()
);

alter table public.portfolio_items enable row level security;

create policy "portfolio: qualquer um ve"
  on public.portfolio_items for select using (true);

create policy "portfolio: dono adiciona"
  on public.portfolio_items for insert with check (auth.uid() = professional_id);

create policy "portfolio: dono remove"
  on public.portfolio_items for delete using (auth.uid() = professional_id);

-- ============================================================================
-- 10. STORAGE — buckets e politicas de acesso a arquivos
-- ============================================================================
insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('portfolio', 'portfolio', true),
  ('documents', 'documents', false),
  ('chat-attachments', 'chat-attachments', false)
on conflict (id) do nothing;

-- avatars: qualquer um ve, so o dono (pasta = seu proprio uid) envia/atualiza/apaga
create policy "avatars: leitura publica"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars: dono envia"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: dono atualiza"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: dono apaga"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- portfolio: publico le, so o dono (pasta = seu proprio uid) escreve
create policy "portfolio bucket: leitura publica"
  on storage.objects for select
  using (bucket_id = 'portfolio');

create policy "portfolio bucket: dono envia"
  on storage.objects for insert
  with check (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "portfolio bucket: dono apaga"
  on storage.objects for delete
  using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);

-- documents: privado. So o dono (pasta = seu uid) ou um moderador podem ler/escrever.
create policy "documents: dono ou moderador le"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_moderator)
    )
  );

create policy "documents: dono envia"
  on storage.objects for insert
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- chat-attachments: so participantes da conversa (pasta = id da conversa) podem ler/escrever
create policy "chat-attachments: participante le"
  on storage.objects for select
  using (
    bucket_id = 'chat-attachments'
    and exists (
      select 1 from public.conversations c
      where c.id::text = (storage.foldername(name))[1]
        and (auth.uid() = c.visitor_id or auth.uid() = c.professional_id)
    )
  );

create policy "chat-attachments: participante envia"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-attachments'
    and exists (
      select 1 from public.conversations c
      where c.id::text = (storage.foldername(name))[1]
        and (auth.uid() = c.visitor_id or auth.uid() = c.professional_id)
    )
  );

-- ============================================================================
-- 11. Indices uteis
-- ============================================================================
create index if not exists idx_professionals_status on public.professionals (status);
create index if not exists idx_reviews_professional on public.reviews (professional_id);
create index if not exists idx_vagas_company on public.vagas (company_id);
create index if not exists idx_conversations_professional on public.conversations (professional_id);
create index if not exists idx_conversations_visitor on public.conversations (visitor_id);
create index if not exists idx_messages_conversation on public.messages (conversation_id);
create index if not exists idx_portfolio_professional on public.portfolio_items (professional_id);

-- ============================================================================
-- 12. Como virar moderador (rode manualmente, so voce)
-- ============================================================================
-- 1. Crie sua conta normalmente pelo site (Cadastro > Prestador ou Empresa).
-- 2. Depois, rode este comando trocando o e-mail pelo seu:
--
-- update public.profiles set is_moderator = true where email = 'seu-email@exemplo.com';
--
-- Pronto: ao logar com esse e-mail, o Painel do Moderador fica liberado.
