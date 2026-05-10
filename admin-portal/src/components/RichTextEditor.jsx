import React, { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import { Bold, Italic, List, ListOrdered, Link as LinkIcon, Image as ImageIcon, Youtube as YoutubeIcon, Quote, Heading1, Heading2, Heading3 } from 'lucide-react';

const MenuBar = ({ editor }) => {
  if (!editor) return null;

  const addImage = useCallback(() => {
    const url = window.prompt('URL of the image');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const addYoutubeVideo = useCallback(() => {
    const url = window.prompt('Enter YouTube URL');
    if (url) {
      editor.commands.setYoutubeVideo({
        src: url,
        width: Math.max(320, parseInt(window.prompt('Width?', '640') || '640', 10)),
        height: Math.max(180, parseInt(window.prompt('Height?', '480') || '480', 10)),
      });
    }
  }, [editor]);

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  return (
    <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.02)', flexWrap: 'wrap' }}>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`icon-btn ${editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}`} style={{ background: editor.isActive('heading', { level: 1 }) ? 'var(--primary)' : 'transparent', color: editor.isActive('heading', { level: 1 }) ? '#fff' : 'inherit' }}><Heading1 size={18} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`icon-btn ${editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}`} style={{ background: editor.isActive('heading', { level: 2 }) ? 'var(--primary)' : 'transparent', color: editor.isActive('heading', { level: 2 }) ? '#fff' : 'inherit' }}><Heading2 size={18} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`icon-btn ${editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}`} style={{ background: editor.isActive('heading', { level: 3 }) ? 'var(--primary)' : 'transparent', color: editor.isActive('heading', { level: 3 }) ? '#fff' : 'inherit' }}><Heading3 size={18} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`icon-btn ${editor.isActive('bold') ? 'is-active' : ''}`} style={{ background: editor.isActive('bold') ? 'var(--primary)' : 'transparent', color: editor.isActive('bold') ? '#fff' : 'inherit' }}><Bold size={18} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`icon-btn ${editor.isActive('italic') ? 'is-active' : ''}`} style={{ background: editor.isActive('italic') ? 'var(--primary)' : 'transparent', color: editor.isActive('italic') ? '#fff' : 'inherit' }}><Italic size={18} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`icon-btn ${editor.isActive('bulletList') ? 'is-active' : ''}`} style={{ background: editor.isActive('bulletList') ? 'var(--primary)' : 'transparent', color: editor.isActive('bulletList') ? '#fff' : 'inherit' }}><List size={18} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`icon-btn ${editor.isActive('orderedList') ? 'is-active' : ''}`} style={{ background: editor.isActive('orderedList') ? 'var(--primary)' : 'transparent', color: editor.isActive('orderedList') ? '#fff' : 'inherit' }}><ListOrdered size={18} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`icon-btn ${editor.isActive('blockquote') ? 'is-active' : ''}`} style={{ background: editor.isActive('blockquote') ? 'var(--primary)' : 'transparent', color: editor.isActive('blockquote') ? '#fff' : 'inherit' }}><Quote size={18} /></button>
      <button type="button" onClick={setLink} className={`icon-btn ${editor.isActive('link') ? 'is-active' : ''}`} style={{ background: editor.isActive('link') ? 'var(--primary)' : 'transparent', color: editor.isActive('link') ? '#fff' : 'inherit' }}><LinkIcon size={18} /></button>
      <button type="button" onClick={addImage} className="icon-btn"><ImageIcon size={18} /></button>
      <button type="button" onClick={addYoutubeVideo} className="icon-btn"><YoutubeIcon size={18} /></button>
    </div>
  );
};

const RichTextEditor = ({ content, onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Image,
      Youtube.configure({
        inline: false,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
      <MenuBar editor={editor} />
      <div style={{ padding: '1rem', minHeight: '300px', cursor: 'text' }}>
        <EditorContent editor={editor} className="tiptap-editor" />
      </div>
      <style>{`
        .tiptap-editor .ProseMirror:focus {
          outline: none;
        }
        .tiptap-editor img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
        }
        .tiptap-editor iframe {
          max-width: 100%;
          border-radius: 8px;
        }
        .tiptap-editor blockquote {
          border-left: 3px solid var(--primary);
          padding-left: 1rem;
          margin-left: 0;
          color: var(--text-dim);
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
