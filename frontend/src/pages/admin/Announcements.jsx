import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Users, GraduationCap, Globe, Trash2, Calendar, Send, Clock, Eye } from 'lucide-react';
import { useForm } from 'react-hook-form';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';
import { useSettings } from '../../context/SettingsContext';

const AnnouncementManagement = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const { settings } = useSettings();

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  // 1. Fetch Noticeboard
  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await API.get('/admin/announcements');
      setAnnouncements(res.data);
    } catch (err) {
      setToast({ message: "Failed to load noticeboard", type: "error" });
    } finally {
      setLoading(false);
    }
  };


  const handleDelete = async (id) => {
  // Always ask for confirmation for destructive actions
  if (!window.confirm("Are you sure you want to delete this announcement? It will disappear for all Teachers and Students immediately.")) {
    return;
  }

  try {
    await API.delete(`/admin/announcements/${id}`);
    
    // UI Logic: Remove the deleted announcement from the list instantly
    setAnnouncements(prev => prev.filter(item => item._id !== id));
    
    setToast({ message: "Announcement removed successfully", type: "success" });
  } catch (err) {
    setToast({ message: "Failed to delete announcement", type: "error" });
  }
};

  // 2. Broadcast Logic
  const onBroadcast = async (data) => {
    setSubmitting(true);
    try {
      await API.post('/admin/announcements', data);
      setToast({ message: "Notice broadcasted successfully!", type: "success" });
      setIsModalOpen(false);
      reset();
      fetchAnnouncements();
    } catch (err) {
      setToast({ message: "Failed to broadcast notice", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Helper: Check Expiry
  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  // Helper: Audience Icon Map
  const audienceConfig = {
    Everyone: { icon: Globe, color: "text-indigo-600 bg-indigo-50" },
    Teachers: { icon: GraduationCap, color: "text-green-600 bg-green-50" },
    Students: { icon: Users, color: "text-blue-600 bg-blue-50" }
  };

  if (loading && announcements.length === 0) return <div className="py-20"><LoadingSpinner size="lg" /></div>;

  return (
      <div className="space-y-6">
          {toast && <Toast {...toast} onClose={() => setToast(null)} />}

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight text-indigo-700">Noticeboard Hub</h1>
              {/* THE VISUAL CONFIRMATION BADGE */}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Managing Session:</span>
                <span className="px-2 py-0.5 bg-indigo-50 text-primary text-[10px] font-black rounded border border-indigo-100 shadow-sm">
                  {settings.currentAcademicYear}
                </span>
              </div>
            </div>
            <Button variant="primary" icon={Plus} onClick={() => setIsModalOpen(true)}>
              Compose Notice
            </Button>
          </div>

      {/* 4. Broadcast Feed */}
      <div className="space-y-4">
        {announcements.length > 0 ? (
          announcements.map((item) => {
            const Audience = audienceConfig[item.targetAudience];
            const expired = isExpired(item.expiryDate);
            
            return (
              <Card key={item._id} className={`relative overflow-hidden transition-all ${!item.isActive || expired ? 'opacity-60 bg-gray-50' : 'hover:shadow-md'}`}>
                {/* Priority Indicator */}
                {item.priority === 'Urgent' && !expired && (
                   <div className="absolute top-0 left-0 w-1 h-full bg-danger animate-pulse" />
                )}

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-grow space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                       {/* Audience Badge */}
                       <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${Audience.color}`}>
                          <Audience.icon size={12} /> {item.targetAudience}
                       </div>
                       
                       {/* Priority Badge */}
                       <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${
                         item.priority === 'Urgent' ? 'bg-red-50 text-danger' : 'bg-gray-100 text-gray-500'
                       }`}>
                          {item.priority}
                       </div>

                       {/* Status Logic */}
                       {expired && <span className="px-2 py-1 bg-gray-200 text-gray-600 text-[10px] font-black uppercase rounded-lg">Archived</span>}
                       {!item.isActive && <span className="px-2 py-1 bg-amber-50 text-warning text-[10px] font-black uppercase rounded-lg border border-amber-100">Draft</span>}
                    </div>

                    <h3 className="text-lg font-black text-gray-900 tracking-tight">{item.title}</h3>
                    <p className="text-sm text-secondary leading-relaxed line-clamp-3">{item.message}</p>
                    
                    <div className="flex items-center gap-4 pt-2">
                       <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase">
                          <Clock size={12} /> Posted {new Date(item.createdAt).toLocaleDateString()}
                       </div>
                       {item.expiryDate && (
                         <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase">
                            <Calendar size={12} /> Expires {new Date(item.expiryDate).toLocaleDateString()}
                         </div>
                       )}
                       {/* View Count Badge */}
                       <div className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase border border-indigo-100">
                          <Eye size={11} />
                          {item.viewedBy?.length || 0} Seen
                       </div>
                    </div>
                  </div>

                  <div className="flex md:flex-col gap-2 shrink-0">
                    <button 
                      onClick={() => handleDelete(item._id)} // <--- ADD THIS LINE
                      className="p-2 text-gray-400 hover:text-danger hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={18}/>
                    </button>
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="py-20 text-center opacity-30">
            <Megaphone size={64} className="mx-auto mb-4" />
            <p className="font-bold text-lg">The noticeboard is empty.</p>
          </div>
        )}
      </div>

      {/* 5. Compose Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Compose New Announcement"
        size="lg"
      >
        <form onSubmit={handleSubmit(onBroadcast)} className="space-y-5">
          <Input 
            label="Notice Title" 
            placeholder="e.g. Winter Break Schedule" 
            {...register("title", { required: "Title is required" })}
            error={errors.title?.message}
          />
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Announcement Message</label>
            <textarea 
              className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl font-medium text-gray-800 outline-none focus:border-primary min-h-[150px]"
              placeholder="Write the full circular content here..."
              {...register("message", { required: true })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Target Audience</label>
              <select className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold" {...register("targetAudience")}>
                <option value="Everyone">Everyone (Public)</option>
                <option value="Teachers">Teachers Only</option>
                <option value="Students">Students Only</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Priority Level</label>
              <select className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold" {...register("priority")}>
                <option value="Normal">Normal</option>
                <option value="Important">Important</option>
                <option value="Urgent">Urgent / Action Required</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Input label="Expiry Date (Optional)" type="date" {...register("expiryDate")} />
             <div className="flex items-center gap-3 mt-8 ml-2">
                <input type="checkbox" id="isActive" defaultChecked {...register("isActive")} className="w-5 h-5 rounded accent-primary" />
                <label htmlFor="isActive" className="text-xs font-black text-gray-600 uppercase cursor-pointer">Post Immediately</label>
             </div>
          </div>

          <Button type="submit" fullWidth isLoading={submitting} icon={Send}>Broadcast to School</Button>
        </form>
      </Modal>
    </div>
  );
};

export default AnnouncementManagement;