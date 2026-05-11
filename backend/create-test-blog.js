const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });
    
    // Find the first branch
    const [branches] = await connection.execute('SELECT id FROM branches LIMIT 1');
    if (branches.length === 0) {
        console.log('No branches found');
        return;
    }
    const branchId = branches[0].id;

    // Find the first user
    const [users] = await connection.execute('SELECT id FROM users LIMIT 1');
    if (users.length === 0) {
        console.log('No users found');
        return;
    }
    const authorId = users[0].id;

    const query = `INSERT INTO blog_posts (branch_id, author_id, title, slug, excerpt, content, category, tags, reading_time, is_published, is_featured, created_at, updated_at) 
                   VALUES (?, ?, 'Mastering IELTS in 30 Days', 'mastering-ielts-30-days-test-2', 'A 30-day guide to mastering the IELTS exam.', '<h2>Day 1-5: Understanding the Format</h2>', 'IELTS', '["IELTS", "Preparation"]', 10, 1, 1, NOW(), NOW())`;
                   
    await connection.execute(query, [branchId, authorId]);
    console.log('Test blog post inserted successfully!');
    await connection.end();
  } catch (err) {
    console.error('Database error:', err.message);
  }
})();
