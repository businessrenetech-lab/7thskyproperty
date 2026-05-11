const mysql = require('mysql2/promise');
require('dotenv').config();

const blogs = [
  {
    title: 'Complete Study Abroad Guide 2025: How to Plan Your International Education Journey',
    slug: 'complete-study-abroad-guide-2025',
    excerpt: 'Planning to study abroad in 2025? Our comprehensive guide covers destination selection, application process, visa requirements, scholarships, and living costs.',
    category: 'Study Abroad',
    tags: JSON.stringify(["Study Abroad","International Education","Study Abroad 2025","Visa Guide","Application Process"]),
    course_relation: 'PTE',
    reading_time: 12,
    seo_title: 'Study Abroad Guide 2025 | Complete Planning Guide for Students',
    seo_description: 'Complete 2025 study abroad guide. Destination selection, application process, visa, scholarships & costs. Expert guidance from Language Academy.',
    image_url: '/uploads/blogs/complete-study-abroad-guide.png',
    is_published: true, is_featured: true,
    content: `<h2>Your Complete Study Abroad Guide for 2025</h2>
<p>Studying abroad is a <strong>life-changing experience</strong> that opens doors to world-class education, global career opportunities, and personal growth. In 2025, international student numbers continue to rise with new scholarship programs and simplified visa processes in many countries.</p>

<h2>Step 1: Choose Your Destination</h2>
<p>Consider these factors when selecting a country:</p>
<ul>
<li><strong>Academic reputation</strong> — university rankings in your field</li>
<li><strong>Post-study work rights</strong> — can you work after graduation?</li>
<li><strong>Living costs</strong> — tuition + accommodation + daily expenses</li>
<li><strong>Safety and culture</strong> — quality of life for international students</li>
<li><strong>Language requirements</strong> — PTE, IELTS, or TOEFL scores needed</li>
</ul>

<h2>Step 2: Meet English Language Requirements</h2>
<table>
<tr><th>Country</th><th>Typical IELTS Requirement</th><th>Typical PTE Requirement</th></tr>
<tr><td>Australia</td><td>6.5-7.0</td><td>58-65</td></tr>
<tr><td>Canada</td><td>6.0-6.5</td><td>50-60</td></tr>
<tr><td>UK</td><td>6.0-7.0</td><td>55-65</td></tr>
<tr><td>USA</td><td>6.5-7.0</td><td>58-68</td></tr>
<tr><td>New Zealand</td><td>6.0-6.5</td><td>50-58</td></tr>
</table>

<h2>Step 3: Application Timeline</h2>
<ol>
<li><strong>12 months before</strong>: Research universities, take English test</li>
<li><strong>9 months before</strong>: Prepare documents, write SOP</li>
<li><strong>6 months before</strong>: Submit applications, apply for scholarships</li>
<li><strong>3 months before</strong>: Accept offer, apply for visa</li>
<li><strong>1 month before</strong>: Book flights, arrange accommodation</li>
</ol>

<h2>Step 4: Financial Planning</h2>
<ul>
<li>Research <strong>tuition fee waivers</strong> and merit scholarships</li>
<li>Calculate total costs including <strong>health insurance and travel</strong></li>
<li>Explore <strong>part-time work</strong> opportunities for students</li>
<li>Check if your country offers <strong>education loans</strong> for study abroad</li>
</ul>

<h2>Step 5: Visa Application</h2>
<ul>
<li>Gather all required documents: offer letter, financial proof, English test scores</li>
<li>Prepare for <strong>visa interview</strong> (if applicable)</li>
<li>Apply early to avoid delays</li>
</ul>

<h2>Start Your Study Abroad Journey with Language Academy</h2>
<p>Language Academy provides complete study abroad guidance including PTE/IELTS preparation, university selection, and visa assistance. <a href="/courses">Get started today</a>!</p>`
  },
  {
    title: 'Study in Australia 2025: Universities, Costs, Visa & Post-Study Work Rights',
    slug: 'study-in-australia-guide-2025',
    excerpt: 'Complete guide to studying in Australia. Top universities, tuition costs, student visa (subclass 500), post-study work rights, and scholarship opportunities.',
    category: 'Study Abroad',
    tags: JSON.stringify(["Study in Australia","Australian Universities","Student Visa","Post-Study Work","Australia Education"]),
    course_relation: 'PTE',
    reading_time: 10,
    seo_title: 'Study in Australia 2025 | Universities, Visa & Scholarships Guide',
    seo_description: 'Complete guide to study in Australia 2025. Top universities, costs, student visa 500, scholarships & post-study work rights. Language Academy.',
    image_url: '/uploads/blogs/study-in-australia-guide.png',
    is_published: true, is_featured: false,
    content: `<h2>Why Study in Australia?</h2>
<p>Australia is the <strong>third most popular study destination</strong> globally, hosting over 750,000 international students. With world-class universities, generous post-study work rights, and a multicultural society, Australia offers an exceptional education experience.</p>

<h2>Top Australian Universities (2025 Rankings)</h2>
<ul>
<li><strong>University of Melbourne</strong> — #14 globally (QS 2025)</li>
<li><strong>University of Sydney</strong> — #18 globally</li>
<li><strong>UNSW Sydney</strong> — #19 globally</li>
<li><strong>Australian National University</strong> — #30 globally</li>
<li><strong>Monash University</strong> — #37 globally</li>
</ul>

<h2>Cost of Studying in Australia</h2>
<table>
<tr><th>Expense</th><th>Annual Cost (AUD)</th></tr>
<tr><td>Undergraduate Tuition</td><td>$20,000 - $45,000</td></tr>
<tr><td>Postgraduate Tuition</td><td>$22,000 - $50,000</td></tr>
<tr><td>Living Costs</td><td>$21,041 (minimum required)</td></tr>
<tr><td>Health Insurance (OSHC)</td><td>$500 - $700</td></tr>
</table>

<h2>Student Visa (Subclass 500)</h2>
<h3>Requirements</h3>
<ul>
<li>Confirmation of Enrolment (CoE) from a registered institution</li>
<li><strong>English proficiency</strong>: IELTS 5.5-6.5 or PTE 42-58 (varies by course)</li>
<li>Genuine Temporary Entrant (GTE) statement</li>
<li>Financial capacity proof: AUD $21,041/year for living</li>
<li>Overseas Student Health Cover (OSHC)</li>
</ul>

<h2>Post-Study Work Rights</h2>
<ul>
<li><strong>Bachelor's degree</strong>: 2-year post-study work visa</li>
<li><strong>Master's degree</strong>: 3-year post-study work visa</li>
<li><strong>PhD</strong>: 4-year post-study work visa</li>
<li>Students can work <strong>48 hours per fortnight</strong> during study</li>
</ul>

<h2>Scholarships for International Students</h2>
<ul>
<li><strong>Australia Awards Scholarships</strong> — fully funded by Australian government</li>
<li><strong>Destination Australia</strong> — for regional area study</li>
<li>University-specific merit and needs-based scholarships</li>
</ul>

<h2>Prepare for Australia with Language Academy</h2>
<p>Get your PTE or IELTS score ready for Australian universities. <a href="/courses">Start your preparation</a> at Language Academy!</p>`
  },
  {
    title: 'Study in Canada 2025: Top Universities, Study Permits & Immigration Pathways',
    slug: 'study-in-canada-guide-2025',
    excerpt: 'Everything you need to know about studying in Canada in 2025. Universities, study permits, costs, part-time work, and PR pathways for international students.',
    category: 'Study Abroad',
    tags: JSON.stringify(["Study in Canada","Canadian Universities","Study Permit","Canada PR","Canada Education"]),
    course_relation: 'IELTS',
    reading_time: 10,
    seo_title: 'Study in Canada 2025 | Universities, Visa & PR Pathways Guide',
    seo_description: 'Complete guide to study in Canada 2025. Top universities, study permit, costs, work rights & PR pathways for international students.',
    image_url: '/uploads/blogs/study-in-canada-guide.png',
    is_published: true, is_featured: false,
    content: `<h2>Why Study in Canada?</h2>
<p>Canada is one of the <strong>most welcoming countries</strong> for international students, offering high-quality education, affordable tuition compared to the US and UK, and clear <strong>pathways to permanent residency</strong>.</p>

<h2>Top Canadian Universities</h2>
<ul>
<li><strong>University of Toronto</strong> — #21 globally (QS 2025)</li>
<li><strong>McGill University</strong> — #29 globally</li>
<li><strong>University of British Columbia</strong> — #34 globally</li>
<li><strong>University of Alberta</strong> — Top 100 globally</li>
<li><strong>University of Waterloo</strong> — Top 100 for Engineering</li>
</ul>

<h2>Cost of Studying in Canada</h2>
<table>
<tr><th>Expense</th><th>Annual Cost (CAD)</th></tr>
<tr><td>Undergraduate Tuition</td><td>$15,000 - $35,000</td></tr>
<tr><td>Graduate Tuition</td><td>$10,000 - $30,000</td></tr>
<tr><td>Living Costs</td><td>$10,000 - $15,000</td></tr>
<tr><td>Health Insurance</td><td>$600 - $900</td></tr>
</table>

<h2>Study Permit Requirements</h2>
<ul>
<li>Acceptance letter from a <strong>Designated Learning Institution (DLI)</strong></li>
<li><strong>English proficiency</strong>: IELTS 6.0-6.5 or PTE 50-60</li>
<li>Proof of financial support: CAD $10,000/year + tuition</li>
<li>Clean criminal record and medical exam</li>
</ul>

<h2>Work Rights & PR Pathways</h2>
<ul>
<li>Work <strong>20 hours/week off-campus</strong> during studies</li>
<li><strong>Post-Graduation Work Permit (PGWP)</strong>: up to 3 years</li>
<li><strong>Express Entry</strong>: Canadian education gives extra CRS points</li>
<li><strong>Provincial Nominee Programs</strong>: additional PR pathways</li>
</ul>

<h2>Popular Programs for International Students</h2>
<ul>
<li>Computer Science & IT</li>
<li>Business Administration & MBA</li>
<li>Engineering</li>
<li>Healthcare & Nursing</li>
<li>Data Science & AI</li>
</ul>

<h2>Prepare for Canada with Language Academy</h2>
<p>Achieve your IELTS or PTE target score for Canadian universities. <a href="/courses">Explore our courses</a> today!</p>`
  },
  {
    title: 'Study in the UK 2025: Russell Group Universities, Student Visa & Funding Options',
    slug: 'study-in-uk-guide-2025',
    excerpt: 'Complete guide to studying in the UK in 2025. Russell Group universities, student visa requirements, tuition fees, scholarships, and the Graduate Route visa.',
    category: 'Study Abroad',
    tags: JSON.stringify(["Study in UK","UK Universities","Student Visa UK","Russell Group","UK Education"]),
    course_relation: 'IELTS',
    reading_time: 9,
    seo_title: 'Study in UK 2025 | Top Universities, Visa & Scholarships Guide',
    seo_description: 'Complete guide to study in UK 2025. Russell Group universities, student visa, fees, Chevening scholarships & Graduate Route. Language Academy.',
    image_url: '/uploads/blogs/study-in-uk-guide.png',
    is_published: true, is_featured: false,
    content: `<h2>Why Study in the UK?</h2>
<p>The UK is home to some of the <strong>world's oldest and most prestigious universities</strong>. With shorter degree programs (3-year Bachelor's, 1-year Master's), students save both time and money compared to other destinations.</p>

<h2>Top UK Universities</h2>
<ul>
<li><strong>University of Oxford</strong> — #3 globally (QS 2025)</li>
<li><strong>University of Cambridge</strong> — #5 globally</li>
<li><strong>Imperial College London</strong> — #6 globally</li>
<li><strong>UCL (University College London)</strong> — #9 globally</li>
<li><strong>University of Edinburgh</strong> — #22 globally</li>
</ul>

<h2>Cost of Studying in the UK</h2>
<table>
<tr><th>Expense</th><th>Annual Cost (GBP)</th></tr>
<tr><td>Undergraduate Tuition</td><td>£10,000 - £38,000</td></tr>
<tr><td>Postgraduate Tuition</td><td>£11,000 - £40,000</td></tr>
<tr><td>Living Costs (London)</td><td>£12,006 - £15,000</td></tr>
<tr><td>Living Costs (Outside London)</td><td>£9,207 - £12,000</td></tr>
</table>

<h2>Student Visa Requirements</h2>
<ul>
<li><strong>CAS (Confirmation of Acceptance for Studies)</strong> from your university</li>
<li><strong>English proficiency</strong>: IELTS 5.5-7.0 or PTE equivalent</li>
<li>Financial proof: enough for tuition + living costs for 9 months</li>
<li>TB test certificate (for certain countries)</li>
</ul>

<h2>Graduate Route Visa</h2>
<p>After completing your degree, you can stay in the UK to <strong>work for 2 years</strong> (3 years for PhD graduates) without a sponsor through the Graduate Route visa.</p>

<h2>Scholarships</h2>
<ul>
<li><strong>Chevening Scholarships</strong> — fully funded by UK government</li>
<li><strong>Commonwealth Scholarships</strong> — for developing country students</li>
<li><strong>GREAT Scholarships</strong> — partial funding for specific countries</li>
<li>University-specific scholarships and fee waivers</li>
</ul>

<h2>Prepare for UK with Language Academy</h2>
<p>Get your IELTS score ready for UK universities. <a href="/courses">Start your preparation</a> at Language Academy!</p>`
  },
  {
    title: 'Top Scholarships for International Students 2025: Fully Funded Opportunities Worldwide',
    slug: 'top-scholarships-international-students-2025',
    excerpt: 'Discover the best fully funded scholarships for international students in 2025. Government scholarships, university grants, and financial aid across top destinations.',
    category: 'Study Abroad',
    tags: JSON.stringify(["Scholarships","Fully Funded","International Students","Study Abroad Scholarships","Financial Aid"]),
    course_relation: 'PTE',
    reading_time: 10,
    seo_title: 'Top Scholarships for International Students 2025 | Fully Funded',
    seo_description: 'Best fully funded scholarships for international students 2025. Government scholarships, university grants for Australia, Canada, UK, USA & more.',
    image_url: '/uploads/blogs/scholarships-international-students.png',
    is_published: true, is_featured: true,
    content: `<h2>Best Scholarships for International Students in 2025</h2>
<p>Funding is often the biggest barrier to studying abroad. Fortunately, many governments and universities offer <strong>generous scholarships</strong> that cover tuition, living expenses, and even travel costs.</p>

<h2>Government-Funded Scholarships</h2>

<h3>🇦🇺 Australia Awards Scholarships</h3>
<ul>
<li><strong>Coverage</strong>: Full tuition, living allowance, airfare, health insurance</li>
<li><strong>Eligibility</strong>: Students from participating countries</li>
<li><strong>Deadline</strong>: Usually April-May each year</li>
</ul>

<h3>🇬🇧 Chevening Scholarships (UK)</h3>
<ul>
<li><strong>Coverage</strong>: Full tuition, living expenses, travel, visa</li>
<li><strong>Eligibility</strong>: 2+ years work experience, return to home country</li>
<li><strong>Deadline</strong>: November each year</li>
</ul>

<h3>🇨🇦 Vanier Canada Graduate Scholarships</h3>
<ul>
<li><strong>Coverage</strong>: CAD $50,000/year for 3 years</li>
<li><strong>Eligibility</strong>: PhD students with leadership and academic excellence</li>
</ul>

<h3>🇺🇸 Fulbright Foreign Student Program</h3>
<ul>
<li><strong>Coverage</strong>: Tuition, living expenses, airfare, health insurance</li>
<li><strong>Eligibility</strong>: Graduate students from 160+ countries</li>
</ul>

<h2>University-Specific Scholarships</h2>
<table>
<tr><th>University</th><th>Scholarship</th><th>Value</th></tr>
<tr><td>University of Melbourne</td><td>Graduate Research Scholarships</td><td>Full tuition + AUD $35,000/yr</td></tr>
<tr><td>University of Toronto</td><td>Lester B. Pearson Scholarships</td><td>Full tuition + living costs</td></tr>
<tr><td>University of Oxford</td><td>Clarendon Scholarships</td><td>Full tuition + living costs</td></tr>
<tr><td>MIT</td><td>MIT Scholarships</td><td>Need-based full funding</td></tr>
</table>

<h2>How to Improve Your Scholarship Chances</h2>
<ul>
<li>Achieve a <strong>high English test score</strong> (IELTS 7+ or PTE 65+)</li>
<li>Write a <strong>compelling personal statement</strong></li>
<li>Demonstrate <strong>leadership and community involvement</strong></li>
<li>Apply to <strong>multiple scholarships</strong> simultaneously</li>
<li>Meet all deadlines — late applications are never considered</li>
</ul>

<h2>Language Academy: Your Scholarship-Ready Partner</h2>
<p>A strong PTE or IELTS score is essential for scholarship applications. <a href="/courses">Prepare with Language Academy</a> and maximize your scholarship chances!</p>`
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
    console.log('\n✅ Study Abroad blogs seeded successfully!');
  } catch (err) { console.error('Error:', err.message); }
})();
