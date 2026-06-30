import React, { useState, useEffect } from 'react';
import { BookMarked, Plus, History, Calendar, Trash2, Camera, Send, AlertCircle, ExternalLink  } from 'lucide-react';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';
import { useSettings } from '../../context/SettingsContext';

const TeacherHomework = () => {
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'history'
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  const { settings } = useSettings();

  // Form State
  const [formData, setFormData] = useState({
    assignmentId: '', // To derive classId and subjectId
    title: '',
    description: '',
    imageUrl: '',
    dueDate: ''
  });

  const fetchHistory = async () => {
    setLoadingPosts(true);
    try {
        const res = await API.get('/homework/teacher/my-posts');
        setPosts(res.data);
    } catch (err) {
        setToast({ message: "Could not load history", type: "error" });
    } finally {
        setLoadingPosts(false);
    }
};

  useEffect(() => {
    if (activeTab === 'history') {
        fetchHistory();
    }
}, [activeTab]);

  // 1. Fetch Teacher Assignments on Load
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await API.get('/teacher/my-assignments');
        setAssignments(res.data.assignments);
      } catch (err) {
        setToast({ message: "Failed to load assignments", type: "error" });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDelete = async (homeworkId) => {
    // 1. Security Handshake (Double Confirm)
    const confirmed = window.confirm("Are you sure? This will remove the homework from all students' diaries and delete their completion status.");
    
    if (!confirmed) return;

    try {
        // 2. Call Backend API
        await API.delete(`/homework/${homeworkId}`);

        // 3. UI Update: Remove from local state instantly (No reload needed)
        setPosts(prevPosts => prevPosts.filter(post => post._id !== homeworkId));

        // 4. Success Feedback
        setToast({ message: "Post deleted successfully", type: "success" });
    } catch (err) {
        const msg = err.response?.data?.message || "Failed to delete homework";
        setToast({ message: msg, type: "error" });
    }
};

  // 2. Post Homework Logic
  const handlePostHomework = async (e) => {
    e.preventDefault();
    if (!formData.assignmentId || !formData.title || !formData.dueDate) {
      setToast({ message: "Please fill all required fields", type: "error" });
      return;
    }

    setSubmitting(true);
    try {
      // Find the selected assignment object to get internal IDs
      const selectedAsgn = assignments.find(a => a._id === formData.assignmentId);

      await API.post('/homework/create', {
        title: formData.title,
        description: formData.description,
        imageUrl: formData.imageUrl,
        classId: selectedAsgn.classId._id,
        subjectId: selectedAsgn.subjectId._id,
        academicYear: settings.currentAcademicYear, // Hardcoded for now
        dueDate: formData.dueDate
      })

      setToast({ message: "Homework broadcasted to class!", type: "success" });
      setFormData({ assignmentId: '', title: '', description: '', imageUrl: '', dueDate: '' });
      setActiveTab('history'); // Switch to history to see the new post
    } catch (err) {
      setToast({ message: err.response?.data?.message || "Failed to post", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Academic Diary</h1>
        <div className="flex p-1 bg-gray-100 rounded-2xl w-full max-w-xs mt-2">
          <button 
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'create' ? 'bg-white text-primary shadow-sm' : 'text-secondary'}`}
          >
            Assign New
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'history' ? 'bg-white text-primary shadow-sm' : 'text-secondary'}`}
          >
            Past Posts
          </button>
        </div>
      </div>

      {activeTab === 'create' ? (
        /* 3. The "Create" Form */
        <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <form onSubmit={handlePostHomework} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Select Class & Subject</label>
              <select 
                className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold text-gray-800 outline-none focus:border-primary"
                value={formData.assignmentId}
                onChange={(e) => setFormData({...formData, assignmentId: e.target.value})}
              >
                <option value="">Select your assignment...</option>
                {assignments.map(a => (
                  <option key={a._id} value={a._id}>
                    Class {a.classId.className} - {a.subjectId.subjectName}
                  </option>
                ))}
              </select>
            </div>

            <Input 
              label="Homework Title" 
              placeholder="e.g., Chapter 5 Exercises" 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
            />

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1 text-danger">Due Date *</label>
              <input 
                type="date" 
                className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold text-gray-800 outline-none focus:border-primary"
                value={formData.dueDate}
                onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Homework Instructions</label>
              <textarea 
                className="w-full p-4 bg-white border-2 border-gray-100 rounded-xl font-medium text-gray-800 outline-none focus:border-primary min-h-[120px]"
                placeholder="Write detailed instructions for the students here..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <Input 
              label="Blackboard Snap (Image Link)" 
              icon={Camera} 
              placeholder="Paste photo URL here (optional)" 
              value={formData.imageUrl}
              onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
            />

            <Button type="submit" fullWidth icon={Send} isLoading={submitting}>
              Broadcast Homework
            </Button>
          </form>
        </Card>
      ) : (
        /* 4. The History Feed - Simple Placeholder for this step */
      <div className="space-y-4 animate-in fade-in duration-500">
          {loadingPosts ? (
            <div className="py-20"><LoadingSpinner size="md" /></div>
          ) : posts.length > 0 ? (
            posts.map((post) => (
              <Card key={post._id} className="border-l-4 border-l-primary hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-indigo-50 text-primary text-[10px] font-black rounded uppercase tracking-tighter">
                        Class {post.classId?.className}
                      </span>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-black rounded uppercase tracking-tighter">
                        {post.subjectId?.subjectName}
                      </span>
                    </div>
                    
                    <h3 className="font-black text-gray-900">{post.title}</h3>

                    <p className="text-sm text-secondary line-clamp-2 italic">"{post.description}"</p>
                    {post.imageUrl && (
                      <a 
                        href={post.imageUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary text-[10px] font-black uppercase mt-2 bg-indigo-50 px-2 py-1 rounded hover:bg-primary hover:text-white transition-colors"
                      >
                        <ExternalLink size={12} /> Open Reference Link
                      </a>
                    )}
                    <div className="flex items-center gap-4 pt-2">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase">
                        <Calendar size={12} /> Due: {new Date(post.dueDate).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase">
                        <History size={12} /> Posted: {new Date(post.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Optional Delete Button */}
                  <button 
                    onClick={() => handleDelete(post._id)} // <--- ATTACH THE FUNCTION
                    className="p-2 text-gray-300 hover:text-danger hover:bg-red-50 rounded-xl transition-all active:scale-90"
                    title="Delete Post"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </Card>
            ))
          ) : (
            <div className="py-20 text-center flex flex-col items-center gap-4 opacity-40">
              <History size={48} />
              <p className="font-bold">You haven't posted any homework yet.</p>
              <Button variant="outline" onClick={() => setActiveTab('create')}>Assign First Homework</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeacherHomework;