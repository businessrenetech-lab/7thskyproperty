import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit, Trash2, Globe, FileText, Check, X, Upload, Loader2, BookOpen, Search, Filter } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import RichTextEditor from '../components/RichTextEditor';

const WebsiteManagement = () => {
  const toast = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('blogs');
  const [blogs, setBlogs] = useState([]);
  const [courses, setCourses] = useState([]);
  const [resources, setResources] = useState([]);
  const [courseDrafts, setCourseDrafts] = useState({});
  const [savingCourseId, setSavingCourseId] = useState(null);
  const [uploadingCourseId, setUploadingCourseId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showBlogForm, setShowBlogForm] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  const [formData, setFormData] = useState({ title: '', slug: '', excerpt: '', content: '', image_url: '', category: '', tags: '', course_relation: '', seo_title: '', seo_description: '', is_featured: false, is_published: true });

  const [showResourceForm, setShowResourceForm] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [resourceFormData, setResourceFormData] = useState({ title: '', slug: '', description: '', type: 'PDF', category: '', level: 'All', file_url: '', external_url: '', thumbnail_url: '', is_free: true, status: 'published' });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'blogs') {
        const res = await api.get('/website/blogs');
        setBlogs(res.data);
      } else if (activeTab === 'resources') {
        const res = await api.get('/website/resources');
        setResources(res.data);
      } else {
        const res = await api.get('/website/courses');
        const nextCourses = Array.isArray(res.data) ? res.data : [];
        setCourses(nextCourses);
        setCourseDrafts(nextCourses.reduce((acc, course) => {
          acc[course.id] = {
            image_url: course.image_url || '',
            short_description: course.short_description || '',
          };
          return acc;
        }, {}));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const buildBlogPayload = () => {
    const allowedFields = ['title', 'slug', 'excerpt', 'content', 'image_url', 'category', 'tags', 'course_relation', 'reading_time', 'seo_title', 'seo_description', 'is_featured', 'is_published'];
    const payload = {};
    allowedFields.forEach((field) => {
      payload[field] = formData[field];
    });
    if (typeof payload.tags === 'string') {
      payload.tags = payload.tags.split(',').map(t => t.trim()).filter(Boolean);
    }
    if (!Number.isInteger(payload.reading_time)) {
      payload.reading_time = null;
    }
    return payload;
  };

  const resetBlogForm = () => {
    setEditingBlog(null);
    setFormData({ title: '', slug: '', excerpt: '', content: '', image_url: '', category: '', tags: '', course_relation: '', seo_title: '', seo_description: '', is_featured: false, is_published: true });
  };

  const handleBlogSubmit = async (e) => {
    e.preventDefault();
    try {
      const submissionData = buildBlogPayload();

      if (editingBlog) {
        await api.put(`/website/blogs/${editingBlog.id}`, submissionData);
      } else {
        await api.post('/website/blogs', submissionData);
      }
      setShowBlogForm(false);
      resetBlogForm();
      fetchData();
    } catch (err) {
      toast.error(`Error saving blog: ${err.response?.data?.error || err.message}`);
    }
  };

  const deleteBlog = async (id) => {
    if (window.confirm('Are you sure you want to delete this blog post?')) {
      try {
        await api.delete(`/website/blogs/${id}`);
        toast.success('Article deleted');
        fetchData();
      } catch (err) {
        toast.error(`Error deleting blog: ${err.response?.data?.error || err.message}`);
      }
    }
  };

  const handleResourceSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingResource) {
        await api.put(`/website/resources/${editingResource.id}`, resourceFormData);
      } else {
        await api.post('/website/resources', resourceFormData);
      }
      setShowResourceForm(false);
      setEditingResource(null);
      setResourceFormData({ title: '', slug: '', description: '', type: 'PDF', category: '', level: 'All', file_url: '', external_url: '', thumbnail_url: '', is_free: true, status: 'published' });
      fetchData();
    } catch (err) {
      toast.error(`Error saving resource: ${err.response?.data?.error || err.message}`);
    }
  };

  const deleteResource = async (id) => {
    if (window.confirm('Are you sure you want to delete this resource?')) {
      await api.delete(`/website/resources/${id}`);
      fetchData();
    }
  };

  const handleFileUpload = async (file, fieldName) => {
    if (!file) return;
    const uploadData = new FormData();
    uploadData.append('file', file);
    try {
      const res = await api.post('/website/resources/upload', uploadData);
      setResourceFormData(prev => ({ ...prev, [fieldName]: res.data.url }));
      toast.success('File uploaded successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload file');
    }
  };

  const toggleCoursePublish = async (course) => {
    try {
      await api.put(`/website/courses/${course.id}`, { is_published: !course.is_published });
      fetchData();
    } catch (err) {
      toast.error('Error updating course');
    }
  };

  const updateCourseDraft = (courseId, field, value) => {
    setCourseDrafts((prev) => ({
      ...prev,
      [courseId]: {
        ...(prev[courseId] || {}),
        [field]: value,
      },
    }));
  };

  const saveCourseWebsiteFields = async (course) => {
    const draft = courseDrafts[course.id] || {};
    setSavingCourseId(course.id);
    try {
      await api.put(`/website/courses/${course.id}`, {
        image_url: draft.image_url || '',
        short_description: draft.short_description || '',
      });
      toast.success('Course website details updated');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error updating course');
    } finally {
      setSavingCourseId(null);
    }
  };

  const uploadCourseImage = async (course, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    setUploadingCourseId(course.id);
    try {
      const response = await api.post('/website/courses/upload-image', formData);
      updateCourseDraft(course.id, 'image_url', response.data.url || '');
      toast.success('Image uploaded. Click Save Details to publish it.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload image');
    } finally {
      setUploadingCourseId(null);
    }
  };

  const renderFormGroup = (label, children, sublabel = '') => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        {label}
        {sublabel && <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-dim)' }}>{sublabel}</span>}
      </label>
      {children}
    </div>
  );

  return (
    <div className="fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
            Website Content Engine
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.95rem' }}>Manage public-facing articles, downloadable resources, and course visibility.</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', gap: '2rem', marginBottom: '2rem', 
        borderBottom: '1px solid var(--border)', paddingBottom: '0' 
      }}>
        {[
          { id: 'blogs', label: 'Learning Hub Articles', icon: FileText },
          { id: 'resources', label: 'Downloadable Resources', icon: BookOpen },
          { id: 'courses', label: 'Public Courses', icon: Globe }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setShowBlogForm(false); setShowResourceForm(false); }}
            style={{ 
              padding: '1rem 0.5rem', 
              background: 'none', 
              border: 'none', 
              borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-dim)',
              fontWeight: activeTab === tab.id ? '600' : '500',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              transition: 'all 0.2s ease',
              marginBottom: '-1px'
            }}
          >
            <tab.icon size={18} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      {loading ? (
        <div style={{ display: 'grid', placeItems: 'center', padding: '5rem 0', color: 'var(--text-dim)' }}>
          <Loader2 size={32} className="animate-spin" style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
          <p>Loading content...</p>
        </div>
      ) : activeTab === 'blogs' ? (
        showBlogForm ? (
          <div className="card" style={{ padding: '2rem', borderTop: '4px solid var(--primary)' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              {editingBlog ? 'Edit Article' : 'Draft New Article'}
            </h3>
            <form onSubmit={handleBlogSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Core Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {renderFormGroup('Article Title', 
                  <input type="text" className="input-field" placeholder="E.g. 10 Tips for IELTS Speaking" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
                )}
                {renderFormGroup('URL Slug', 
                  <input type="text" className="input-field" placeholder="e.g. ielts-speaking-tips-2026" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} required />,
                  '(Must be unique)'
                )}
                {renderFormGroup('Category', 
                  <select className="input-field" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    <option value="">Select Category</option>
                    <option value="PTE">PTE</option>
                    <option value="IELTS">IELTS</option>
                    <option value="Study Abroad">Study Abroad</option>
                    <option value="General English">General English</option>
                    <option value="News">News</option>
                  </select>
                )}
                {renderFormGroup('Tags', 
                  <input type="text" className="input-field" placeholder="e.g. speaking, band 8, tips" value={Array.isArray(formData.tags) ? formData.tags.join(', ') : formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} />,
                  '(Comma separated)'
                )}
                {renderFormGroup('Reading Time', 
                  <div style={{ position: 'relative' }}>
                    <input type="number" className="input-field" placeholder="5" value={formData.reading_time || ''} onChange={e => setFormData({...formData, reading_time: parseInt(e.target.value, 10)})} />
                    <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', fontSize: '0.85rem' }}>mins</span>
                  </div>
                )}
                {renderFormGroup('Related Course Slug', 
                  <input type="text" className="input-field" placeholder="e.g. pte-premium" value={formData.course_relation || ''} onChange={e => setFormData({...formData, course_relation: e.target.value})} />,
                  '(Links article to a course)'
                )}
              </div>

              {/* SEO Details */}
              <div style={{ background: 'rgba(0,0,0,0.015)', border: '1px dashed var(--border)', padding: '1.5rem', borderRadius: '12px' }}>
                <h4 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-main)' }}>Search Engine Optimization</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                  {renderFormGroup('SEO Meta Title', 
                    <input type="text" className="input-field" placeholder="Optimized title for search engines" value={formData.seo_title || ''} onChange={e => setFormData({...formData, seo_title: e.target.value})} />
                  )}
                  {renderFormGroup('SEO Meta Description', 
                    <input type="text" className="input-field" placeholder="Brief summary for search results" value={formData.seo_description || ''} onChange={e => setFormData({...formData, seo_description: e.target.value})} />
                  )}
                </div>
              </div>

              {/* Excerpt */}
              {renderFormGroup('Short Excerpt', 
                <textarea className="input-field" rows="3" placeholder="A compelling 2-3 sentence summary shown on blog cards..." value={formData.excerpt} onChange={e => setFormData({...formData, excerpt: e.target.value})} />
              )}

              {/* Content Editor */}
              {renderFormGroup('Full Article Content', 
                <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                  <RichTextEditor content={formData.content} onChange={html => setFormData({...formData, content: html})} />
                </div>
              )}

              {/* Featured Image */}
              {renderFormGroup('Featured Image Cover', 
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input type="text" className="input-field" placeholder="/uploads/blogs/..." value={formData.image_url || ''} onChange={e => setFormData({...formData, image_url: e.target.value})} style={{ flex: 1 }} />
                      <label className="btn btn-secondary" style={{ cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.4rem', height: '100%' }}>
                        <Upload size={16} /> Upload New
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          const fd = new FormData();
                          fd.append('image', file);
                          try {
                            const res = await api.post('/website/blogs/upload-image', fd);
                            setFormData(prev => ({...prev, image_url: res.data.url}));
                            toast.success('Image uploaded!');
                          } catch (err) {
                            toast.error(err.response?.data?.error || 'Failed to upload image');
                          }
                        }} />
                      </label>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>Recommended size: 1200x600px. JPG, PNG, or WebP.</p>
                  </div>
                  {formData.image_url && (
                    <div style={{ width: '160px', height: '90px', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden', background: '#f8f9fa' }}>
                      <img src={`${api.defaults.baseURL?.replace('/api', '') || ''}${formData.image_url}`} alt="Cover Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                    </div>
                  )}
                </div>
              )}

              {/* Settings & Submission */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: '2rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '500' }}>
                    <input type="checkbox" style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} checked={formData.is_published} onChange={e => setFormData({...formData, is_published: e.target.checked})} />
                    Publish Live Immediately
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '500' }}>
                    <input type="checkbox" style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} checked={formData.is_featured} onChange={e => setFormData({...formData, is_featured: e.target.checked})} />
                    Feature on Homepage
                  </label>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowBlogForm(false); setEditingBlog(null); }}>Discard Draft</button>
                  <button type="submit" className="btn btn-primary" style={{ paddingLeft: '2rem', paddingRight: '2rem' }}>
                    {editingBlog ? 'Update Article' : 'Publish Article'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div style={{ position: 'relative', width: '300px' }}>
                <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input type="text" className="input-field" placeholder="Search articles..." style={{ paddingLeft: '2.5rem', background: 'white' }} />
              </div>
              <button className="btn btn-primary" onClick={() => setShowBlogForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={16} /> Write New Article
              </button>
            </div>
            {blogs.length === 0 ? (
              <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                <p>No articles published yet. Start creating content for your audience.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Article Title</th>
                      <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</th>
                      <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                      <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Published Date</th>
                      <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blogs.map(blog => (
                      <tr key={blog.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <div style={{ fontWeight: '600', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                            {blog.title}
                            {blog.is_featured && <span style={{ marginLeft: '0.75rem', fontSize: '0.65rem', padding: '0.15rem 0.4rem', background: 'var(--primary)', color: '#fff', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>Featured</span>}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>/{blog.slug}</div>
                        </td>
                        <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem' }}>
                          <span style={{ padding: '0.25rem 0.75rem', background: '#f1f5f9', borderRadius: '99px', color: '#475569', fontWeight: '500' }}>
                            {blog.category || 'Uncategorized'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <span style={{ padding: '0.3rem 0.8rem', borderRadius: '99px', fontSize: '0.8rem', fontWeight: '600', background: blog.is_published ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)', color: blog.is_published ? '#16a34a' : '#ca8a04', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                            {blog.is_published ? <><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }}/> Live</> : <><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ca8a04' }}/> Draft</>}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                          {new Date(blog.published_at || blog.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            <button className="icon-btn hover-primary" title="Edit Article" onClick={() => { setEditingBlog(blog); setFormData({ title: blog.title || '', slug: blog.slug || '', excerpt: blog.excerpt || '', content: blog.content || '', image_url: blog.image_url || '', category: blog.category || '', tags: Array.isArray(blog.tags) ? blog.tags.join(', ') : (blog.tags || ''), course_relation: blog.course_relation || '', reading_time: blog.reading_time || '', seo_title: blog.seo_title || '', seo_description: blog.seo_description || '', is_featured: !!blog.is_featured, is_published: !!blog.is_published }); setShowBlogForm(true); }}><Edit size={18} /></button>
                            <button className="icon-btn hover-danger" title="Delete Article" style={{ color: '#ef4444' }} onClick={() => deleteBlog(blog.id)}><Trash2 size={18} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      ) : activeTab === 'resources' ? (
        showResourceForm ? (
          <div className="card" style={{ padding: '2rem', borderTop: '4px solid var(--primary)' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              {editingResource ? 'Edit Resource' : 'Add Downloadable Resource'}
            </h3>
            <form onSubmit={handleResourceSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {renderFormGroup('Resource Title', 
                  <input type="text" className="input-field" placeholder="E.g. Ultimate IELTS Vocabulary PDF" value={resourceFormData.title} onChange={e => setResourceFormData({...resourceFormData, title: e.target.value})} required />
                )}
                {renderFormGroup('URL Slug', 
                  <input type="text" className="input-field" placeholder="e.g. ielts-vocab-pdf" value={resourceFormData.slug} onChange={e => setResourceFormData({...resourceFormData, slug: e.target.value})} required />
                )}
                {renderFormGroup('File Type', 
                  <select className="input-field" value={resourceFormData.type} onChange={e => setResourceFormData({...resourceFormData, type: e.target.value})}>
                    <option value="PDF">PDF Document</option>
                    <option value="Doc">Word Document</option>
                    <option value="Sheet">Spreadsheet / Excel</option>
                    <option value="Image">Infographic / Image</option>
                    <option value="Video">Video File</option>
                    <option value="Template">Notion / Template Link</option>
                  </select>
                )}
                {renderFormGroup('Category', 
                  <input type="text" className="input-field" placeholder="e.g. PTE, IELTS, Grammar" value={resourceFormData.category} onChange={e => setResourceFormData({...resourceFormData, category: e.target.value})} />
                )}
                {renderFormGroup('Difficulty Level', 
                  <select className="input-field" value={resourceFormData.level} onChange={e => setResourceFormData({...resourceFormData, level: e.target.value})}>
                    <option value="All">All Levels (Universal)</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                )}
                {renderFormGroup('Status', 
                  <select className="input-field" value={resourceFormData.status} onChange={e => setResourceFormData({...resourceFormData, status: e.target.value})}>
                    <option value="published">Published & Visible</option>
                    <option value="draft">Draft / Hidden</option>
                    <option value="archived">Archived</option>
                  </select>
                )}
              </div>
              
              {renderFormGroup('Resource Description', 
                <textarea className="input-field" placeholder="Explain what the student will learn or get from this resource..." value={resourceFormData.description} onChange={e => setResourceFormData({...resourceFormData, description: e.target.value})} rows="4" />
              )}
              
              {/* File Upload Area */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', padding: '2rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)' }}>Upload File Attachment</label>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>Upload the actual PDF, doc, or file here.</p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="text" className="input-field" placeholder="/uploads/..." value={resourceFormData.file_url || ''} onChange={e => setResourceFormData({...resourceFormData, file_url: e.target.value})} />
                    <label className="btn btn-secondary" style={{ cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Upload size={16} /> Upload File
                      <input type="file" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e.target.files[0], 'file_url')} />
                    </label>
                  </div>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)' }}>Upload Cover Thumbnail</label>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>Visual preview image shown on the resource card.</p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="text" className="input-field" placeholder="/uploads/..." value={resourceFormData.thumbnail_url || ''} onChange={e => setResourceFormData({...resourceFormData, thumbnail_url: e.target.value})} />
                    <label className="btn btn-secondary" style={{ cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Upload size={16} /> Upload Image
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e.target.files[0], 'thumbnail_url')} />
                    </label>
                  </div>
                  {resourceFormData.thumbnail_url && (
                    <div style={{ marginTop: '1rem', width: '120px', height: '160px', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                      <img src={`${api.defaults.baseURL?.replace('/api', '') || ''}${resourceFormData.thumbnail_url}`} alt="Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                    </div>
                  )}
                </div>
              </div>

              {renderFormGroup('External Link (Alternative to file upload)', 
                <input type="text" className="input-field" placeholder="https://..." value={resourceFormData.external_url || ''} onChange={e => setResourceFormData({...resourceFormData, external_url: e.target.value})} />,
                '(Provide a link to Google Drive, Notion, etc. instead of uploading a file)'
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontWeight: '500', background: resourceFormData.is_free ? 'rgba(34, 197, 94, 0.1)' : '#f1f5f9', padding: '0.75rem 1.25rem', borderRadius: '8px', color: resourceFormData.is_free ? '#15803d' : 'var(--text-main)' }}>
                  <input type="checkbox" style={{ width: '18px', height: '18px', accentColor: '#16a34a' }} checked={resourceFormData.is_free} onChange={e => setResourceFormData({...resourceFormData, is_free: e.target.checked})} />
                  Free Resource (Available to everyone without login)
                </label>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowResourceForm(false); setEditingResource(null); }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ paddingLeft: '2rem', paddingRight: '2rem' }}>
                    {editingResource ? 'Update Resource' : 'Save Resource'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div style={{ position: 'relative', width: '300px' }}>
                <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input type="text" className="input-field" placeholder="Search resources..." style={{ paddingLeft: '2.5rem', background: 'white' }} />
              </div>
              <button className="btn btn-primary" onClick={() => setShowResourceForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={16} /> Add New Resource
              </button>
            </div>
            {resources.length === 0 ? (
              <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                <BookOpen size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                <p>No resources found. Add downloadable PDFs or templates.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resource Title</th>
                      <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type / Category</th>
                      <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Access</th>
                      <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                      <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resources.map(resource => (
                      <tr key={resource.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <div style={{ fontWeight: '600', color: 'var(--text-main)', marginBottom: '0.25rem' }}>{resource.title}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{resource.slug}</div>
                        </td>
                        <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: '600', color: 'var(--primary)' }}>{resource.type}</span>
                            <span style={{ color: 'var(--border)' }}>|</span>
                            <span style={{ color: 'var(--text-dim)' }}>{resource.category || 'General'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <span style={{ padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600', background: resource.is_free ? 'rgba(34, 197, 94, 0.1)' : '#f1f5f9', color: resource.is_free ? '#16a34a' : '#475569' }}>
                            {resource.is_free ? 'Free' : 'Premium'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <span style={{ padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600', background: resource.status === 'published' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)', color: resource.status === 'published' ? '#16a34a' : '#ca8a04', textTransform: 'capitalize' }}>
                            {resource.status}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            <button className="icon-btn hover-primary" onClick={() => { setEditingResource(resource); setResourceFormData(resource); setShowResourceForm(true); }}><Edit size={18} /></button>
                            <button className="icon-btn hover-danger" style={{ color: '#ef4444' }} onClick={() => deleteResource(resource.id)}><Trash2 size={18} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      ) : (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem 1.5rem 1rem', borderBottom: '1px solid var(--border)', background: '#f8fafc' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Public Course Listings</h3>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Toggle visibility, update promotional images, and edit website summaries for your active courses.</p>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Course Title & Meta</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Website Display Assets</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Visibility</th>
                </tr>
              </thead>
              <tbody>
                {courses.map(course => {
                  const draft = courseDrafts[course.id] || { image_url: '', short_description: '' };
                  return (
                    <tr key={course.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      
                      <td style={{ padding: '1.5rem', verticalAlign: 'top', width: '30%' }}>
                        <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '1.05rem', marginBottom: '0.5rem' }}>{course.title}</div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.8rem', padding: '0.15rem 0.5rem', background: '#f1f5f9', borderRadius: '4px', color: '#475569', fontWeight: '500' }}>{course.category}</span>
                          <span style={{ fontSize: '0.8rem', padding: '0.15rem 0.5rem', background: '#f1f5f9', borderRadius: '4px', color: '#475569', fontWeight: '500' }}>{course.base_fee} BDT</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '1rem' }}>Editing these details will immediately update how this course appears on the public learning hub.</p>
                      </td>

                      <td style={{ padding: '1.5rem', verticalAlign: 'top', minWidth: '400px' }}>
                        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                          {/* Image Preview */}
                          <div style={{ width: '120px', height: '80px', borderRadius: '8px', overflow: 'hidden', background: '#f1f5f9', border: '1px solid var(--border)', flexShrink: 0, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                            {draft.image_url ? (
                              <img src={`${api.defaults.baseURL?.replace('/api', '') || ''}${draft.image_url}`} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { e.target.style.display = 'none'; }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.7rem' }}>
                                <Globe size={20} style={{ marginBottom: '0.25rem', opacity: 0.5 }} />
                                No Cover
                              </div>
                            )}
                          </div>
                          
                          {/* Editing Fields */}
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <input
                                className="input-field"
                                style={{ flex: 1, fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                                placeholder="/uploads/courses/image.jpg"
                                value={draft.image_url}
                                onChange={(e) => updateCourseDraft(course.id, 'image_url', e.target.value)}
                              />
                              <label className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', position: 'relative', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: uploadingCourseId === course.id ? 'not-allowed' : 'pointer' }}>
                                {uploadingCourseId === course.id ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                Upload
                                <input
                                  type="file"
                                  accept="image/*"
                                  disabled={uploadingCourseId === course.id}
                                  onChange={(e) => uploadCourseImage(course, e.target.files?.[0])}
                                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                                />
                              </label>
                            </div>
                            
                            <textarea
                              className="input-field"
                              rows="2"
                              style={{ fontSize: '0.85rem', resize: 'vertical' }}
                              placeholder="Short website description to attract students..."
                              value={draft.short_description}
                              onChange={(e) => updateCourseDraft(course.id, 'short_description', e.target.value)}
                            />
                            
                            <div>
                              <button className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }} onClick={() => saveCourseWebsiteFields(course)} disabled={savingCourseId === course.id}>
                                {savingCourseId === course.id ? 'Saving...' : 'Save Website Details'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '1.5rem', verticalAlign: 'top', width: '20%' }}>
                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: course.is_published ? '#22c55e' : '#ef4444', boxShadow: `0 0 8px ${course.is_published ? '#22c55e' : '#ef4444'}` }} />
                            <span style={{ fontWeight: '600', color: course.is_published ? '#16a34a' : '#dc2626' }}>
                              {course.is_published ? 'Publicly Visible' : 'Hidden from Public'}
                            </span>
                          </div>
                          <button 
                            className={course.is_published ? 'btn btn-secondary' : 'btn btn-primary'} 
                            style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem' }}
                            onClick={() => toggleCoursePublish(course)}
                          >
                            {course.is_published ? 'Hide Course' : 'Publish to Website'}
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebsiteManagement;
