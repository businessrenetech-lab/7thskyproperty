import Link from 'next/link';
import { Lock, ArrowRight, BookOpen } from 'lucide-react';

export const metadata = {
  title: "Student Materials | Language Academy",
  description: "Access your premium study materials, mock tests, and class notes.",
  alternates: { canonical: "/materials" },
  robots: { index: false, follow: false },
};

export default function MaterialsPage() {
  const portalUrl = process.env.NODE_ENV === 'production'
    ? 'https://languageacademy.com.bd/student'
    : 'http://localhost:5174/student';

  return (
    <div className="pt-32 pb-24 min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4 sm:px-6">
        
        <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 p-8 text-center border border-slate-100">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
            <BookOpen className="text-primary w-10 h-10 -rotate-3" />
          </div>
          
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Premium Materials</h1>
          <p className="text-slate-500 mb-8">
            Our study materials, class recordings, and AI mock tests are exclusively available to enrolled students.
          </p>

          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-8 text-left flex gap-4 mt-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Lock size={64} />
            </div>
            <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center shrink-0">
               <Lock className="text-slate-500" size={18} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">Authenticated Access Only</h4>
              <p className="text-xs text-slate-500">Please log in to the Student LMS Portal to view your enrolled courses and access related documents.</p>
            </div>
          </div>

          <a 
            href={portalUrl} 
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-primary/30 flex items-center justify-center gap-2"
          >
            Login to Student Portal <ArrowRight size={18} />
          </a>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              Not enrolled yet? <Link href="/courses" className="text-primary font-bold hover:underline">Browse Courses</Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
