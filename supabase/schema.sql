
-- 1. Users Table
create table users (
  id uuid default gen_random_uuid() primary key,
  wallet_address text unique not null,
  username text,
  created_at timestamptz default now()
);

-- 2. Assets Table
create table assets (
  id uuid default gen_random_uuid() primary key,
  creator_wallet text references users(wallet_address), -- simplified FK for now
  s3_url text not null,
  tags text[],
  created_at timestamptz default now()
);

-- 3. Games Table
create table games (
  id uuid default gen_random_uuid() primary key,
  creator_wallet text references users(wallet_address),
  parent_game_id uuid references games(id), -- Nullable for original games
  title text not null,
  description text,
  s3_bundle_url text, -- The HTML/JS zip
  gif_preview_url text,
  status text default 'draft', -- draft, published
  play_count int default 0,
  revenue_total numeric default 0,
  created_at timestamptz default now()
);

-- 4. Game Assets Usage (For the 20% split)
create table game_assets_usage (
  game_id uuid references games(id) on delete cascade,
  asset_id uuid references assets(id) on delete cascade,
  primary key (game_id, asset_id)
);

-- 5. Session Keys for 1-click spends
create table session_keys (
  id uuid default gen_random_uuid() primary key,
  user_wallet text references users(wallet_address),
  session_public_key text unique not null,
  limit_lamports bigint not null,
  remaining_lamports bigint not null,
  expires_at timestamptz not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Enable Row Level Security (RLS)
alter table users enable row level security;
alter table assets enable row level security;
alter table games enable row level security;
alter table game_assets_usage enable row level security;
alter table session_keys enable row level security;

-- Public Access Policy (for hackathon speed)
create policy "Public users are viewable by everyone" on users for select using (true);
create policy "Public assets are viewable by everyone" on assets for select using (true);
create policy "Public games are viewable by everyone" on games for select using (true);
create policy "Public session_keys are viewable by everyone" on session_keys for select using (true);
