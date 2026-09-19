-- Legal Metrology Stage 5: business-owned product records.
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  product_code text not null unique,
  business_id uuid not null references public.businesses(id) on delete restrict,
  product_name text not null,
  brand_name text,
  product_category text,
  product_type text,
  package_type text,
  declared_quantity numeric check (declared_quantity is null or declared_quantity > 0),
  quantity_unit text,
  mrp numeric check (mrp is null or mrp >= 0),
  country_of_origin text,
  product_description text,
  status text not null default 'active' check (status in ('active', 'inactive', 'suspended', 'under_review')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create sequence if not exists public.product_code_seq;
create or replace function public.next_product_code()
returns text language sql security definer set search_path = public
as $$ select 'PROD-' || lpad(nextval('public.product_code_seq')::text, 6, '0') $$;

create or replace function public.touch_product_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = timezone('utc', now()); return new; end; $$;
drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products for each row execute procedure public.touch_product_updated_at();

create or replace function public.is_product_manager()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where auth_user_id = auth.uid() and status = 'active' and role in ('super_admin', 'controller', 'assistant_controller', 'clerk')) $$;
create or replace function public.is_product_owner(target_business_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where auth_user_id = auth.uid() and status = 'active' and user_type = 'business' and business_id = target_business_id and role in ('manufacturer', 'packer', 'importer', 'dealer', 'retailer')) $$;

create or replace function public.prevent_product_owner_reassignment()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if public.is_product_owner(old.business_id) and (new.business_id is distinct from old.business_id or new.status is distinct from old.status) then
    raise exception 'Business users cannot change product ownership or status';
  end if;
  return new;
end; $$;
drop trigger if exists product_owner_reassignment on public.products;
create trigger product_owner_reassignment before update on public.products for each row execute procedure public.prevent_product_owner_reassignment();

alter table public.products enable row level security;
create policy products_read_scoped on public.products for select to authenticated using (public.is_super_admin() or public.is_product_manager() or public.is_product_owner(business_id) or ((select user_type from public.current_profile()) = 'government' and (select role from public.current_profile()) in ('inspector')));
create policy products_manager_insert on public.products for insert to authenticated with check (public.is_product_manager());
create policy products_owner_insert on public.products for insert to authenticated with check (public.is_product_owner(business_id));
create policy products_manager_update on public.products for update to authenticated using (public.is_product_manager()) with check (public.is_product_manager());
create policy products_owner_update on public.products for update to authenticated using (public.is_product_owner(business_id)) with check (public.is_product_owner(business_id));

create index if not exists products_business_id_idx on public.products(business_id);
create index if not exists products_product_code_idx on public.products(product_code);
create index if not exists products_name_lower_idx on public.products(lower(product_name));
create index if not exists products_brand_lower_idx on public.products(lower(brand_name));
create index if not exists products_category_idx on public.products(product_category);
create index if not exists products_status_idx on public.products(status);
create index if not exists products_created_at_idx on public.products(created_at desc);

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  category_name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);
alter table public.product_categories enable row level security;
create policy product_categories_read_authenticated on public.product_categories for select to authenticated using (true);
create policy product_categories_admin_write on public.product_categories for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
insert into public.product_categories (category_name) values ('Food'), ('Beverages'), ('Cosmetics'), ('Household Products'), ('Electrical Products'), ('Personal Care'), ('Pharmaceutical/Healthcare Products'), ('Stationery'), ('Garments/Textiles'), ('Packaged Consumer Goods'), ('Other') on conflict (category_name) do nothing;
