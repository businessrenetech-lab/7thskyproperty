"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { List, ChevronRight, X } from 'lucide-react';

function extractHeadings(htmlContent) {
  if (!htmlContent) return [];

  const headingRegex = /<h([23])[^>]*(?:id="([^"]*)")?[^>]*>([^<]*)<\/h\1>/gi;
  const headings = [];
  let match;

  while ((match = headingRegex.exec(htmlContent)) !== null) {
    const level = parseInt(match[1]);
    const id = match[2] || match[3].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const text = match[3].trim();

    if (text) {
      headings.push({ level, id, text });
    }
  }

  return headings;
}

export default function TableOfContents({ content, className = '' }) {
  const [headings, setHeadings] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const extracted = extractHeadings(content);
    setHeadings(extracted);
  }, [content]);

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-80px 0px -70% 0px',
        threshold: 0
      }
    );

    headings.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [headings]);

  const scrollToHeading = useCallback((id) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: elementPosition - offset,
        behavior: 'smooth'
      });
    }
    setIsOpen(false);
  }, []);

  if (headings.length < 2) return null;

  const tocContent = (
    <nav className="space-y-1">
      {headings.map(({ id, text, level }) => (
        <button
          key={id}
          onClick={() => scrollToHeading(id)}
          className={`
            block w-full text-left text-sm py-2 px-3 rounded-lg transition-all duration-200
            ${level === 3 ? 'pl-6' : ''}
            ${activeId === id
              ? 'bg-primary/10 text-primary font-semibold'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }
          `}
        >
          <span className="flex items-center gap-2">
            {activeId === id && (
              <ChevronRight size={14} className="text-primary" />
            )}
            <span className="line-clamp-2">{text}</span>
          </span>
        </button>
      ))}
    </nav>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={`hidden lg:block w-72 flex-shrink-0 ${className}`}>
        <div className="sticky top-24">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
              <List size={14} />
              On This Page
            </h4>
            {tocContent}
          </div>
        </div>
      </div>

      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-accent text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all"
      >
        <List size={18} />
        <span className="text-sm font-semibold">Contents</span>
      </button>

      {/* Mobile Drawer */}
      {isOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-slate-900/50 z-50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div className="lg:hidden fixed right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white z-50 shadow-2xl rounded-l-2xl overflow-hidden animate-slide-in-right">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <List size={16} />
                On This Page
              </h4>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto h-full">
              {tocContent}
            </div>
          </div>
        </>
      )}
    </>
  );
}