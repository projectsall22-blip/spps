import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardCheck, 
  BookMarked, 
  Trophy, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  PlusCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const TeacherDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await API.get('/teacher/dashboard');
        setData(res.data);
      } catch (err) {
        console.error("Dashboard Load Error");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <div className="py-20"><LoadingSpinner size="lg" /></div>;

  const { schedule, alerts, myAssignments } = data;
  const hasAlerts = alerts.attendanceRequired.length > 0 || alerts.marksEntryRequired.length > 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* 2. Welcome & Quick Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            Hello, {user.name.split(' ')[0]}! 👋
          </h2>
          <p className="text-sm text-secondary font-medium">You have {schedule.length} classes scheduled for today.</p>
        </div>
        <div className="flex gap-2">
           <div className="bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assignments</p>
              <p className="text-lg font-black text-primary">{myAssignments.length}</p>
           </div>
           <div className="bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tasks</p>
              <p className="text-lg font-black text-danger">{alerts.attendanceRequired.length + alerts.marksEntryRequired.length}</p>
           </div>
        </div>
      </div>

      {/* 3. Quick Action Row (High Visibility) */}
      <div className="grid grid-cols-3 gap-3">
        <QuickActionButton 
          icon={ClipboardCheck} 
          label="Attendance" 
          color="bg-green-50 text-success" 
          onClick={() => navigate('/teacher/attendance')}
        />
        <QuickActionButton 
          icon={PlusCircle} 
          label="Homework" 
          color="bg-amber-50 text-warning" 
          onClick={() => navigate('/teacher/homework')}
        />
        <QuickActionButton 
          icon={Trophy} 
          label="Marks" 
          color="bg-indigo-50 text-primary" 
          onClick={() => navigate('/teacher/marks')}
        />
      </div>

      {/* 4. Urgent Alerts Section (The "Action" Area) */}
      <Card title="Urgent Action Items" icon={AlertCircle} className={hasAlerts ? 'border-red-100' : ''}>
        <div className="space-y-3">
          {hasAlerts ? (
            <>
              {/* Attendance Alerts */}
              {alerts.attendanceRequired.map((className, idx) => (
                <AlertItem 
                  key={`att-${idx}`}
                  type="Attendance"
                  message={`Daily attendance pending for Class ${className}`}
                  onClick={() => navigate('/teacher/attendance')}
                />
              ))}
              {/* Marks Alerts */}
              {alerts.marksEntryRequired.map((item, idx) => (
                <AlertItem 
                  key={`mark-${idx}`}
                  type="Marks"
                  message={`${item.examName} entry pending: ${item.class} (${item.subject})`}
                  onClick={() => navigate('/teacher/marks')}
                />
              ))}
            </>
          ) : (
            <div className="py-6 text-center flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-green-50 text-success rounded-full flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
              <p className="text-sm font-bold text-gray-500">You're all caught up for today!</p>
            </div>
          )}
        </div>
      </Card>

      {/* 5. Today's Schedule (Operative) */}
      <Card title="Today's Teaching Schedule" icon={Clock}>
        <div className="space-y-4">
      {schedule && schedule.length > 0 ? (
      schedule.map((period, idx) => (
        <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="text-center w-14">
              <p className="text-xs font-black text-primary">{period.startTime}</p>
              <p className="text-[10px] text-gray-400 font-bold">{period.endTime}</p>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div>
              {/* FIXED LINE: Now matches backend flattened subjectName */}
              <p className="text-sm font-black text-gray-900">{period.subjectName}</p> 
              <p className="text-[10px] font-bold text-secondary uppercase">Class {period.className}</p>
            </div>
          </div>
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-primary shadow-sm text-[10px] font-black border border-indigo-50">
             P{period.periodNumber}
          </div>
        </div>
      ))
    ) : (
      <div className="py-8 text-center flex flex-col items-center gap-2 opacity-40">
         <Clock size={32} />
         <p className="text-sm font-bold uppercase italic">No classes scheduled for today.</p>
      </div>
    )}
  </div>
</Card>

    </div>
  );
};

// Helper Components
const QuickActionButton = ({ icon: Icon, label, color, onClick }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-2 group">
    <div className={`w-full aspect-square rounded-2xl flex items-center justify-center transition-transform active:scale-90 ${color}`}>
      <Icon size={28} />
    </div>
    <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">{label}</span>
  </button>
);

const AlertItem = ({ type, message, onClick }) => (
  <div 
    onClick={onClick}
    className="flex items-center justify-between p-3 bg-red-50/50 border border-red-100 rounded-xl cursor-pointer hover:bg-red-50 transition-colors group"
  >
    <div className="flex items-center gap-3">
      <div className="w-1.5 h-1.5 bg-danger rounded-full animate-pulse" />
      <p className="text-xs font-bold text-gray-700">{message}</p>
    </div>
    <ChevronRight size={14} className="text-danger group-hover:translate-x-1 transition-transform" />
  </div>
);

export default TeacherDashboard;