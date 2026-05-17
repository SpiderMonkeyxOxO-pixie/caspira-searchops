-- Run this query ALONE second
select
  id,
  email,
  email_confirmed_at,
  role,
  created_at
from auth.users
where email = 'rejekihubmarketing@gmail.com';
