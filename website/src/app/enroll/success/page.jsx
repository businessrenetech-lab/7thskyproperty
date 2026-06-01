import Link from 'next/link';
import { CheckCircle2, Home, User } from 'lucide-react';

export const metadata = {
  title: "Enrollment Successful | Language Academy",
};

export default async function SuccessPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const transactionParam = resolvedSearchParams?.tran_id;
  const transactionId = Array.isArray(transactionParam) ? transactionParam[0] : transactionParam || 'UNKNOWN';

  const portalUrl = process.env.NODE_ENV === 'production'
    ? 'https://languageacademy.com.bd/student'
    : 'http://localhost:5174/student';

  return (
    <div className="pt-32 pb-24 min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4 sm:px-6">
        
        <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 p-8 text-center border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-green-600" />
          
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="text-green-600 w-10 h-10" />
          </div>
          
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Welcome to the Academy!</h1>
            <p className="text-slate-500 mb-6">
             Your enrollment was successful. We&apos;ve sent a confirmation and your login credentials to your email address.
            </p>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-8 text-left">
            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Transaction ID</div>
            <div className="text-slate-800 font-mono text-sm font-medium">{transactionId}</div>
          </div>

          <div className="space-y-3 flex flex-col items-center">
            {/* Directing student to their portal which is running on port 5174 usually, or proxied heavily */}
            <a 
              href={portalUrl} 
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-all shadow flex items-center justify-center gap-2"
            >
              <User size={18} /> Go to Student Portal
            </a>
            
            <Link 
              href="/" 
              className="w-full bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Home size={18} /> Return to Home
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
