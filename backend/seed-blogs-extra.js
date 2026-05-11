const mysql = require('mysql2/promise');
require('dotenv').config();

const blogs = [
  {
    title: 'IELTS Speaking Test 2025: Common Topics, Cue Cards & Expert Tips for Band 7+',
    slug: 'ielts-speaking-test-tips-2025',
    excerpt: 'Ace the IELTS Speaking test with expert tips for all 3 parts. Common 2025 cue card topics, vocabulary tips, and strategies to score Band 7+ confidently.',
    category: 'IELTS',
    tags: JSON.stringify(["IELTS Speaking","Speaking Tips","Cue Cards","IELTS Band 7","Speaking Test"]),
    course_relation: 'IELTS',
    reading_time: 8,
    seo_title: 'IELTS Speaking Tips 2025 | Cue Cards & Band 7+ Strategies',
    seo_description: 'Master IELTS Speaking with expert tips for Part 1, 2 & 3. Common 2025 cue card topics and vocabulary strategies for Band 7+. Language Academy.',
    image_url: '/uploads/blogs/ielts-speaking-test-tips.png',
    is_published: true, is_featured: false,
    content: `<h2>IELTS Speaking Test: Complete Guide</h2>
<p>The IELTS Speaking test is a <strong>face-to-face interview</strong> with a certified examiner lasting 11-14 minutes. It's the only section where you interact with a real person, making it both the most personal and the most nerve-wracking part of the exam.</p>

<h2>Test Structure</h2>
<h3>Part 1: Introduction & Interview (4-5 minutes)</h3>
<p>The examiner asks <strong>familiar topics</strong>: work, studies, hobbies, hometown, family.</p>
<ul>
<li>Give answers of <strong>2-3 sentences</strong> — not too short, not too long</li>
<li>Use the format: <strong>Answer + Reason + Example</strong></li>
<li>Example: "I enjoy reading. It helps me relax after a long day. I usually read fiction novels before bed."</li>
</ul>

<h3>Part 2: Individual Long Turn (3-4 minutes)</h3>
<p>You receive a <strong>cue card</strong> with a topic and 1 minute to prepare. Speak for 1-2 minutes.</p>
<h4>2025 Common Cue Card Topics</h4>
<ul>
<li>Describe a person who inspires you</li>
<li>Talk about a time you helped someone</li>
<li>Describe a place you'd like to visit</li>
<li>Talk about a skill you want to learn</li>
<li>Describe an important decision you made</li>
</ul>

<h3>Part 3: Discussion (4-5 minutes)</h3>
<p>The examiner asks <strong>abstract, opinion-based questions</strong> related to the Part 2 topic.</p>
<ul>
<li>Give <strong>developed answers</strong> with reasons, examples, and comparisons</li>
<li>Use phrases like: "From my perspective...", "I'd argue that..."</li>
<li>It's OK to pause briefly to think — use fillers like "That's an interesting question..."</li>
</ul>

<h2>Band 7+ Speaking Strategies</h2>
<ul>
<li>Use <strong>idiomatic expressions</strong> naturally: "It's a piece of cake", "Once in a blue moon"</li>
<li>Show <strong>self-correction</strong>: "I went... I mean, I had gone there before"</li>
<li>Vary your <strong>intonation</strong> — don't speak in a monotone</li>
<li>Use <strong>discourse markers</strong>: "Having said that", "On the other hand"</li>
<li>Maintain <strong>eye contact</strong> with the examiner</li>
</ul>

<h2>Common Mistakes to Avoid</h2>
<ul>
<li>❌ Memorizing scripted answers (examiners can tell)</li>
<li>❌ Speaking too fast or too slowly</li>
<li>❌ Giving yes/no answers without elaboration</li>
<li>❌ Using vocabulary you're not comfortable with</li>
<li>❌ Going off-topic during Part 2</li>
</ul>

<h2>Practice Speaking at Language Academy</h2>
<p>Our IELTS courses include mock speaking tests with experienced instructors. <a href="/courses">Join Language Academy</a> and practice with confidence!</p>`
  },
  {
    title: 'Study in USA 2025: Top Universities, F-1 Visa Guide & Financial Aid for International Students',
    slug: 'study-in-usa-guide-2025',
    excerpt: 'Comprehensive guide to studying in USA in 2025. Ivy League and top universities, F-1 student visa process, costs, OPT work rights, and scholarship opportunities.',
    category: 'Study Abroad',
    tags: JSON.stringify(["Study in USA","American Universities","F-1 Visa","OPT","USA Education"]),
    course_relation: 'PTE',
    reading_time: 10,
    seo_title: 'Study in USA 2025 | Top Universities, F-1 Visa & Scholarships',
    seo_description: 'Complete guide to study in USA 2025. Top universities, F-1 visa, costs, OPT work rights & scholarships for international students.',
    image_url: '/uploads/blogs/study-in-usa-guide.png',
    is_published: true, is_featured: false,
    content: `<h2>Why Study in the USA?</h2>
<p>The United States hosts over <strong>1 million international students</strong> and is home to the world's most prestigious universities. With unmatched research opportunities, diverse campus cultures, and strong alumni networks, a US degree opens global doors.</p>

<h2>Top US Universities</h2>
<ul>
<li><strong>MIT</strong> — #1 globally (QS 2025)</li>
<li><strong>Harvard University</strong> — #4 globally</li>
<li><strong>Stanford University</strong> — #7 globally</li>
<li><strong>University of California, Berkeley</strong> — #12 globally</li>
<li><strong>University of Chicago</strong> — #21 globally</li>
</ul>

<h2>Cost of Studying in the USA</h2>
<table>
<tr><th>Expense</th><th>Annual Cost (USD)</th></tr>
<tr><td>Public University Tuition</td><td>$20,000 - $40,000</td></tr>
<tr><td>Private University Tuition</td><td>$40,000 - $60,000+</td></tr>
<tr><td>Living Costs</td><td>$10,000 - $18,000</td></tr>
<tr><td>Health Insurance</td><td>$1,500 - $2,500</td></tr>
</table>

<h2>F-1 Student Visa</h2>
<h3>Requirements</h3>
<ul>
<li><strong>I-20 form</strong> from a SEVP-certified institution</li>
<li><strong>English proficiency</strong>: TOEFL 80+, IELTS 6.5+, or PTE 58+</li>
<li>Proof of financial ability to cover first year</li>
<li><strong>DS-160 application</strong> + visa interview at US Embassy</li>
<li>SEVIS fee payment ($350)</li>
</ul>

<h2>Work Rights & OPT</h2>
<ul>
<li>On-campus work: <strong>20 hours/week</strong> during term</li>
<li><strong>CPT</strong> (Curricular Practical Training): internship during study</li>
<li><strong>OPT</strong> (Optional Practical Training): 12 months post-graduation</li>
<li><strong>STEM OPT Extension</strong>: additional 24 months for STEM graduates</li>
</ul>

<h2>Financial Aid & Scholarships</h2>
<ul>
<li><strong>Fulbright Program</strong> — fully funded for graduate study</li>
<li><strong>University merit scholarships</strong> — varies by institution</li>
<li><strong>Graduate assistantships</strong> — tuition waiver + stipend</li>
<li><strong>Need-blind admissions</strong> at some Ivy League schools</li>
</ul>

<h2>Prepare for USA with Language Academy</h2>
<p>Get your English test score ready for US universities. <a href="/courses">Start preparation</a> at Language Academy!</p>`
  }
];

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST, user: process.env.DB_USER,
      password: process.env.DB_PASS, database: process.env.DB_NAME
    });
    const [branches] = await conn.execute('SELECT id FROM branches WHERE type="head" LIMIT 1');
    const branchId = branches[0]?.id || 1;
    const [users] = await conn.execute('SELECT id FROM users LIMIT 1');
    const authorId = users[0]?.id || 1;

    for (const b of blogs) {
      const [existing] = await conn.execute('SELECT id FROM blog_posts WHERE slug = ?', [b.slug]);
      if (existing.length > 0) { console.log(`SKIP (exists): ${b.slug}`); continue; }
      await conn.execute(
        `INSERT INTO blog_posts (branch_id, author_id, title, slug, excerpt, content, image_url, category, tags, course_relation, reading_time, seo_title, seo_description, is_published, is_featured, published_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW(),NOW())`,
        [branchId, authorId, b.title, b.slug, b.excerpt, b.content, b.image_url, b.category, b.tags, b.course_relation, b.reading_time, b.seo_title, b.seo_description, b.is_published, b.is_featured]
      );
      console.log(`CREATED: ${b.slug}`);
    }
    await conn.end();
    console.log('\n✅ Extra blogs seeded successfully!');
  } catch (err) { console.error('Error:', err.message); }
})();
