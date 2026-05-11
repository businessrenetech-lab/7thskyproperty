import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clock3, Star, Users } from "lucide-react";
import { getPublicImageUrl } from "@/lib/imageUrl";

export default function CourseCard({ course }) {
  const thumbnails = {
    PTE: "/pte_course.png",
    IELTS: "/ielts_course.png",
    "Spoken English": "/hero_banner.png",
  };

  const thumbnail = getPublicImageUrl(course.image_url, thumbnails[course.category] || "/hero_banner.png");

  return (
    <div className="group rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-xl hover:shadow-slate-200/50 flex h-full flex-col overflow-hidden">
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image src={thumbnail} alt={course.title} fill sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent opacity-60" />
        <div className="absolute bottom-4 left-4 flex gap-2">
          <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-slate-900 shadow-sm backdrop-blur">{course.category}</span>
          <span className="rounded-full bg-emerald-500/95 px-3 py-1 text-xs font-bold text-white shadow-sm backdrop-blur">{course.level || "All Levels"}</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-8">
        <h3 className="text-xl font-extrabold text-slate-900 line-clamp-2 leading-tight group-hover:text-emerald-600 transition-colors">{course.title}</h3>
        <p className="mt-4 flex-1 text-sm leading-7 text-slate-500 line-clamp-3">
          {course.short_description || "Focused coaching, practical feedback, and a stronger pathway toward visible progress."}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-6 text-xs font-bold text-slate-500 uppercase tracking-widest">
          <span className="inline-flex items-center gap-1.5"><Clock3 size={15} className="text-emerald-500" />{course.duration_weeks ? `${course.duration_weeks}W` : "Flex"}</span>
          <span className="inline-flex items-center gap-1.5"><Users size={15} className="text-emerald-500" />Max 12</span>
          <span className="inline-flex items-center gap-1.5"><Star size={15} className="text-amber-400" fill="currentColor" />Unlimited Mock Tests</span>
        </div>
        <div className="mt-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Total Fee</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900 tracking-tight">৳{Number(course.base_fee || 0).toLocaleString()}</p>
          </div>
          <Link href={`/courses/${course.slug || course.id}`} className="rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-600 flex items-center gap-2">
            Details <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
