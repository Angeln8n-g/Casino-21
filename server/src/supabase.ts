import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn('Faltan las credenciales de Supabase en el archivo server/.env');
}

// Usamos el Service Role Key en el backend para poder tener acceso de admin (escribir resultados de partidas)
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
