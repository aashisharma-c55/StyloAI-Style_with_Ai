
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  preferences jsonb not null default '{}'::jsonb,
  location_name text,
  latitude double precision,
  longitude double precision,
  humidity_threshold numeric not null default 65,
  temp_high_threshold numeric not null default 32,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create table public.clothing_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null check (char_length(name) between 1 and 100),
  category text not null,
  color text not null,
  season text not null default 'all',
  occasions text[] not null default '{}',
  brand text,
  image_path text,
  notes text,
  availability_status text not null default 'available' check (availability_status in ('available','in_use','unavailable')),
  laundry_status text not null default 'clean' check (laundry_status in ('clean','dirty','washing')),
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.clothing_items(user_id, created_at desc);
create trigger clothing_touch before update on public.clothing_items for each row execute function public.touch_updated_at();
grant select, insert, update, delete on public.clothing_items to authenticated;
grant all on public.clothing_items to service_role;
alter table public.clothing_items enable row level security;
create policy "own items" on public.clothing_items for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.rfid_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  clothing_item_id uuid not null references public.clothing_items(id) on delete cascade,
  uid text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index rfid_one_per_item on public.rfid_tags(clothing_item_id);
grant select, insert, update, delete on public.rfid_tags to authenticated;
grant all on public.rfid_tags to service_role;
alter table public.rfid_tags enable row level security;
create policy "own tags" on public.rfid_tags for all to authenticated using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.clothing_items c where c.id = clothing_item_id and c.user_id = auth.uid()));

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  device_name text not null,
  device_identifier text not null unique,
  api_key_hash text not null,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.devices to authenticated;
grant all on public.devices to service_role;
alter table public.devices enable row level security;
create policy "own devices" on public.devices for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.scan_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  device_id uuid references public.devices(id) on delete set null,
  uid text not null,
  clothing_item_id uuid references public.clothing_items(id) on delete set null,
  event_type text not null default 'scan',
  result text not null,
  is_simulated boolean not null default false,
  request_id text,
  created_at timestamptz not null default now()
);
create index on public.scan_events(user_id, created_at desc);
create unique index scan_events_request_unique on public.scan_events(device_id, request_id) where request_id is not null;
grant select, insert, delete on public.scan_events to authenticated;
grant all on public.scan_events to service_role;
alter table public.scan_events enable row level security;
create policy "own scans select" on public.scan_events for select to authenticated using (user_id = auth.uid());
create policy "own scans sim insert" on public.scan_events for insert to authenticated with check (user_id = auth.uid() and is_simulated = true);
create policy "own scans delete" on public.scan_events for delete to authenticated using (user_id = auth.uid());

create table public.sensor_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  device_id uuid references public.devices(id) on delete set null,
  temperature numeric not null,
  humidity numeric not null,
  is_simulated boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.sensor_readings(user_id, created_at desc);
grant select, insert, delete on public.sensor_readings to authenticated;
grant all on public.sensor_readings to service_role;
alter table public.sensor_readings enable row level security;
create policy "own readings select" on public.sensor_readings for select to authenticated using (user_id = auth.uid());
create policy "own readings sim insert" on public.sensor_readings for insert to authenticated with check (user_id = auth.uid() and is_simulated = true);
create policy "own readings delete" on public.sensor_readings for delete to authenticated using (user_id = auth.uid());

create table public.outfit_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  occasion text not null,
  weather_summary text,
  selected_item_ids uuid[] not null,
  explanation text,
  styling_tips text,
  recommendation_source text not null check (recommendation_source in ('ai','rule_based')),
  worn_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.outfit_recommendations(user_id, created_at desc);
grant select, insert, update, delete on public.outfit_recommendations to authenticated;
grant all on public.outfit_recommendations to service_role;
alter table public.outfit_recommendations enable row level security;
create policy "own outfits" on public.outfit_recommendations for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own images read" on storage.objects for select to authenticated using (bucket_id='clothing-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own images insert" on storage.objects for insert to authenticated with check (bucket_id='clothing-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own images update" on storage.objects for update to authenticated using (bucket_id='clothing-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own images delete" on storage.objects for delete to authenticated using (bucket_id='clothing-images' and (storage.foldername(name))[1] = auth.uid()::text);
