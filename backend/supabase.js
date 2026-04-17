const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️  Warning: Missing Supabase environment variables. Please check your .env file inside the backend folder.');
}

const validUrl = (supabaseUrl && supabaseUrl.startsWith('http'))
    ? supabaseUrl
    : 'https://fcznteqnqsjjwthzbhno.supabase.co';

const validKey = supabaseKey || 'placeholder_key';

const supabase = createClient(validUrl, validKey);

module.exports = { supabase };
