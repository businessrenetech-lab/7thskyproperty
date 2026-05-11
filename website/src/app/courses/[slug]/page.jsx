import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowRight, Award, Calendar, CheckCircle2, Clock3, Globe2, MapPin, Phone, ShieldCheck, Sparkles, Star, TrendingUp, Users, Zap } from "lucide-react";
import BookingModalTrigger from "@/components/BookingModalTrigger";
import JsonLd, { courseSchema, breadcrumbSchema } from "@/components/JsonLd";
import { getFallbackCourse } from "@/lib/courseFallbacks";
import { getAbsolutePublicImageUrl, getPublicImageUrl } from "@/lib/imageUrl";
import { fetchPublicJson } from "@/lib/serverApi";

// Force SSR — prevent Next.js from static-generating this page at build time
// (the API isn't available during build, so fetch would fail → 404)
export const dynamic = "force-dynamic";

async function getCourseDetails(slug) {
  const course = await fetchPublicJson(`/api/public/courses/${slug}`, { fallback: getFallbackCourse(slug) });
  return course?.id ? course : getFallbackCourse(slug);
}

function safeParse(value, fallback) {
  if (!value) return fallback;
  if (Array.isArray(value)) return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

function formatScheduleTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hr = parseInt(h);
  return `${hr > 12 ? hr - 12 : hr === 0 ? 12 : hr}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
}

const DAY_ORDER = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];
const DAY_LABELS = { sat: 'Sat', sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri' };

const thumbnails = { PTE: "/pte_course.png", IELTS: "/ielts_course.png", "Spoken English": "/hero_banner.png" };

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const course = await getCourseDetails(slug);
  if (!course) return { title: "Course Not Found" };

  const title = `${course.title} - Language Academy Bangladesh`;
  const description = course.short_description || course.description ||
    `Enroll in ${course.title} at Language Academy Bangladesh. Prepare smarter with expert trainers, small batches, and unlimited mock tests in Dhaka.`;

  return {
    title,
    description,
    alternates: { canonical: `https://languageacademy.com.bd/courses/${slug}` },
    openGraph: {
      title,
      description,
      url: `https://languageacademy.com.bd/courses/${slug}`,
      images: [{
        url: getAbsolutePublicImageUrl(course.image_url, thumbnails[course.category] || "/hero_banner.png"),
        width: 1200, height: 630,
        alt: `${course.title} at Language Academy Bangladesh`,
      }],
    },
  };
}

export default async function CourseDetailPage({ params }) {
  const { slug } = await params;
  const course = await getCourseDetails(slug);
  if (!course) notFound();

  const outcomes = safeParse(course.what_you_will_learn, [
    "Master a clearer exam or communication strategy",
    "Practice with AI-scored mock tests and feedback loops",
    "Build confidence through structured, trainer-led learning",
    "Prepare with stronger accountability and support",
    "Develop time management and exam techniques",
    "Access unlimited mock tests and practice banks",
  ]);

  const modules = safeParse(course.modules, [
    { title: "Orientation & Foundation", lessons: [{ title: "Program kickoff & assessment", duration: "60m" }, { title: "Core strategy setup", duration: "45m" }] },
    { title: "Core Skills Development", lessons: [{ title: "Targeted skill drills", duration: "90m" }, { title: "Practice sessions", duration: "60m" }] },
    { title: "Mock Tests & Review", lessons: [{ title: "Full-length mock test", duration: "120m" }, { title: "1-on-1 review session", duration: "45m" }] },
  ]);

  const courseImage = getPublicImageUrl(course.image_url, thumbnails[course.category] || "/hero_banner.png");

  const features = [
    { icon: Users, label: "Small Batch", desc: "Max 12 students" },
    { icon: Zap, label: "AI Mock Tests", desc: "Full-length practice" },
    { icon: ShieldCheck, label: "Certified Faculty", desc: "Pearson certified" },
    { icon: TrendingUp, label: "Progress Tracking", desc: "Weekly reports" },
    { icon: Globe2, label: "Online + Offline", desc: "Hybrid learning" },
    { icon: Star, label: "Unlimited Mock Tests", desc: "Practice until ready" },
  ];

  return (
    <>
      {/* Course schema — this is how AI search discovers and recommends individual courses */}
      <JsonLd data={courseSchema(course)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: "https://languageacademy.com.bd" },
        { name: "Courses", url: "https://languageacademy.com.bd/courses" },
        { name: course.title, url: `https://languageacademy.com.bd/courses/${course.slug}` },
      ])} />
    <div className="pb-24">
      {/* Hero */}
      <section className="relative overflow-hidden pt-10 pb-14 md:pt-16 md:pb-24 bg-slate-50 border-b border-slate-100">
        <div className="container-shell relative z-10">
          {/* Mobile Course Image */}
          <div className="mb-6 lg:hidden">
            <div className="overflow-hidden rounded-2xl shadow-lg border border-slate-100 bg-white p-1.5">
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl">
                <Image src={courseImage} alt={course.title} fill sizes="100vw" className="object-cover" priority />
              </div>
            </div>
          </div>
          <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-center">
            <div>
              <div className="flex flex-wrap gap-2.5 text-xs font-bold uppercase tracking-[0.18em] mb-5">
                <span className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-slate-500 shadow-sm">{course.category}</span>
                <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3.5 py-1.5 text-emerald-600 shadow-sm">{course.level || "All Levels"}</span>
                {course.duration_weeks && <span className="rounded-full border border-sky-100 bg-sky-50 px-3.5 py-1.5 text-sky-600 shadow-sm">{course.duration_weeks} Weeks</span>}
              </div>
              <h1 className="text-balance text-3xl font-extrabold leading-[1.1] md:text-5xl lg:text-[3.4rem] text-slate-900 tracking-tight">{course.title}</h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-600 md:text-lg md:leading-8">{course.short_description || course.description || "A focused course designed for measurable improvement."}</p>
              <div className="mt-6 flex flex-wrap gap-4 text-sm text-slate-500 font-medium">
                <span className="inline-flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-100 shadow-sm"><Clock3 size={16} className="text-primary" />{course.duration_weeks ? `${course.duration_weeks} Weeks` : "Flexible"}</span>
                <span className="inline-flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-100 shadow-sm"><Users size={16} className="text-primary" />Max 12 per batch</span>
                <span className="inline-flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-100 shadow-sm"><Star size={16} className="text-amber-400" fill="currentColor" />4.9 ★ Rated</span>
              </div>
              {/* Hero CTAs — mobile-visible */}
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={`/enroll?course=${course.slug}`} className="primary-btn px-6 py-3">Enroll Now <ArrowRight size={16} /></Link>
                <BookingModalTrigger courseInterest={course.id} buttonText="Free Consultation" className="secondary-btn px-6 py-3" />
              </div>
              {/* Social Proof */}
              <div className="mt-6 flex items-center gap-3 text-xs text-slate-400">
                <div className="flex -space-x-2">
                  {[1,2,3,4].map(i => <div key={i} className="h-7 w-7 rounded-full border-2 border-white bg-gradient-to-br from-primary/30 to-accent/30" />)}
                </div>
                <span className="font-medium text-slate-500">150+ students enrolled this month</span>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="overflow-hidden rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 bg-white p-2">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[1.5rem]">
                  <Image src={courseImage} alt={course.title} fill sizes="40vw" className="object-cover" priority />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Grid */}
      <section>
        <div className="container-shell grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left Column */}
          <div className="space-y-8">
            {/* What's Included */}
            <div className="premium-panel p-8 md:p-10">
              <h2 className="text-2xl font-extrabold text-slate-900">What&apos;s Included</h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {features.map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="subtle-panel flex items-center gap-3 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon size={18} /></div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{label}</p>
                      <p className="text-xs text-slate-500">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Learning Outcomes */}
            <div className="premium-panel p-8 md:p-10">
              <h2 className="text-2xl font-extrabold text-slate-900">What You&apos;ll Achieve</h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {outcomes.map((item, index) => (
                  <div key={`${item}-${index}`} className="subtle-panel flex items-start gap-3 p-4">
                    <CheckCircle2 className="mt-0.5 text-accent shrink-0" size={18} />
                    <span className="text-sm leading-7 text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Curriculum */}
            <div className="premium-panel p-8 md:p-10">
              <h2 className="text-2xl font-extrabold text-slate-900">Curriculum</h2>
              <div className="mt-6 space-y-3">
                {modules.map((module, index) => (
                  <details key={`${module.title}-${index}`} className="subtle-panel group overflow-hidden">
                    <summary className="flex cursor-pointer list-none items-center justify-between p-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">{index + 1}</span>
                        <span className="text-base font-bold text-slate-900">{module.title}</span>
                      </div>
                      <span className="text-xs text-slate-400">{module.lessons?.length || 0} lessons</span>
                    </summary>
                    <div className="space-y-2 border-t border-slate-200 px-5 pb-5 pt-4">
                      {module.lessons?.map((lesson, li) => (
                        <div key={`${lesson.title}-${li}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                          <span>{lesson.title}</span>
                          <span className="text-xs text-slate-400">{lesson.duration || "45m"}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </div>

            {/* Trust */}
            <div className="premium-panel p-8 md:p-10">
              <h2 className="text-2xl font-extrabold text-slate-900">Why Students Trust This Course</h2>
              <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-3">
                {[
                  { icon: Award, stat: "94%", label: "Target score success rate" },
                  { icon: ShieldCheck, stat: "500+", label: "Certified expert-led sessions" },
                  { icon: Zap, stat: "AI", label: "Powered practice + feedback" },
                ].map(({ icon: Icon, stat, label }) => (
                  <div key={label} className="subtle-panel p-5 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                      <Icon size={22} className="text-primary" />
                    </div>
                    <p className="text-2xl font-extrabold text-slate-900">{stat}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar (Sticky) */}
          <div className="space-y-6 lg:sticky lg:top-28 lg:self-start pt-8 md:pt-10">
            {/* Pricing Card */}
            <div className="rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-7 md:p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-6 -mt-6 h-28 w-28 rounded-full bg-primary/15 blur-2xl" />
                <div className="absolute bottom-0 left-0 -ml-4 -mb-4 h-20 w-20 rounded-full bg-accent/10 blur-xl" />
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/50">Course Investment</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className="text-4xl font-extrabold tracking-tight md:text-5xl">৳{Number(course.base_fee || 0).toLocaleString()}</p>
                  <span className="text-sm font-medium text-white/40">one-time</span>
                </div>
                <p className="mt-3 text-sm text-white/60">Everything included — materials, mock tests & support</p>
              </div>
              <div className="p-6 md:p-7">
                <div className="flex flex-col gap-2.5">
                  <Link href={`/enroll?course=${course.slug}`} className="primary-btn w-full justify-center py-3.5 text-base font-bold">Enroll Now <ArrowRight size={18} /></Link>
                  <BookingModalTrigger courseInterest={course.id} />
                  <a href="tel:+8801913373581" className="secondary-btn w-full justify-center gap-2">
                    <Phone size={16} /> Call +880 1913-373581
                  </a>
                </div>
                <div className="mt-6 space-y-3 border-t border-slate-100 pt-5 text-sm font-medium text-slate-600">
                  <div className="flex items-center gap-3"><ShieldCheck size={16} className="text-emerald-500" />Secure online enrollment</div>
                  <div className="flex items-center gap-3"><Sparkles size={16} className="text-emerald-500" />Unlimited mock tests + AI tools</div>
                  <div className="flex items-center gap-3"><TrendingUp size={16} className="text-emerald-500" />Weekly progress reports</div>
                  <div className="flex items-center gap-3"><CheckCircle2 size={16} className="text-emerald-500" />Money-back guarantee</div>
                </div>
                {/* Mini testimonial */}
                <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs italic leading-5 text-slate-500">&ldquo;Scored 79+ in PTE after just 4 weeks. The AI mock tests were a game-changer.&rdquo;</p>
                  <p className="mt-2 text-xs font-bold text-slate-700">— Recent Student, PTE Academic</p>
                </div>
              </div>
            </div>

            {/* Batches */}
            <div className="premium-panel p-7">
              <h3 className="text-xl font-extrabold text-slate-900">Upcoming Batches</h3>
              <div className="mt-5 space-y-3">
                {course.Batches && course.Batches.length > 0 ? (
                  course.Batches.map((batch) => (
                    <div key={batch.id} className="subtle-panel p-4">
                      <p className="font-bold text-slate-900">{batch.name}</p>
                      <div className="mt-2 space-y-2.5 text-sm text-slate-600">
                        <div className="flex items-center gap-2"><Calendar size={14} className="text-primary" />Starts: {new Date(batch.start_date).toLocaleDateString()}</div>
                        {(() => {
                          let sched = batch.schedule;
                          if (typeof sched === 'string') { try { sched = JSON.parse(sched); } catch { sched = null; } }
                          if (!sched) return null;
                          const sortedDays = (sched.days || []).sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
                          return (
                            <>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Clock3 size={14} className="text-primary shrink-0" />
                                <span className="font-medium">{formatScheduleTime(sched.start_time)} – {formatScheduleTime(sched.end_time)}</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {sortedDays.map(d => (
                                  <span key={d} className="inline-flex items-center justify-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{DAY_LABELS[d] || d}</span>
                                ))}
                              </div>
                            </>
                          );
                        })()}
                        {batch.capacity && batch.enrolled !== undefined && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs mb-1">
                              <span>{batch.capacity - (batch.enrolled || 0)} seats left</span>
                              <span>{batch.enrolled || 0}/{batch.capacity}</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${((batch.enrolled || 0) / batch.capacity) * 100}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="subtle-panel p-4 text-sm leading-7 text-slate-600">No upcoming batches listed. Contact us for the latest admission window.</div>
                )}
              </div>
            </div>

            {/* Faculty */}
            <div className="premium-panel p-7">
              <h3 className="text-xl font-extrabold text-slate-900">Faculty</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {course.instructor_name ? `${course.instructor_name} leads this track with guided strategy and focused support.` : "Delivered by our certified academic faculty with premium coaching support."}
              </p>
              {course.instructor_bio && <p className="mt-2 text-sm leading-7 text-slate-500">{course.instructor_bio}</p>}
            </div>

            {/* Campus */}
            <div className="premium-panel p-7">
              <h3 className="text-xl font-extrabold text-slate-900">Campus & Mode</h3>
              <div className="mt-3 flex items-start gap-3 text-sm leading-7 text-slate-600">
                <MapPin size={18} className="mt-1 text-emerald-500 shrink-0" />
                <span>Available at our Dhanmondi campus (SEL SUFI SQUARE), with online support options.</span>
              </div>
              <BookingModalTrigger buttonText="Talk to an Advisor" className="secondary-btn mt-5 w-full justify-center" courseInterest={course.id} />
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-xl p-3 lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-lg font-extrabold text-slate-900 truncate">৳{Number(course.base_fee || 0).toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 font-medium">All inclusive</p>
          </div>
          <Link href={`/enroll?course=${course.slug}`} className="primary-btn px-5 py-2.5 text-sm whitespace-nowrap">Enroll Now <ArrowRight size={14} /></Link>
        </div>
      </div>
    </div>
    </>
  );
}
