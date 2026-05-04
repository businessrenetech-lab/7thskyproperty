import Link from "next/link";
import { ArrowRight, Globe, Mail, MapPin, Phone, Clock } from "lucide-react";
import { FiFacebook as Facebook, FiInstagram as Instagram, FiLinkedin as Linkedin } from "react-icons/fi";
import { SiTiktok as Tiktok } from "react-icons/si";
import NewsletterSignup from "./NewsletterSignup";

const quickLinks = [
  { label: "Home", href: "/" },
  { label: "Courses", href: "/courses" },
  { label: "About Us", href: "/about" },
  { label: "Blog & Resources", href: "/blog" },
  { label: "Contact", href: "/contact" },
  { label: "Enroll Now", href: "/enroll" },
];

const programs = [
  { label: "PTE Academic", href: "/courses" },
  { label: "IELTS Preparation", href: "/courses" },
  { label: "Spoken English", href: "/courses" },
  { label: "Mock Test Support", href: "/courses" },
  { label: "Corporate Training", href: "/contact" },
];

const socialLinks = [
  { icon: Facebook, href: "https://www.facebook.com/languageacademybangladesh", label: "Facebook" },
  { icon: Instagram, href: "https://instagram.com/languageacademy.bd/", label: "Instagram" },
  { icon: Linkedin, href: "https://linkedin.com/company/languageacademybangladesh", label: "LinkedIn" },
  { icon: Tiktok, href: "https://tiktok.com/@languageacademybangladesh", label: "TikTok" },
];

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-300">
      {/* Newsletter Section */}
      <div className="border-b border-slate-800/60">
        <div className="container-shell py-12">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <h3 className="text-2xl font-extrabold text-white">Stay ahead with expert tips & updates</h3>
              <p className="mt-2 text-sm text-slate-400">Join 3,000+ students receiving weekly strategies for PTE, IELTS, and career growth.</p>
            </div>
            <NewsletterSignup variant="dark" />
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container-shell py-14">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_0.7fr_0.8fr_1.1fr]">
          {/* Brand */}
          <div className="max-w-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-sky-500 text-white shadow-[0_14px_28px_-14px_rgba(56,189,248,0.5)]">
                <span className="text-base font-extrabold">LA</span>
              </div>
              <div>
                <div className="text-lg font-extrabold text-white">Language Academy</div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Premium English Coaching</div>
              </div>
            </div>
            <p className="text-sm leading-7 text-slate-400">
              Bangladesh&apos;s best PTE coaching centre. Expert-led PTE Academic preparation, IELTS coaching, and Spoken English courses in Dhaka &mdash; available both online and offline. AI-scored mock tests and small-batch classes for guaranteed score improvement.
            </p>
            {/* Social Links */}
            <div className="mt-6 flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50 text-slate-400 transition hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                  aria-label={social.label}
                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-white">Explore</h3>
            <ul className="space-y-2.5 text-sm">
              {quickLinks.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="transition hover:text-white hover:translate-x-1 inline-block">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Programs */}
          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-white">Programs</h3>
            <ul className="space-y-2.5 text-sm text-slate-400">
              {programs.map((program) => (
                <li key={program.label}>
                  <Link href={program.href} className="transition hover:text-white hover:translate-x-1 inline-block">
                    {program.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Hours */}
          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-white">Get in Touch</h3>
            <div className="space-y-3 text-sm text-slate-400">
              <div className="flex items-start gap-3">
                <MapPin size={16} className="mt-1 text-accent shrink-0" />
                <span>SEL SUFI SQUARE, Unit: 1104, Level: 11, Dhanmondi R/A, Dhaka 1209</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-accent shrink-0" />
                <span>+880 1913-373581</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-accent shrink-0" />
                <span>hello@languageacademy.com.bd</span>
              </div>
              <div className="flex items-start gap-3">
                <Clock size={16} className="mt-1 text-accent shrink-0" />
                <div>
                  <p>Sat – Thu: 9:00 AM – 8:00 PM</p>
                  <p>Friday: Closed</p>
                </div>
              </div>
            </div>
            <div className="mt-5">
              <Link href="/contact" className="inline-flex items-center gap-2 text-sm font-semibold text-white transition hover:text-accent">
                Book a consultation <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col gap-4 border-t border-slate-800 pt-6 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Language Academy. All rights reserved.</p>
          <div className="flex gap-5">
            <span className="cursor-pointer transition hover:text-white">Privacy Policy</span>
            <span className="cursor-pointer transition hover:text-white">Terms of Service</span>
            <span className="cursor-pointer transition hover:text-white">Refund Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
