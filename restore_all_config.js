import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function restoreConfig() {
  try {
    const dataSql = fs.readFileSync(path.join(__dirname, 'data.sql'), 'utf8');
    
    const configInsertMatch = dataSql.match(/INSERT INTO "config" \(([^)]+)\) VALUES \((.+)\);/i);
    if (!configInsertMatch) {
      console.log('Could not find config insert in data.sql');
      return;
    }
    
    // The columns string
    const colsStr = configInsertMatch[1];
    // We just want to extract the JSON values.
    // The safest way is to regex for the values array.
    // However, string parsing of SQL VALUES can be tricky due to quotes.
    // But since the values are string literals separated by ', ', we can just do a split.
    
    const valuesStr = configInsertMatch[2];
    
    // Let's use a regex to match all string literals (i.e. '...' )
    // A regex for single quoted strings, handling escaped quotes: /'(?:''|[^'])*'/g
    const matches = valuesStr.match(/'(?:''|[^'])*'/g);
    
    if (!matches || matches.length !== 14) {
       console.log('Could not parse values correctly', matches ? matches.length : 0);
       return;
    }
    
    const unquote = (str) => {
       // remove surrounding quotes and replace double quotes
       return str.slice(1, -1).replace(/''/g, "'");
    };
    
    const data = {
       id: unquote(matches[0]),
       homeStats: JSON.parse(unquote(matches[1]) || '{}'),
       publicSectionsVisibility: JSON.parse(unquote(matches[2]) || '{}'),
       footerInfo: JSON.parse(unquote(matches[3]) || '{}'),
       boardMembers: JSON.parse(unquote(matches[4]) || '[]'),
       loanProducts: JSON.parse(unquote(matches[5]) || '[]'),
       testimonials: JSON.parse(unquote(matches[6]) || '[]'),
       blogs: JSON.parse(unquote(matches[7]) || '[]'),
       teamMembers: JSON.parse(unquote(matches[8]) || '[]'),
       heroSlides: JSON.parse(unquote(matches[9]) || '[]'),
       aboutPage: JSON.parse(unquote(matches[10]) || '{}'),
       homePageContent: JSON.parse(unquote(matches[11]) || '{}'),
       mission: unquote(matches[12]),
       vision: unquote(matches[13])
    };
    
    const pool = (await import('./db.js')).default;
    
    // Check if exists
    const [rows] = await pool.execute('SELECT * FROM documents WHERE collection_name = ? AND doc_id = ?', ['config', 'settings']);
    
    if (rows.length > 0) {
      await pool.execute(
        'UPDATE documents SET data = ? WHERE collection_name = ? AND doc_id = ?',
        [JSON.stringify(data), 'config', 'settings']
      );
    } else {
      await pool.execute(
        'INSERT INTO documents (collection_name, doc_id, data) VALUES (?, ?, ?)',
        ['config', 'settings', JSON.stringify(data)]
      );
    }
    
    console.log('Successfully restored all config fields from data.sql into local MySQL!');
    console.log('Blogs restored:', data.blogs.length);
    console.log('Loan Products restored:', data.loanProducts.length);
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

restoreConfig();
