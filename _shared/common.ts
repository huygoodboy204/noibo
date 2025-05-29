import { createClient } from '@supabase/supabase-js';

export const getAdminClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  );
};

export const getCurrentUser = async (req: Request, supabaseAdmin: any) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('No authorization header');
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error) throw error;
  return user;
};

export const isAdmin = (user: any) => {
  return user?.app_metadata?.role === 'Admin';
}; 