"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock, ArrowRight, BookOpen } from 'lucide-react';
import { getBlogImageFallback, getPublicImageUrl } from '@/lib/imageUrl';

export default function BlogCard({ blog, priority = false }) {
  const {
    slug,
    title,
    excerpt,
    image_url,
    category,
    reading_time,
    published_at
  } = blog;

  const formattedDate = new Date(published_at || new Date()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <article className="group relative flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
      {/* Image Container */}
      <Link href={`/blog/${slug}`} className="block relative aspect-[3/2] overflow-hidden bg-slate-100">
        {image_url ? (
          <Image
            src={getPublicImageUrl(image_url, getBlogImageFallback(category))}
            alt={title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            priority={priority}
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
            <BookOpen size={48} className="text-slate-300" />
          </div>
        )}

        {/* Category Badge Overlay */}
        {category && (
          <div className="absolute top-4 left-4">
            <span className="inline-flex items-center px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-lg text-xs font-bold uppercase tracking-wider text-slate-800 shadow-sm">
              {category}
            </span>
          </div>
        )}

        {/* Gradient Overlay on Hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </Link>

      {/* Content */}
      <div className="flex flex-col flex-1 p-6 md:p-7">
        {/* Meta Row */}
        <div className="flex items-center gap-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          <span className="flex items-center gap-1.5">
            <Calendar size={12} />
            {formattedDate}
          </span>
          {reading_time && (
            <>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="flex items-center gap-1.5">
                <Clock size={12} />
                {reading_time} min read
              </span>
            </>
          )}
        </div>

        {/* Title */}
        <h3 className="mb-3 text-xl font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-300">
          <Link href={`/blog/${slug}`}>
            {title}
          </Link>
        </h3>

        {/* Excerpt */}
        <p className="flex-1 text-slate-600 leading-relaxed line-clamp-3 mb-6">
          {excerpt || "Discover valuable insights and strategies in this comprehensive guide."}
        </p>

        {/* CTA */}
        <div className="pt-5 border-t border-slate-100 mt-auto">
          <Link
            href={`/blog/${slug}`}
            className="inline-flex items-center gap-2 text-primary font-semibold text-sm hover:gap-3 transition-all duration-300"
          >
            Read Full Guide
            <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </article>
  );
}
