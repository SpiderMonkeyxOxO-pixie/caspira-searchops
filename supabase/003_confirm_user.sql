-- Manually confirm the user's email so RLS auth.uid() works correctly
update auth.users
set    email_confirmed_at = now()
where  email = 'rejekihubmarketing@gmail.com';
