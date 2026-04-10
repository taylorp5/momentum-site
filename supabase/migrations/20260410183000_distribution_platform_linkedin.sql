do $$
begin
  alter type public.distribution_platform add value if not exists 'linkedin';
exception
  when duplicate_object then null;
end $$;

