"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Calendar, Clock, BookOpen, Search, Filter, ArrowUpRight } from 'lucide-react';
import { getPublicImageUrl } from '@/lib/imageUrl';
import BlogCard from './BlogCard';
import ResourceCard from './ResourceCard';

export default function LearningHubClient({ blogs = [], resources = [] }) {
  const [blogItems, setBlogItems] = useState(Array.isArray(blogs) ? blogs : []);
  const [resourceItems, setResourceItems] = useState(Array.isArray(resources) ? resources : []);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const hasInitialContent = blogItems.length > 0 || resourceItems.length > 0;

  useEffect(() => {
    if (hasInitialContent) return undefined;

    let cancelled = false;
    const refreshContent = async () => {
      try {
        const [blogRes, resourceRes] = await Promise.all([
          fetch('/api/public/blog', { cache: 'no-store' }),
          fetch('/api/public/resources', { cache: 'no-store' }),
        ]);

        const [nextBlogs, nextResources] = await Promise.all([
          blogRes.ok ? blogRes.json() : [],
          resourceRes.ok ? resourceRes.json() : [],
        ]);

        if (cancelled) return;
        if (Array.isArray(nextBlogs) && nextBlogs.length > 0) setBlogItems(nextBlogs);
        if (Array.isArray(nextResources)) setResourceItems(nextResources);
      } catch (error) {
        console.error('Error refreshing learning hub content:', error);
      }
    };

    refreshContent();
    return () => { cancelled = true; };
  }, [hasInitialContent]);

  const categories = useMemo(() => {
    const cats = new Set();
    blogItems.forEach(b => b.category && cats.add(b.category));
    resourceItems.forEach(r => r.category && cats.add(r.category));
    return Array.from(cats);
  }, [blogItems, resourceItems]);

  const filteredItems = useMemo(() => {
    let items = [];

    if (activeTab === 'all' || activeTab === 'blog') {
      items = [...items, ...blogItems.map(b => ({ ...b, itemType: 'blog' }))];
    }
    if (activeTab === 'all' || activeTab === 'resources') {
      items = [...items, ...resourceItems.map(r => ({ ...r, itemType: 'resource' }))];
    }

    items.sort((a, b) => {
      const dateA = new Date(a.published_at || a.created_at || 0);
      const dateB = new Date(b.published_at || b.created_at || 0);
      return dateB - dateA;
    });

    if (activeCategory !== 'All') {
      items = items.filter(item => item.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(item =>
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.excerpt && item.excerpt.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q))
      );
    }

    return items;
  }, [blogItems, resourceItems, activeTab, activeCategory, searchQuery]);

  const showFeatured = activeTab === 'all' && activeCategory === 'All' && !searchQuery;
  const featuredBlogs = blogItems.filter(b => b.is_featured);
  const topFeatured = featuredBlogs.length > 0 ? featuredBlogs[0] : (blogItems.length > 0 ? blogItems[0] : null);

  const gridItems = showFeatured && topFeatured
    ? filteredItems.filter(item => item.id !== topFeatured.id || item.itemType !== 'blog')
    : filteredItems;

  const formatDate = (dateString) => {
    return new Date(dateString || new Date()).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="pb-24 bg-white">

      {/* Hero Section */}
      <section className="bg-academy-blue pt-24 pb-20 md:pt-32 md:pb-28 relative overflow-hidden">
        {/* Subtle background image/pattern */}
        <div className="absolute inset-0 opacity-90 mix-blend-overlay">
          <Image src="/hero_desktop.jpg" alt="Background" fill className="object-cover" priority />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-academy-blue via-academy-blue/90 to-slate-900/80 z-0"></div>

        <div className="container-shell relative z-10 text-center flex flex-col items-center">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white/90 backdrop-blur-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-primary"></span>
            Learning Hub
          </div>

          {/* Headline */}
          <h1 className="mx-auto max-w-4xl text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight text-white mb-6">
            Learn Smarter with <span className="text-primary">Language Academy</span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto max-w-2xl text-lg md:text-xl leading-relaxed text-blue-100">
            Expert guides, practice tips, free resources, and comprehensive materials for PTE, IELTS, and English mastery.
          </p>

              {/* Search Bar */}
              <div className="mx-auto mt-10 max-w-2xl relative">
                <div className="relative flex items-center w-full bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 p-2 transition-all focus-within:bg-white/15 focus-within:border-white/20">
                  <div className="pl-4 pr-3 text-white/60">
                    <Search size={20} />
                  </div>
                  <input
                    type="text"
                    placeholder="Search articles, notes, practice sheets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 min-w-0 bg-transparent border-none text-white placeholder-white/50 focus:outline-none focus:ring-0 text-base py-3 pr-4"
                  />
                  <button className="shrink-0 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-primary/25 ml-2">
                    Search
                  </button>
                </div>
              </div>
            </div>
      </section>
      <section className="pt-8">
        <div className="container-shell">

          {/* Navigation & Filters */}
          <div className="flex flex-col items-center justify-center mb-12 gap-6">
            {/* Tab Navigation */}
            <div className="flex bg-white p-1.5 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 w-full sm:w-auto overflow-x-auto hide-scrollbar">
              {[
                { id: 'all', label: 'All Materials' },
                { id: 'blog', label: 'Articles & Guides' },
                { id: 'resources', label: 'Free Resources' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 sm:flex-none whitespace-nowrap px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-academy-blue text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Category Pills */}
            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto hide-scrollbar justify-start sm:justify-center">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(activeCategory === cat ? 'All' : cat)}
                  className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                    activeCategory === cat
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Featured Post */}
          {showFeatured && topFeatured && (
            <div className="mb-14 group">
              <Link href={`/blog/${topFeatured.slug}`} className="block relative overflow-hidden rounded-3xl bg-white border border-slate-200/80 shadow-lg hover:shadow-2xl transition-all duration-500">
                <div className="grid lg:grid-cols-[1.3fr_1fr]">
                  {/* Image Side */}
                  <div className="relative aspect-[16/11] lg:aspect-auto overflow-hidden">
                    <Image
                      src={getPublicImageUrl(topFeatured.image_url)}
                      alt={topFeatured.title}
                      fill
                      sizes="(min-width: 1024px) 55vw, 100vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      priority
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent lg:bg-gradient-to-r lg:from-slate-900/60 lg:via-transparent lg:to-transparent" />

                    {/* Featured Badge on Mobile */}
                    <div className="absolute bottom-6 left-6 lg:hidden">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg">
                        <ArrowUpRight size={12} />
                        Featured Guide
                      </span>
                    </div>
                  </div>

                  {/* Content Side */}
                  <div className="p-8 md:p-12 flex flex-col justify-center bg-white">
                    {/* Featured Badge Desktop */}
                    <div className="hidden lg:block mb-5">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                        <ArrowUpRight size={12} />
                        Featured Guide
                      </span>
                    </div>

                    {topFeatured.category && (
                      <span className="text-sm font-bold text-accent uppercase tracking-wider mb-3">
                        {topFeatured.category}
                      </span>
                    )}

                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight mb-5 hidden lg:block group-hover:text-primary transition-colors duration-300">
                      {topFeatured.title}
                    </h2>

                    <h2 className="text-2xl font-extrabold text-white leading-tight mb-5 lg:hidden line-clamp-3">
                      {topFeatured.title}
                    </h2>

                    <p className="text-base md:text-lg leading-relaxed text-slate-600 line-clamp-3 mb-8">
                      {topFeatured.excerpt || "Discover valuable insights and strategies in this comprehensive guide."}
                    </p>

                    {/* Meta */}
                    <div className="flex items-center gap-5 text-sm text-slate-500 font-medium mb-8">
                      <span className="flex items-center gap-2">
                        <Calendar size={16} className="text-slate-400" />
                        {formatDate(topFeatured.published_at)}
                      </span>
                      {topFeatured.reading_time && (
                        <span className="flex items-center gap-2">
                          <Clock size={16} className="text-slate-400" />
                          {topFeatured.reading_time} min read
                        </span>
                      )}
                    </div>

                    {/* CTA */}
                    <div className="flex items-center gap-3 text-primary font-bold group-hover:gap-4 transition-all">
                      <span>Start Reading</span>
                      <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Empty State */}
          {gridItems.length === 0 ? (
            <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 px-8 py-20 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-5">
                <Filter size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">No materials found</h3>
              <p className="text-slate-500 mb-6 max-w-md mx-auto">
                We could not find any content matching your current filters or search query.
              </p>
              <button
                onClick={() => { setSearchQuery(''); setActiveCategory('All'); setActiveTab('all'); }}
                className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-full font-semibold hover:bg-primary/90 transition-all"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <>
              {/* Section Title when tabs active */}
              {activeTab !== 'all' && (
                <div className="flex items-center gap-3 mb-8">
                  <h2 className="text-2xl font-extrabold text-slate-900">
                    {activeTab === 'blog' ? 'Articles & Guides' : 'Free Resources'}
                  </h2>
                  <span className="text-sm text-slate-500 font-medium">
                    ({gridItems.length} {gridItems.length === 1 ? 'item' : 'items'})
                  </span>
                </div>
              )}

              {/* Grid */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {gridItems.map((item) =>
                  item.itemType === 'blog' ? (
                    <BlogCard key={`blog-${item.id}`} blog={item} />
                  ) : (
                    <ResourceCard key={`resource-${item.id}`} resource={item} />
                  )
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Course CTA */}
      <section className="mt-20 md:mt-24">
        <div className="container-shell">
          <div className="relative overflow-hidden rounded-[32px] bg-slate-950 px-8 py-16 text-white text-center md:px-14">
            {/* Decorative */}
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-accent/10" />
            <div className="absolute top-0 right-0 w-72 h-72 bg-primary/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent/20 rounded-full blur-[100px]" />

            <div className="relative z-10">
              <span className="inline-block rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white/80 mb-6">
                Premium Preparation
              </span>
              <h2 className="text-3xl font-extrabold md:text-4xl lg:text-5xl mb-5">
                Ready to achieve your target score?
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-slate-300 mb-10 leading-relaxed">
                Stop guessing and start preparing with proven templates, personalized feedback, and unlimited mock tests.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/courses"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-accent text-white px-8 py-4 text-base font-semibold transition-all hover:-translate-y-0.5 hover:bg-accent/90 hover:shadow-lg hover:shadow-accent/25 w-full sm:w-auto"
                >
                  Explore Premium Courses
                  <ArrowRight size={18} />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/20 bg-white/5 text-white px-8 py-4 text-base font-semibold transition-all hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/10 w-full sm:w-auto"
                >
                  Talk to an Advisor
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
