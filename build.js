const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'supabase-config.js');

if (fs.existsSync(configPath)) {
    let content = fs.readFileSync(configPath, 'utf8');

    // Read environment variables (standard Supabase naming or Vite prefix)
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
        // Replace URL placeholder: const SUPABASE_URL = 'https://TU_PROYECTO.supabase.co';
        content = content.replace(
            /const\s+SUPABASE_URL\s*=\s*['"`]https:\/\/TU_PROYECTO\.supabase\.co['"`];/,
            `const SUPABASE_URL = '${supabaseUrl}';`
        );
        // Replace Anon Key placeholder: const SUPABASE_ANON_KEY = 'tu-anon-key-aqui';
        content = content.replace(
            /const\s+SUPABASE_ANON_KEY\s*=\s*['"`]tu-anon-key-aqui['"`];/,
            `const SUPABASE_ANON_KEY = '${supabaseAnonKey}';`
        );

        fs.writeFileSync(configPath, content, 'utf8');
        console.log('Successfully injected Supabase environment variables into supabase-config.js');
    } else {
        console.warn('Supabase environment variables not found (SUPABASE_URL / SUPABASE_ANON_KEY). Using defaults.');
    }
} else {
    console.error('Error: supabase-config.js not found!');
    process.exit(1);
}
