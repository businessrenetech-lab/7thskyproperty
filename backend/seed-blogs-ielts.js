const mysql = require('mysql2/promise');
require('dotenv').config();

const blogs = [
  {
    title: 'IELTS Preparation Guide 2025: Everything You Need to Score Band 7+',
    slug: 'ielts-preparation-guide-2025',
    excerpt: 'Complete IELTS preparation guide for 2025. Learn strategies for Listening, Reading, Writing & Speaking to achieve Band 7+ with expert tips from Language Academy.',
    category: 'IELTS',
    tags: JSON.stringify(["IELTS","IELTS Preparation","IELTS Band 7","IELTS 2025","IELTS Tips"]),
    course_relation: 'IELTS',
    reading_time: 11,
    seo_title: 'IELTS Preparation Guide 2025 | How to Score Band 7+ Tips',
    seo_description: 'Complete IELTS preparation guide 2025. Expert strategies for all 4 modules. Score Band 7+ with proven tips from Language Academy Bangladesh.',
    image_url: '/uploads/blogs/ielts-preparation-guide-2025.png',
    is_published: true, is_featured: true,
    content: `<h2>Your Ultimate IELTS Preparation Guide for 2025</h2>
<p>The <strong>International English Language Testing System (IELTS)</strong> remains the world's most popular English proficiency test, accepted by over 11,000 organizations in 140+ countries. Whether you're applying for study abroad, migration, or professional registration, a strong IELTS score opens doors globally.</p>

<h2>IELTS Format Overview</h2>
<p>IELTS has two versions: <strong>Academic</strong> (for university admission) and <strong>General Training</strong> (for migration/work). Both share the same Speaking and Listening modules.</p>
<table>
<tr><th>Module</th><th>Duration</th><th>Questions</th></tr>
<tr><td>Listening</td><td>30 minutes + 10 min transfer</td><td>40 questions</td></tr>
<tr><td>Reading</td><td>60 minutes</td><td>40 questions</td></tr>
<tr><td>Writing</td><td>60 minutes</td><td>2 tasks</td></tr>
<tr><td>Speaking</td><td>11-14 minutes</td><td>3 parts</td></tr>
</table>

<h2>Module-by-Module Strategy</h2>
<h3>Listening</h3>
<ul>
<li>Read questions <strong>before</strong> the audio plays</li>
<li>Listen for <strong>synonyms and paraphrases</strong></li>
<li>Pay attention to <strong>signpost words</strong>: however, on the other hand, actually</li>
<li>Practice with different English accents (British, Australian, American)</li>
</ul>

<h3>Reading</h3>
<ul>
<li>Use <strong>skimming and scanning</strong> techniques</li>
<li>Don't read every word — focus on key information</li>
<li>Manage time: spend <strong>20 minutes per passage</strong></li>
<li>Practice True/False/Not Given with careful attention to "Not Given"</li>
</ul>

<h3>Writing</h3>
<ul>
<li><strong>Task 1</strong>: Describe data trends objectively (150+ words)</li>
<li><strong>Task 2</strong>: Write a structured essay (250+ words)</li>
<li>Use <strong>topic sentences</strong> to begin each paragraph</li>
<li>Include a range of vocabulary and grammatical structures</li>
</ul>

<h3>Speaking</h3>
<ul>
<li>Part 1: Answer naturally, expand answers with reasons</li>
<li>Part 2: Use the 1-minute preparation time wisely — make notes</li>
<li>Part 3: Give detailed opinions with examples</li>
</ul>

<h2>8-Week IELTS Study Plan</h2>
<table>
<tr><th>Week</th><th>Focus</th></tr>
<tr><td>1-2</td><td>Take diagnostic test, understand format</td></tr>
<tr><td>3-4</td><td>Listening & Reading intensive practice</td></tr>
<tr><td>5-6</td><td>Writing & Speaking skills development</td></tr>
<tr><td>7-8</td><td>Full practice tests & final revision</td></tr>
</table>

<h2>Start Your IELTS Journey with Language Academy</h2>
<p>Language Academy offers comprehensive IELTS preparation with experienced instructors and regular mock tests. <a href="/courses">Explore our IELTS courses</a> today!</p>`
  },
  {
    title: 'IELTS vs PTE Academic 2025: Which English Test Should You Choose?',
    slug: 'ielts-vs-pte-comparison-2025',
    excerpt: 'Confused between IELTS and PTE? Compare test format, scoring, difficulty, acceptance, and find out which exam is right for your goals in 2025.',
    category: 'IELTS',
    tags: JSON.stringify(["IELTS vs PTE","PTE vs IELTS","English Test Comparison","Which Test","IELTS or PTE"]),
    course_relation: 'IELTS',
    reading_time: 9,
    seo_title: 'IELTS vs PTE 2025: Which English Test is Better? Complete Comparison',
    seo_description: 'IELTS vs PTE Academic 2025 comparison. Format, scoring, difficulty, cost & acceptance compared. Find the right test for study abroad or migration.',
    image_url: '/uploads/blogs/ielts-vs-pte-comparison.png',
    is_published: true, is_featured: false,
    content: `<h2>IELTS vs PTE: The Complete 2025 Comparison</h2>
<p>Choosing between <strong>IELTS and PTE Academic</strong> is one of the first decisions you'll make on your study abroad or migration journey. Both are globally accepted, but they have key differences that may make one a better fit for you.</p>

<h2>Quick Comparison Table</h2>
<table>
<tr><th>Feature</th><th>IELTS</th><th>PTE Academic</th></tr>
<tr><td>Test Format</td><td>Paper + Computer</td><td>Computer only</td></tr>
<tr><td>Duration</td><td>2 hrs 45 min</td><td>2 hours</td></tr>
<tr><td>Speaking</td><td>Face-to-face examiner</td><td>AI-scored (computer)</td></tr>
<tr><td>Scoring</td><td>Band 1-9</td><td>Score 10-90</td></tr>
<tr><td>Results</td><td>13 days</td><td>1-2 days</td></tr>
<tr><td>Test Fee</td><td>~BDT 25,500</td><td>~BDT 16,000</td></tr>
<tr><td>Validity</td><td>2 years</td><td>2 years</td></tr>
</table>

<h2>Choose IELTS If:</h2>
<ul>
<li>You prefer <strong>speaking to a human examiner</strong></li>
<li>You're applying to <strong>UK universities</strong> (IELTS has strongest UK acceptance)</li>
<li>You're comfortable with <strong>handwritten essays</strong></li>
<li>You want a <strong>widely recognized test</strong> for migration</li>
</ul>

<h2>Choose PTE If:</h2>
<ul>
<li>You prefer <strong>computer-based testing</strong></li>
<li>You want <strong>faster results</strong> (1-2 days)</li>
<li>You're applying to <strong>Australian universities</strong></li>
<li>You're <strong>shy in face-to-face conversations</strong></li>
<li>You want <strong>flexible test dates</strong></li>
</ul>

<h2>Score Equivalence</h2>
<table>
<tr><th>IELTS Band</th><th>PTE Score</th></tr>
<tr><td>9.0</td><td>86-90</td></tr>
<tr><td>8.0</td><td>79-83</td></tr>
<tr><td>7.0</td><td>65-72</td></tr>
<tr><td>6.5</td><td>58-64</td></tr>
<tr><td>6.0</td><td>50-57</td></tr>
</table>

<h2>The Verdict</h2>
<p>Neither test is inherently easier or harder — it depends on <strong>your strengths</strong>. If you're good at typing and prefer machines, choose PTE. If you're a strong communicator, IELTS might suit you better.</p>

<h2>Prepare for Both at Language Academy</h2>
<p>Language Academy offers expert preparation for both IELTS and PTE. <a href="/courses">View our courses</a> to find the right fit!</p>`
  },
  {
    title: 'How to Achieve IELTS Band 7+: Proven Tips for Each Module',
    slug: 'how-to-achieve-ielts-band-7-score',
    excerpt: 'Want to score IELTS Band 7 or higher? Discover module-specific strategies, common mistakes to avoid, and a proven study plan for achieving your target score.',
    category: 'IELTS',
    tags: JSON.stringify(["IELTS Band 7","IELTS High Score","IELTS Tips","IELTS Strategy","Band 7 Tips"]),
    course_relation: 'IELTS',
    reading_time: 10,
    seo_title: 'How to Score IELTS Band 7+ | Module-wise Tips & Strategy 2025',
    seo_description: 'Proven strategies to achieve IELTS Band 7+ in all four modules. Common mistakes, study plan, and expert tips from Language Academy.',
    image_url: '/uploads/blogs/ielts-band-7-score-tips.png',
    is_published: true, is_featured: false,
    content: `<h2>Reaching IELTS Band 7: What It Takes</h2>
<p>An <strong>IELTS Band 7</strong> is the minimum requirement for most competitive universities and immigration programs. It requires you to demonstrate <strong>"good user" level English</strong> — handling complex language with occasional inaccuracies.</p>

<h2>Band 7 Requirements by Module</h2>
<table>
<tr><th>Module</th><th>What Band 7 Means</th></tr>
<tr><td>Listening</td><td>30-32 correct out of 40</td></tr>
<tr><td>Reading</td><td>30-32 correct (Academic)</td></tr>
<tr><td>Writing</td><td>Strong structure, varied vocabulary, few errors</td></tr>
<tr><td>Speaking</td><td>Fluent with good vocabulary range</td></tr>
</table>

<h2>Listening: Score 30+/40</h2>
<ul>
<li>Practice <strong>prediction</strong> — read questions before audio plays</li>
<li>Focus on <strong>plural vs singular</strong> answers</li>
<li>Watch for <strong>answer changes</strong> — speakers sometimes correct themselves</li>
<li>Use the 10-minute transfer time wisely — double-check spellings</li>
</ul>

<h2>Reading: Score 30+/40</h2>
<ul>
<li>Read the <strong>first and last sentences</strong> of each paragraph first</li>
<li>For matching headings, eliminate the easiest matches first</li>
<li>Remember: "Not Given" means the information simply <strong>isn't in the text</strong></li>
<li>Practice speed reading with academic articles</li>
</ul>

<h2>Writing: Band 7 Essentials</h2>
<ul>
<li>Task 2 is worth <strong>twice as much</strong> as Task 1 — prioritize it</li>
<li>Use <strong>less common vocabulary</strong>: "detrimental" instead of "bad"</li>
<li>Show <strong>grammatical range</strong>: conditionals, passive voice, relative clauses</li>
<li>Always proofread for basic errors in the last 3 minutes</li>
</ul>

<h2>Speaking: Band 7 Essentials</h2>
<ul>
<li>Speak <strong>naturally</strong> — don't use memorized speeches</li>
<li>Use <strong>discourse markers</strong>: "Having said that", "On the flip side"</li>
<li>Develop answers with <strong>reasons and examples</strong></li>
<li>Show willingness to <strong>self-correct</strong> when you notice a mistake</li>
</ul>

<h2>Common Band 6.5 Mistakes to Avoid</h2>
<ul>
<li>Writing essays that are <strong>too short</strong></li>
<li>Using <strong>memorized phrases</strong> that don't fit the question</li>
<li>Giving <strong>one-word answers</strong> in Speaking Part 1</li>
<li>Not managing time in Reading — getting stuck on hard questions</li>
</ul>

<h2>Get Band 7+ with Language Academy</h2>
<p>Our IELTS intensive courses are designed for Band 7+ aspirants. <a href="/courses">Enroll now</a> and achieve your target score!</p>`
  },
  {
    title: 'IELTS Writing Task 2 Essay Guide: Templates, Topics & Band 8 Samples',
    slug: 'ielts-writing-task-2-essay-guide',
    excerpt: 'Master IELTS Writing Task 2 with our complete guide. Get essay templates for Opinion, Discussion, Problem-Solution essays plus Band 8 sample answers.',
    category: 'IELTS',
    tags: JSON.stringify(["IELTS Writing","Task 2","IELTS Essay","Essay Templates","Band 8 Writing"]),
    course_relation: 'IELTS',
    reading_time: 10,
    seo_title: 'IELTS Writing Task 2 Guide 2025 | Templates & Band 8 Samples',
    seo_description: 'Complete IELTS Writing Task 2 guide with essay templates, common topics, and Band 8 sample answers. Expert tips from Language Academy.',
    image_url: '/uploads/blogs/ielts-writing-task-2-guide.png',
    is_published: true, is_featured: false,
    content: `<h2>IELTS Writing Task 2: The Complete Guide</h2>
<p>Writing Task 2 requires you to write a <strong>250+ word essay</strong> in 40 minutes on a given topic. It counts for <strong>two-thirds of your Writing score</strong>, making it the most important writing task.</p>

<h2>Essay Types & Templates</h2>

<h3>1. Opinion Essay (Agree/Disagree)</h3>
<p><em>"To what extent do you agree or disagree?"</em></p>
<ul>
<li><strong>Introduction</strong>: Paraphrase topic + clear opinion</li>
<li><strong>Body 1</strong>: First reason for your opinion + example</li>
<li><strong>Body 2</strong>: Second reason + example</li>
<li><strong>Conclusion</strong>: Restate opinion</li>
</ul>

<h3>2. Discussion Essay (Both Views)</h3>
<p><em>"Discuss both views and give your opinion."</em></p>
<ul>
<li><strong>Introduction</strong>: Paraphrase + state you'll discuss both sides</li>
<li><strong>Body 1</strong>: View A + reasons</li>
<li><strong>Body 2</strong>: View B + reasons</li>
<li><strong>Conclusion</strong>: Your opinion + summary</li>
</ul>

<h3>3. Problem-Solution Essay</h3>
<p><em>"What are the problems and what solutions can you suggest?"</em></p>
<ul>
<li><strong>Introduction</strong>: Paraphrase the problem</li>
<li><strong>Body 1</strong>: Problems explained with examples</li>
<li><strong>Body 2</strong>: Solutions with expected outcomes</li>
<li><strong>Conclusion</strong>: Summarize and recommend</li>
</ul>

<h2>Band 8 Writing Checklist</h2>
<ul>
<li>✅ Clear position throughout the essay</li>
<li>✅ Well-developed ideas with relevant examples</li>
<li>✅ Logical paragraph structure with linking words</li>
<li>✅ Range of vocabulary with few errors</li>
<li>✅ Mix of complex and simple sentence structures</li>
<li>✅ Minimum 250 words (aim for 270-290)</li>
</ul>

<h2>Common 2025 Essay Topics</h2>
<ul>
<li>Should governments invest more in public transport or roads?</li>
<li>Is social media beneficial or harmful for society?</li>
<li>Should university education be free for all students?</li>
<li>Do the advantages of remote work outweigh the disadvantages?</li>
<li>Is technology making people less creative?</li>
</ul>

<h2>Master IELTS Writing at Language Academy</h2>
<p>Our IELTS writing workshops include essay correction by experienced examiners. <a href="/courses">Join our IELTS course</a> today!</p>`
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
    console.log('\n✅ IELTS blogs seeded successfully!');
  } catch (err) { console.error('Error:', err.message); }
})();
