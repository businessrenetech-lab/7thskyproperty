const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  const fields = ['title', 'slug', 'excerpt', 'content', 'seo_title', 'seo_description', 'tags'];
  for (const f of fields) {
    const [r] = await c.execute(
      `UPDATE blog_posts SET ${f} = REPLACE(${f}, '2025', '2026') WHERE ${f} LIKE '%2025%'`
    );
    console.log(`${f}: ${r.affectedRows} rows updated`);
  }

  await c.end();
  console.log('\n✅ All 2025 references updated to 2026!');
})();
