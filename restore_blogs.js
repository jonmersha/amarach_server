import fs from 'fs';
import { Firestore } from '@google-cloud/firestore';

async function restoreBlogs() {
  try {
    const dataSql = fs.readFileSync('schema.sql', 'utf8');
    
    // Find the INSERT into config query
    const configInsertMatch = dataSql.match(/INSERT IGNORE INTO "config" [^\n]+/i);
    if (!configInsertMatch) {
      console.log('Could not find config insert in schema.sql');
      return;
    }
    
    const configInsert = configInsertMatch[0];
    
    // The columns are ("id", "homeStats", "publicSectionsVisibility", "footerInfo", "boardMembers", "loanProducts", "testimonials", "blogs", "teamMembers", "heroSlides", "aboutPage", "homePageContent", "mission", "vision")
    // Let's just find the JSON array that looks like blogs. It's the 8th value.
    // Instead of complex parsing, let's use a regex to extract the blogs array specifically.
    // The blogs array starts with '[{"excerpt"' or similar, and ends before ',"teamMembers"'.
    // A more robust way: use a small JS eval if possible, or just regex the JSON array.
    
    // Let's do a regex that finds the blogs JSON array which is before '[]' (teamMembers)
    const blogsRegex = /'(\[{"excerpt"[^]*?\])',\s*'\[\]'/;
    const match = configInsert.match(blogsRegex);
    if (!match) {
        console.log("Could not extract blogs JSON array from the SQL statement");
        return;
    }
    
    // Replace '' with '
    const blogsJsonString = match[1].replace(/''/g, "'");
    const blogsData = JSON.parse(blogsJsonString);
    
    console.log(`Extracted ${blogsData.length} blog posts from data.sql`);
    
    // Update local MySQL
    const pool = (await import('./db.js')).default;
    
    // get existing config
    const [rows] = await pool.execute('SELECT data FROM documents WHERE collection_name = ? AND doc_id = ?', ['config', 'settings']);
    if (rows.length > 0) {
      let data = JSON.parse(rows[0].data);
      data.blogs = blogsData;
      
      await pool.execute(
        'UPDATE documents SET data = ? WHERE collection_name = ? AND doc_id = ?',
        [JSON.stringify(data), 'config', 'settings']
      );
      console.log('Successfully updated blogs in local MySQL!');
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

restoreBlogs();
