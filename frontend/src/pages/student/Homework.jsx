import React, { useState, useEffect } from 'react';
import { BookMarked, Calendar, CheckCircle2, Circle, AlertCircle, Image as ImageIcon, ExternalLink } from 'lucide-react';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';

const StudentHomework = () => {
  const [homeworks, setHomeworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'completed'
  const [toast, setToast] = useState(null);

  // 1. Fetch Homework Feed
  useEffect(() => {
    fetchHomework();
  }, []);

  const fetchHomework = async () => {
    try {
      const res = await API.get('/homework/my-feed');
      setHomeworks(res.data);
    } catch (err) {
      setToast({ message: "Failed to load homework", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // 2. Toggle Completion Logic (The "Tick" Handshake)
  const handleToggleStatus = async (homeworkId) => {
    try {
      const res = await API.post(`/homework/toggle-status/${homeworkId}`);
      
      // OPTIMISTIC UI UPDATE: 
      // Instead of re-fetching everything, we update the local state
      setHomeworks(prev => prev.map(hw => 
        hw._id === homeworkId ? { ...hw, isCompleted: !hw.isCompleted } : hw
      ));

      setToast({ message: res.data.message, type: "success" });
    } catch (err) {
      setToast({ message: "Could not update status", type: "error" });
    }
  };

  // 3. Filter Logic
  const filteredHomework = homeworks.filter(hw => 
    activeTab === 'completed' ? hw.isCompleted : !hw.isCompleted
  );

  if (loading) return <div className="py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Daily Diary</h1>
        
        {/* 4. Segmented Control (Tabs) */}
        <div className="flex p-1 bg-gray-100 rounded-2xl w-full max-w-md">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
              activeTab === 'pending' ? 'bg-white text-primary shadow-sm' : 'text-secondary'
            }`}
          >
            Pending ({homeworks.filter(h => !h.isCompleted).length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
              activeTab === 'completed' ? 'bg-white text-success shadow-sm' : 'text-secondary'
            }`}
          >
            Completed ({homeworks.filter(h => h.isCompleted).length})
          </button>
        </div>
      </div>

      {/* 5. Homework List */}
      <div className="space-y-4">
        {filteredHomework.length > 0 ? (
          filteredHomework.map((hw) => (
            <div key={hw._id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Card className={`relative border-l-4 ${activeTab === 'completed' ? 'border-l-success' : 'border-l-warning'}`}>
                <div className="flex items-start gap-4">
                  {/* Checkbox Area */}
                  <button 
                    onClick={() => handleToggleStatus(hw._id)}
                    className={`mt-1 transition-colors ${hw.isCompleted ? 'text-success' : 'text-gray-300'}`}
                  >
                    {hw.isCompleted ? <CheckCircle2 size={28} /> : <Circle size={28} />}
                  </button>

                  <div className="flex-grow space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 bg-indigo-50 text-primary text-[10px] font-black uppercase rounded-md tracking-wider">
                        {hw.subjectId?.subjectName}
                      </span>
                      <div className="flex items-center gap-1 text-secondary text-xs font-bold">
                        <Calendar size={14} />
                        {new Date(hw.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>

                    <h3 className={`font-bold text-gray-900 ${hw.isCompleted ? 'line-through opacity-50' : ''}`}>
                      {hw.title}
                    </h3>
                    
                    <p className="text-sm text-secondary leading-relaxed line-clamp-2 italic">
                      "{hw.description}"
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">By {hw.teacherId?.name}</p>
                        {hw.imageUrl && (
                          <a 
                            href={hw.imageUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary text-xs font-bold hover:underline"
                          >
                            <ExternalLink size={14} /> View Reference Link
                          </a>
                        )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          ))
        ) : (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
              <BookMarked size={32} />
            </div>
            <p className="text-secondary font-medium">No homework found in this section.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentHomework;