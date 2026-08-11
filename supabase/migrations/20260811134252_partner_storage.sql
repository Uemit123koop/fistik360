-- Partner assets are public storefront media. Partner documents stay private.
-- All writes use authenticated, authorized server endpoints via service_role.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'partner-assets',
    'partner-assets',
    true,
    8388608,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  ),
  (
    'partner-documents',
    'partner-documents',
    false,
    10485760,
    array['application/pdf', 'image/jpeg', 'image/png']
  );

commit;
