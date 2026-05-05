import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit, Trash2, Globe, FileText, Check, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const WebsiteManagement = () => {
  const toast = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('blogs');
  const [blogs, setBlogs] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showBlogForm, setShowBlogForm] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  const [formData, setFormData] = useState({ title: '', slug: '', excerpt: '', content: '', image_url: '', is_published: true });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'blogs') {
        const res = await api.get('/website/blogs');
        setBlogs(res.data);
      } else {
        const res = await api.get('/website/courses');
        setCourses(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBlogSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBlog) {
        await api.put(`/website/blogs/${editingBlog.id}`, formData);
      } else {
        await api.post('/website/blogs', formData);
      }
      setShowBlogForm(false);
      setEditingBlog(null);
      setFormData({ title: '', slug: '', excerpt: '', content: '', image_url: '', is_published: true });
      fetchData();
    } catch (err) {
      toast.error(`Error saving blog: ${err.response?.data?.error || err.message}`);
    }
  };

  const deleteBlog = async (id) => {
    if (window.confirm('Are you sure you want to delete this blog post?')) {
      await api.delete(`/website/blogs/${id}`);
      fetchData();
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

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>Website Management</h1>
          <p style={{ color: 'var(--text-dim)' }}>Manage public website content like blogs and courses.</p>
        </div>
        {activeTab === 'blogs' && !showBlogForm && (
          <button 
            className="btn btn-primary"
            onClick={() => setShowBlogForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={18} /> New Blog Post
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
        <button 
          onClick={() => setActiveTab('blogs')}
          style={{ 
            padding: '0.5rem 1rem', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'blogs' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'blogs' ? 'var(--primary)' : 'var(--text-dim)',
            fontWeight: activeTab === 'blogs' ? 'bold' : 'normal',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}
        >
          <FileText size={18} /> Blog Posts
        </button>
        <button 
          onClick={() => setActiveTab('courses')}
          style={{ 
            padding: '0.5rem 1rem', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'courses' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'courses' ? 'var(--primary)' : 'var(--text-dim)',
            fontWeight: activeTab === 'courses' ? 'bold' : 'normal',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}
        >
          <Globe size={18} /> Published Courses
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : activeTab === 'blogs' ? (
        showBlogForm ? (
          <div className="card">
            <h3>{editingBlog ? 'Edit Blog Post' : 'Create New Blog Post'}</h3>
            <form onSubmit={handleBlogSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <input type="text" className="input-field" placeholder="Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
              <input type="text" className="input-field" placeholder="Slug (e.g. my-post-url)" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} required />
              <textarea className="input-field" placeholder="Excerpt" value={formData.excerpt} onChange={e => setFormData({...formData, excerpt: e.target.value})} />
              <textarea className="input-field" placeholder="Full Content (Markdown/HTML)" rows="6" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} required />
              <input type="text" className="input-field" placeholder="Image URL" value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} />
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={formData.is_published} onChange={e => setFormData({...formData, is_published: e.target.checked})} />
                Publish immediately
              </label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowBlogForm(false); setEditingBlog(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Post</button>
              </div>
            </form>
          </div>
        ) : (
          <div className="card">
            {blogs.length === 0 ? <p>No blog posts found.</p> : (
              <table className="data-table" style={{ width: '100%', textAlign: 'left' }}>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Slug</th>
                    <th>Status</th>
                    <th>Author</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {blogs.map(blog => (
                    <tr key={blog.id}>
                      <td>{blog.title}</td>
                      <td>{blog.slug}</td>
                      <td>
                        <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', background: blog.is_published ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)', color: blog.is_published ? '#22c55e' : '#eab308' }}>
                          {blog.is_published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td>{blog.author?.name}</td>
                      <td style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="icon-btn" onClick={() => { setEditingBlog(blog); setFormData(blog); setShowBlogForm(true); }}><Edit size={16} /></button>
                        <button className="icon-btn" style={{ color: '#ef4444' }} onClick={() => deleteBlog(blog.id)}><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )
      ) : (
        <div className="card">
          <p style={{ marginBottom: '1rem', color: 'var(--text-dim)' }}>Toggle which courses appear on the public website.</p>
          <table className="data-table" style={{ width: '100%', textAlign: 'left' }}>
            <thead>
              <tr>
                <th>Course Title</th>
                <th>Category</th>
                <th>Fee</th>
                <th>Public Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {courses.map(course => (
                <tr key={course.id}>
                  <td>{course.title}</td>
                  <td>{course.category}</td>
                  <td>{course.base_fee} BDT</td>
                  <td>
                    {course.is_published ? (
                        <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Check size={16} /> Visible</span>
                    ) : (
                        <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><X size={16} /> Hidden</span>
                    )}
                  </td>
                  <td>
                    <button 
                      className={course.is_published ? 'btn btn-secondary' : 'btn btn-primary'} 
                      onClick={() => toggleCoursePublish(course)}
                    >
                      {course.is_published ? 'Hide on Website' : 'Publish to Website'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default WebsiteManagement;
