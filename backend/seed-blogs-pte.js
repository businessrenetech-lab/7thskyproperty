const mysql = require('mysql2/promise');
require('dotenv').config();

const blogs = [
  {
    title: 'PTE Academic Complete Preparation Guide 2025: Score 79+ With Proven Strategies',
    slug: 'pte-academic-preparation-guide-2025',
    excerpt: 'Master the PTE Academic exam with our comprehensive 2025 preparation guide. Learn proven strategies for Speaking, Writing, Reading & Listening to achieve your target score of 79+.',
    category: 'PTE',
    tags: JSON.stringify(["PTE Academic","PTE Preparation","PTE Tips","PTE 2025","Score 79+"]),
    course_relation: 'PTE',
    reading_time: 12,
    seo_title: 'PTE Academic Preparation Guide 2025 | Score 79+ Tips & Strategies',
    seo_description: 'Complete PTE Academic preparation guide for 2025. Expert strategies for Speaking, Writing, Reading & Listening modules. Free tips to score 79+ from Language Academy.',
    image_url: '/uploads/blogs/pte-preparation-guide-2025.png',
    is_published: true,
    is_featured: true,
    content: `<h2>Your Complete Roadmap to PTE Academic Success in 2025</h2>
<p>The <strong>PTE Academic</strong> (Pearson Test of English) is one of the most widely accepted English proficiency tests for study abroad, migration, and professional registration. With its AI-based scoring system, PTE rewards <strong>consistency, clarity, and strategy</strong> over memorized templates.</p>

<h2>Understanding the PTE Academic Format</h2>
<p>PTE Academic is a <strong>computer-based test</strong> lasting approximately 2 hours. It consists of three main sections:</p>
<ul>
<li><strong>Speaking & Writing</strong> (54–67 minutes): Read Aloud, Repeat Sentence, Describe Image, Retell Lecture, Summarize Written Text, Essay</li>
<li><strong>Reading</strong> (29–30 minutes): Fill in the Blanks, Multiple Choice, Re-order Paragraphs</li>
<li><strong>Listening</strong> (30–43 minutes): Summarize Spoken Text, Multiple Choice, Fill in Blanks, Write from Dictation</li>
</ul>

<h2>Top 10 Strategies to Score 79+ in PTE Academic</h2>
<h3>1. Focus on Integrated Scoring</h3>
<p>PTE uses <strong>integrated scoring</strong> — your Speaking performance can affect your Reading and Listening scores. Understanding this cross-scoring system is crucial for maximizing your overall result.</p>

<h3>2. Master Read Aloud</h3>
<p>Read Aloud contributes to both Speaking and Reading scores. Practice reading at a <strong>natural pace with clear pronunciation</strong>. Don't rush — the AI scores fluency and oral accuracy.</p>

<h3>3. Practice Repeat Sentence Daily</h3>
<p>This task tests your short-term memory and oral fluency. Listen carefully, retain the sentence structure, and repeat with <strong>natural intonation</strong>.</p>

<h3>4. Use Templates Wisely for Essays</h3>
<p>While templates can help structure your essay, the AI now detects over-reliance on memorized content. Focus on <strong>relevant arguments with proper grammar</strong>.</p>

<h3>5. Improve Spelling for Write from Dictation</h3>
<p>Write from Dictation is one of the <strong>highest-scoring tasks</strong>. Each correct word earns points. Practice spelling commonly dictated academic words.</p>

<h3>6. Build Academic Vocabulary</h3>
<p>Strong vocabulary improves scores across all four communicative skills. Read academic articles daily and maintain a vocabulary journal.</p>

<h3>7. Take Timed Mock Tests Weekly</h3>
<p>Simulate real exam conditions with <strong>full-length mock tests</strong>. Analyze your scores and identify weak areas for targeted improvement.</p>

<h3>8. Work on Pronunciation</h3>
<p>The AI evaluates vowel sounds, consonant clusters, and word stress. Use shadowing techniques with native English audio content.</p>

<h3>9. Manage Your Time Effectively</h3>
<p>PTE is strictly timed. Practice completing each task within the allocated time. Don't spend too long on any single question.</p>

<h3>10. Stay Calm and Consistent</h3>
<p>The AI scores consistency. Maintain a <strong>steady pace throughout the exam</strong>. Avoid sudden changes in volume or speed.</p>

<h2>Recommended Study Plan</h2>
<table>
<tr><th>Week</th><th>Focus Area</th><th>Daily Hours</th></tr>
<tr><td>1-2</td><td>Understanding format & baseline test</td><td>2 hours</td></tr>
<tr><td>3-4</td><td>Speaking & Writing intensive</td><td>3 hours</td></tr>
<tr><td>5-6</td><td>Reading & Listening practice</td><td>3 hours</td></tr>
<tr><td>7-8</td><td>Full mock tests & review</td><td>3-4 hours</td></tr>
</table>

<h2>Start Your PTE Journey with Language Academy</h2>
<p>At <strong>Language Academy</strong>, we offer expert-led PTE preparation courses with unlimited mock tests, personalized feedback, and proven strategies. Our students consistently achieve 79+ scores. <a href="/courses">Explore our PTE courses</a> and start your journey today!</p>`
  },
  {
    title: 'PTE Speaking Module: 8 Expert Tips to Maximize Your Score in 2025',
    slug: 'pte-speaking-module-tips-2025',
    excerpt: 'Struggling with PTE Speaking? Learn 8 expert-proven tips for Read Aloud, Repeat Sentence, Describe Image & Retell Lecture to boost your speaking score.',
    category: 'PTE',
    tags: JSON.stringify(["PTE Speaking","PTE Tips","Read Aloud","Repeat Sentence","Describe Image"]),
    course_relation: 'PTE',
    reading_time: 8,
    seo_title: 'PTE Speaking Tips 2025 | 8 Expert Strategies for High Score',
    seo_description: 'Master PTE Speaking with 8 expert tips for Read Aloud, Repeat Sentence, Describe Image & Retell Lecture. Proven strategies from Language Academy.',
    image_url: '/uploads/blogs/pte-speaking-module-tips.png',
    is_published: true,
    is_featured: false,
    content: `<h2>Master PTE Speaking: Your Guide to a High Score</h2>
<p>The PTE Speaking section is <strong>AI-scored</strong>, meaning the computer evaluates your pronunciation, fluency, and oral accuracy. Unlike IELTS, there's no human examiner — which means <strong>consistency and clarity</strong> are your best friends.</p>

<h2>PTE Speaking Task Breakdown</h2>
<ul>
<li><strong>Read Aloud (6-7 items)</strong> — Read a text passage aloud</li>
<li><strong>Repeat Sentence (10-12 items)</strong> — Listen and repeat exactly</li>
<li><strong>Describe Image (3-4 items)</strong> — Describe a graph, chart, or image</li>
<li><strong>Retell Lecture (1-2 items)</strong> — Summarize a lecture you heard</li>
<li><strong>Answer Short Question (5-6 items)</strong> — Give brief answers</li>
</ul>

<h3>Tip 1: Speak at a Natural Pace</h3>
<p>Don't rush. The AI evaluates <strong>fluency</strong>, which means smooth, natural delivery. Speaking too fast causes mumbling and reduces your score.</p>

<h3>Tip 2: Use Chunking in Read Aloud</h3>
<p>Break sentences into <strong>meaningful chunks</strong> of 3-5 words. Pause briefly between chunks. This improves both fluency and pronunciation scores.</p>

<h3>Tip 3: Shadow Native Speakers</h3>
<p>Listen to English podcasts or TED talks and <strong>repeat along simultaneously</strong>. This builds natural intonation patterns.</p>

<h3>Tip 4: Memorize Describe Image Templates</h3>
<p>Use a structured approach: <em>"This image shows/illustrates... The main trend is... In conclusion..."</em>. Practice with different chart types daily.</p>

<h3>Tip 5: Focus on Content Words in Repeat Sentence</h3>
<p>If you can't remember every word, prioritize <strong>nouns, verbs, and adjectives</strong>. Content words carry more weight than function words.</p>

<h3>Tip 6: Record and Review Yourself</h3>
<p>Record your practice sessions and compare with model answers. Identify pronunciation errors and work on them systematically.</p>

<h3>Tip 7: Don't Correct Mistakes Mid-Sentence</h3>
<p>If you make an error, <strong>keep going</strong>. Self-correction breaks fluency and costs more points than the original mistake.</p>

<h3>Tip 8: Practice with a Quality Microphone</h3>
<p>Audio quality affects AI scoring. Use a good headset and practice in a quiet environment to simulate exam conditions.</p>

<h2>Get Expert Coaching at Language Academy</h2>
<p>Our PTE Speaking masterclass includes AI-powered practice tools and instructor feedback. <a href="/courses">Join our PTE course</a> today!</p>`
  },
  {
    title: 'PTE Writing Module Mastery: Essay Templates & Summarize Written Text Tips',
    slug: 'pte-writing-module-mastery-guide',
    excerpt: 'Complete guide to PTE Writing — master Summarize Written Text and Essay Writing with proven templates, grammar tips, and scoring strategies for 2025.',
    category: 'PTE',
    tags: JSON.stringify(["PTE Writing","PTE Essay","Summarize Written Text","PTE Grammar","PTE Templates"]),
    course_relation: 'PTE',
    reading_time: 9,
    seo_title: 'PTE Writing Tips 2025 | Essay Templates & SWT Strategies',
    seo_description: 'Master PTE Writing with expert essay templates and Summarize Written Text strategies. Grammar tips and scoring guide from Language Academy.',
    image_url: '/uploads/blogs/pte-writing-module-mastery.png',
    is_published: true,
    is_featured: false,
    content: `<h2>PTE Writing Module: What You Need to Know</h2>
<p>The PTE Writing section includes two task types: <strong>Summarize Written Text (SWT)</strong> and <strong>Essay Writing</strong>. Both are AI-scored for content, grammar, vocabulary, and structure.</p>

<h2>Summarize Written Text (SWT)</h2>
<h3>Key Rules</h3>
<ul>
<li>Write <strong>one single sentence</strong> between 5-75 words</li>
<li>Use complex sentence structures with connectors</li>
<li>Capture the <strong>main idea and key supporting points</strong></li>
<li>Time limit: 10 minutes per passage</li>
</ul>

<h3>SWT Template Strategy</h3>
<p>Use this structure: <em>"The passage discusses [main idea], highlighting that [key point 1], while also emphasizing [key point 2], and concluding that [key point 3]."</em></p>

<h2>Essay Writing</h2>
<h3>Essay Structure (200-300 words)</h3>
<ol>
<li><strong>Introduction</strong> (40-50 words): Paraphrase the topic + thesis statement</li>
<li><strong>Body Paragraph 1</strong> (70-80 words): Main argument + example</li>
<li><strong>Body Paragraph 2</strong> (70-80 words): Supporting argument + evidence</li>
<li><strong>Conclusion</strong> (30-40 words): Summarize + final thought</li>
</ol>

<h3>Common Essay Topics in 2025</h3>
<ul>
<li>Technology's impact on education and communication</li>
<li>Environmental sustainability and climate change</li>
<li>Work-life balance in the modern world</li>
<li>Globalization and cultural identity</li>
<li>Government vs. individual responsibility</li>
</ul>

<h3>Grammar Checklist for High Scores</h3>
<ul>
<li>Use a mix of <strong>simple, compound, and complex sentences</strong></li>
<li>Avoid spelling errors — they directly reduce your score</li>
<li>Use <strong>academic collocations</strong>: "significant impact", "growing concern"</li>
<li>Maintain consistent verb tenses throughout</li>
</ul>

<h2>Practice with Language Academy</h2>
<p>Our PTE Writing workshops include AI essay grading and personalized feedback. <a href="/courses">Explore our PTE courses</a> to improve your writing score!</p>`
  },
  {
    title: 'PTE Reading Module Strategies: How to Score 79+ in Fill in the Blanks & Reorder',
    slug: 'pte-reading-module-strategies-2025',
    excerpt: 'Boost your PTE Reading score with expert strategies for Fill in the Blanks, Reorder Paragraphs, and Multiple Choice questions. Proven tips for 79+.',
    category: 'PTE',
    tags: JSON.stringify(["PTE Reading","Fill in Blanks","Reorder Paragraphs","PTE Strategies","PTE Score"]),
    course_relation: 'PTE',
    reading_time: 7,
    seo_title: 'PTE Reading Tips 2025 | Fill in Blanks & Reorder Strategies for 79+',
    seo_description: 'Expert PTE Reading strategies for Fill in the Blanks, Reorder Paragraphs & Multiple Choice. Score 79+ with proven tips from Language Academy.',
    image_url: '/uploads/blogs/pte-reading-module-strategies.png',
    is_published: true,
    is_featured: false,
    content: `<h2>PTE Reading: Your Strategy Guide</h2>
<p>The PTE Reading section lasts <strong>29-30 minutes</strong> and tests your ability to understand academic texts. Key task types include Fill in the Blanks (both Reading and R&W), Reorder Paragraphs, and Multiple Choice.</p>

<h2>Fill in the Blanks (Reading & Writing)</h2>
<p>This is one of the <strong>most important tasks</strong> as it contributes to both Reading and Writing scores.</p>
<h3>Strategy</h3>
<ul>
<li>Read the <strong>entire sentence</strong> before choosing an answer</li>
<li>Look for <strong>collocations</strong> — words that naturally go together</li>
<li>Check <strong>grammatical fit</strong>: does the word match the sentence structure?</li>
<li>Use <strong>context clues</strong> from surrounding sentences</li>
</ul>

<h2>Reorder Paragraphs</h2>
<h3>Step-by-Step Approach</h3>
<ol>
<li><strong>Find the topic sentence</strong> — it introduces a new idea without referring back</li>
<li>Look for <strong>pronoun references</strong> (this, that, these, such)</li>
<li>Identify <strong>transition words</strong> (however, moreover, consequently)</li>
<li>Check for <strong>logical flow</strong> — cause before effect, general before specific</li>
</ol>

<h2>Multiple Choice Questions</h2>
<ul>
<li>Read the question <strong>before</strong> reading the passage</li>
<li>Eliminate obviously wrong answers first</li>
<li>For "select multiple" questions, look for answers supported by <strong>direct evidence</strong> in the text</li>
</ul>

<h2>Vocabulary Building Tips</h2>
<p>Reading scores improve dramatically with <strong>strong vocabulary</strong>. Read academic journals, news editorials, and scientific articles daily. Focus on learning words in context rather than isolated definitions.</p>

<h2>Improve Your PTE Reading at Language Academy</h2>
<p>Our structured PTE courses include targeted Reading practice with expert guidance. <a href="/courses">Start your preparation</a> today!</p>`
  },
  {
    title: 'PTE Listening Module Guide: Ace Write from Dictation & Summarize Spoken Text',
    slug: 'pte-listening-module-guide-2025',
    excerpt: 'Master the PTE Listening module with expert tips for Write from Dictation, Summarize Spoken Text, and other high-scoring tasks. Complete 2025 guide.',
    category: 'PTE',
    tags: JSON.stringify(["PTE Listening","Write from Dictation","Summarize Spoken Text","PTE Tips","Listening Practice"]),
    course_relation: 'PTE',
    reading_time: 8,
    seo_title: 'PTE Listening Tips 2025 | Write from Dictation & SST Guide',
    seo_description: 'Complete PTE Listening guide with expert tips for Write from Dictation, Summarize Spoken Text & more. Score high with Language Academy strategies.',
    image_url: '/uploads/blogs/pte-listening-module-guide.png',
    is_published: true,
    is_featured: false,
    content: `<h2>PTE Listening Module: Complete Guide</h2>
<p>The Listening section is the <strong>final part of PTE Academic</strong>, lasting 30-43 minutes. It's crucial because it contains <strong>Write from Dictation</strong>, one of the highest-scoring tasks in the entire exam.</p>

<h2>Write from Dictation (WFD)</h2>
<p>This task alone can contribute <strong>up to 29 points</strong> to your Listening and Writing scores.</p>
<h3>Key Tips</h3>
<ul>
<li>Listen for <strong>content words first</strong> (nouns, verbs, adjectives)</li>
<li>Write the sentence <strong>immediately</strong> after hearing it</li>
<li>Focus on correct <strong>spelling</strong> — each word counts</li>
<li>Practice with commonly repeated WFD sentences</li>
</ul>

<h2>Summarize Spoken Text (SST)</h2>
<h3>Structure</h3>
<p>Write 50-70 words summarizing the lecture. Use this template:</p>
<ul>
<li><strong>Opening</strong>: "The speaker discussed/explained..."</li>
<li><strong>Key Points</strong>: "The main points included... Additionally..."</li>
<li><strong>Conclusion</strong>: "In conclusion, the speaker emphasized..."</li>
</ul>

<h2>Other Listening Tasks</h2>
<h3>Highlight Correct Summary</h3>
<p>Listen for the <strong>overall message</strong>, not just individual details. Eliminate options that contradict the main idea.</p>

<h3>Fill in the Blanks</h3>
<p>Follow along with the transcript and fill missing words. Focus on <strong>spelling accuracy</strong> and word form (singular vs. plural).</p>

<h2>Daily Listening Practice Routine</h2>
<ul>
<li>Listen to <strong>BBC, CNN, or TED Talks</strong> for 30 minutes daily</li>
<li>Practice <strong>note-taking</strong> while listening</li>
<li>Do 5-10 WFD practice sentences every day</li>
<li>Take a full listening mock test weekly</li>
</ul>

<h2>Excel in PTE Listening with Language Academy</h2>
<p>Our PTE courses include extensive listening practice with AI-scored mock tests. <a href="/courses">Join Language Academy</a> for expert preparation!</p>`
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
    console.log('\n✅ PTE blogs seeded successfully!');
  } catch (err) { console.error('Error:', err.message); }
})();
