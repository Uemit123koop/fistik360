-- Development/test seed data.
-- This file is intentionally minimal and should not be used in production.
-- It only adds safe geography reference data.

insert into provinces (name)
values ('Ankara')
on conflict (name) do nothing;

insert into districts (province_id, name)
select p.id, 'Çankaya'
from provinces p
where p.name = 'Ankara'
on conflict (province_id, name) do nothing;

insert into neighborhoods (district_id, name)
select d.id, v.name
from districts d
join provinces p on p.id = d.province_id
cross join (values ('Kavaklıdere'), ('Mebusevleri'), ('Öveçler')) as v(name)
where p.name = 'Ankara' and d.name = 'Çankaya'
on conflict (district_id, name) do nothing;
