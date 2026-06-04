alter table public.documents
  add column if not exists file_hash text;

comment on column public.documents.file_hash is
  'SHA-256 hex digest of PDF bytes; used for per-user duplicate detection. Nullable for legacy rows.';

create index if not exists documents_user_id_file_hash_idx
  on public.documents (user_id, file_hash)
  where file_hash is not null;
