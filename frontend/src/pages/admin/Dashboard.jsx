import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  ClipboardCheck, 
  Bell, 
  PlusCircle,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  UserPlus
} from 'lucide-react';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useSettings } from '../../context/SettingsContext';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const { settings } = useSettings();

  // 1. Fetch Admin Global Stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await API.get('/admin/dashboard-stats');
        setData(res.data);
      } catch (err) {
        console.error("Failed to load admin stats");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="py-20"><LoadingSpinner size="lg" /></div>;

  // API failed — show fallback instead of crashing
  if (!data || !data.overview) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Command Center</h1>
          <p className="text-sm text-secondary font-medium">Overview of school operations & staff performance.</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Students" value="—" color="text-primary" bg="bg-indigo-50" />
          <StatCard icon={GraduationCap} label="Teachers" value="—" color="text-success" bg="bg-green-50" />
          <StatCard icon={BookOpen} label="Classes" value="—" color="text-warning" bg="bg-amber-50" />
          <StatCard icon={ClipboardCheck} label="Attendance" value="—%" color="text-danger" bg="bg-red-50" />
        </div>
        <div className="py-10 text-center text-gray-400 font-bold">
          Could not load dashboard data. Please refresh.
        </div>
      </div>
    );
  }

  const { overview, recentActivity } = data;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* 2. Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Command Center</h1>
          <p className="text-sm text-secondary font-medium">Overview of school operations & staff performance.</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm">
          <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">System Online</p>
        </div>
      </div>

      {/* 3. The Big 4 Stats (2x2 Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Students" value={overview.totalStudents} color="text-primary" bg="bg-indigo-50" />
        <StatCard icon={GraduationCap} label="Teachers" value={overview.totalTeachers} color="text-success" bg="bg-green-50" />
        <StatCard icon={BookOpen} label="Classes" value={overview.totalClasses} color="text-warning" bg="bg-amber-50" />
        <StatCard icon={ClipboardCheck} label="Attendance" value={`${overview.attendancePercentage}%`} color="text-danger" bg="bg-red-50" />
      </div>

      {/* 4. Urgent Action Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 space-y-6">
          <Card title="Urgent Action Radar" icon={AlertTriangle} className="border-red-100">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Attendance Alert */}
                <button
                  onClick={() => navigate('/admin/attendance')}
                  className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl border border-amber-100 group transition-all active:scale-95"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-warning shadow-sm">
                       <TrendingUp size={20} />
                    </div>
                    <div className="text-left">
                       <p className="text-sm font-black text-gray-900">Today's Present</p>
                       <p className="text-[10px] font-bold text-warning uppercase">{overview.presentToday} Students</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-warning group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Exams Alert */}
                <button
                  onClick={() => navigate('/admin/exams')}
                  className="flex items-center justify-between p-4 bg-indigo-50 rounded-2xl border border-indigo-100 group transition-all active:scale-95"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm">
                       <ClipboardCheck size={20} />
                    </div>
                    <div className="text-left">
                       <p className="text-sm font-black text-gray-900">Exams</p>
                       <p className="text-[10px] font-bold text-primary uppercase">Manage Schedule</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-primary group-hover:translate-x-1 transition-transform" />
                </button>

             </div>
          </Card>

          {/* 5. Shortcut Toolbar */}
          <div className="grid grid-cols-3 gap-4">
            {/* Redirecting directly to the main Student/Teacher lists */}
            <ShortcutButton icon={UserPlus} label="Add Student" onClick={() => navigate('/admin/students')} />
            <ShortcutButton icon={PlusCircle} label="Add Teacher" onClick={() => navigate('/admin/teachers')} />
            <ShortcutButton icon={Bell} label="Broadcast" onClick={() => navigate('/admin/announcements')} />
          </div>
        </div>

        {/* 6. Recent Activity Log */}
        <Card title="Activity Log" icon={TrendingUp}>
          <div className="space-y-4">
            {/* CHECK: If both arrays are empty, show the "Clean Slate" UI */}
            {recentActivity.notices.length === 0 && recentActivity.homework.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center justify-center animate-in fade-in duration-500">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                  <TrendingUp size={24} className="text-gray-300" />
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">
                  Session Clean Slate
                </p>
                <p className="text-[9px] font-bold text-gray-400 uppercase italic">
                  No activity in {settings.currentAcademicYear} yet
                </p>
              </div>
            ) : (
              /* IF DATA EXISTS: Render the lists as normal */
              <>
                {/* Render Notices */}
                {recentActivity.notices.map((notice, idx) => (
                  <div key={`noticelog-${idx}`} className="flex items-start gap-3 animate-in slide-in-from-right-2 duration-300">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${notice.priority === 'Urgent' ? 'bg-danger shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'bg-primary'}`} />
                    <div>
                      <p className="text-xs font-bold text-gray-800 line-clamp-1">{notice.title}</p>
                      <p className="text-[10px] text-secondary font-medium uppercase tracking-tight">Notice Broadcasted</p>
                    </div>
                  </div>
                ))}

                {/* Render Homework */}
                {recentActivity.homework.map((hw, idx) => (
                  <div key={`hwlog-${idx}`} className="flex items-start gap-3 animate-in slide-in-from-right-2 duration-300">
                    <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 bg-success" />
                    <div>
                      <p className="text-xs font-bold text-gray-800 line-clamp-1">{hw.title}</p>
                      <p className="text-[10px] text-secondary font-medium uppercase tracking-tight">Homework: Class {hw.classId.className}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </Card>

      </div>
    </div>
  );
};

// Helper Stat Card Component
const StatCard = ({ icon: Icon, label, value, color, bg }) => (
  <Card className="flex flex-col items-center justify-center py-6">
    <div className={`w-12 h-12 ${bg} ${color} rounded-2xl flex items-center justify-center mb-3 shadow-sm`}>
       <Icon size={24} />
    </div>
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
    <p className={`text-2xl font-black ${color}`}>{value}</p>
  </Card>
);

// Helper Shortcut Component
const ShortcutButton = ({ icon: Icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center justify-center gap-2 p-4 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 group"
  >
    <div className="w-12 h-12 bg-indigo-50 text-primary rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
       <Icon size={24} />
    </div>
    <span className="text-[10px] font-black text-gray-600 uppercase text-center tracking-tighter leading-none">{label}</span>
  </button>
);

export default AdminDashboard;