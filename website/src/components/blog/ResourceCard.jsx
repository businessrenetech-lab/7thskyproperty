"use client";

import React from 'react';
import { FileText, PlayCircle, FileSpreadsheet, Download, Image as ImageIcon, Video, LayoutTemplate } from 'lucide-react';
import { getPublicImageUrl } from '@/lib/imageUrl';

const typeConfig = {
  pdf: { icon: FileText, color: 'text-red-500', bg: 'bg-red-50' },
  video: { icon: PlayCircle, color: 'text-blue-500', bg: 'bg-blue-50' },
  doc: { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
  sheet: { icon: FileSpreadsheet, color: 'text-green-600', bg: 'bg-green-50' },
  image: { icon: ImageIcon, color: 'text-purple-500', bg: 'bg-purple-50' },
  template: { icon: LayoutTemplate, color: 'text-amber-500', bg: 'bg-amber-50' },
};

export default function ResourceCard({ resource }) {
  const {
    title,
    description,
    type,
    category,
    level,
    file_url,
    external_url,
    is_free
  } = resource;

  const downloadUrl = external_url || getPublicImageUrl(file_url, '');
  const typeKey = type?.toLowerCase() || 'pdf';
  const config = typeConfig[typeKey] || typeConfig.pdf;
  const IconComponent = config.icon;

  return (
    <article className="group relative flex flex-col h-full bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-slate-200/80 overflow-hidden hover:shadow-lg hover:border-accent/20 transition-all duration-300">
      <div className="p-6 md:p-7 flex flex-col flex-1 relative">
        {/* Decorative Icon Background */}
        <div className="absolute top-4 right-4 opacity-[0.06] group-hover:opacity-10 transition-opacity duration-500 transform group-hover:scale-110 group-hover:rotate-6">
          <IconComponent size={64} />
        </div>

        {/* Header: Icon + Type/Label */}
        <div className="flex items-center gap-3 mb-5">
          <div className={`w-11 h-11 rounded-xl ${config.bg} flex items-center justify-center shadow-sm`}>
            <IconComponent size={20} className={config.color} />
          </div>
          <div>
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              {type || 'Resource'}
            </span>
            {category && (
              <span className="block text-sm font-semibold text-accent">{category}</span>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-slate-900 mb-3 line-clamp-2 leading-snug group-hover:text-accent transition-colors duration-300">
          {title}
        </h3>

        {/* Description */}
        <p className="flex-1 text-slate-600 text-sm leading-relaxed line-clamp-3 mb-5">
          {description || "Download this free resource to enhance your learning."}
        </p>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-5">
          {level && level !== 'All' && (
            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-semibold">
              {level}
            </span>
          )}
          {is_free && (
            <span className="px-2.5 py-1 bg-green-50 text-green-600 rounded-md text-xs font-bold">
              Free Download
            </span>
          )}
        </div>

        {/* Download Button */}
        <div className="pt-5 border-t border-slate-200 mt-auto">
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-semibold text-sm hover:border-accent hover:text-accent hover:bg-accent/5 transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <Download size={18} />
            Download Resource
          </a>
        </div>
      </div>
    </article>
  );
}
