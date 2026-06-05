-- ─────────────────────────────────────────────────────────────────────────────
-- AIRA PRO — tabla de suscripciones Stripe
-- ─────────────────────────────────────────────────────────────────────────────

create table public.subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null,
  stripe_customer_id   text unique,
  stripe_subscription_id text unique,
  status               text not null default 'inactive'
                         check (status in ('active','inactive','canceled','past_due','trialing')),
  plan                 text not null default 'free'
                         check (plan in ('free','pro')),
  current_period_end   timestamptz,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

create index on public.subscriptions (user_id);
create index on public.subscriptions (stripe_customer_id);

alter table public.subscriptions enable row level security;

create policy "service only" on public.subscriptions
  using (false);

create trigger trg_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute procedure public.set_updated_at();
