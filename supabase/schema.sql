create extension if not exists pgcrypto;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('story', 'review', 'gathering')),
  title text not null,
  body text not null,
  author text not null default '게스트',
  rating integer not null default 0 check (rating between 0 and 5),
  meet_time text,
  place_name text,
  place_address text,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author text not null default '게스트',
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx
  on public.posts (created_at desc);

create index if not exists posts_type_created_at_idx
  on public.posts (type, created_at desc);

create index if not exists comments_post_id_created_at_idx
  on public.comments (post_id, created_at asc);

comment on table public.posts is 'WHEREHERE neighborhood feed posts';
comment on table public.comments is 'WHEREHERE post comments';
