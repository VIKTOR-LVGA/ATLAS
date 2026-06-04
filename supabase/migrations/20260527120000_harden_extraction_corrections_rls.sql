-- Sprint 13: ensure correction rows reference only the authenticated user's policies/documents

drop policy if exists "Users can insert their own extraction corrections"
  on public.extraction_corrections;

create policy "Users can insert their own extraction corrections"
  on public.extraction_corrections
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      policy_id is null
      or exists (
        select 1
        from public.policies p
        where p.id = policy_id
          and p.user_id = (select auth.uid())
      )
    )
    and (
      document_id is null
      or exists (
        select 1
        from public.documents d
        where d.id = document_id
          and d.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "Users can update their own extraction corrections"
  on public.extraction_corrections;

create policy "Users can update their own extraction corrections"
  on public.extraction_corrections
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      policy_id is null
      or exists (
        select 1
        from public.policies p
        where p.id = policy_id
          and p.user_id = (select auth.uid())
      )
    )
    and (
      document_id is null
      or exists (
        select 1
        from public.documents d
        where d.id = document_id
          and d.user_id = (select auth.uid())
      )
    )
  );
