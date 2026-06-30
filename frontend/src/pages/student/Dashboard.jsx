import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  CheckCircle, 
  Clock, 
  Megaphone, 
  Calendar,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Link } from 'react-router-dom';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Fetch Aggregated Dashboard Data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await API.get('/users/dashboard');
        setData(res.data);
      } catch (err) {
        setError("Could not load dashboard data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) return <div className="py-20"><LoadingSpinner size="lg" /></div>;
  if (error) return (
    <div className="flex flex-col items-center py-20 text-danger">
      <AlertCircle size={48} className="mb-4" />
      <p className="font-bold">{error}</p>
    </div>
  );

  const { profileSummary, academicFeed, today } = data;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* 2. Welcome Section */}
      <div className="bg-primary rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl md:text-3xl font-black mb-1">
            Welcome back, {user.name.split(' ')[0]}! 👋
          </h2>
          <p className="text-indigo-100 font-medium opacity-90">
            Class {user.class} | Admission No: {user.UID || 'N/A'}
          </p>
        </div>
        {/* Decorative Circle */}
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
      </div>

      {/* 3. Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Attendance Card */}
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-success rounded-2xl flex items-center justify-center">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-xs text-secondary font-bold uppercase tracking-wider">Attendance</p>
            <p className="text-xl font-black text-gray-900">{profileSummary.attendancePercentage}%</p>
          </div>
        </Card>

        {/* Homework Card */}
          <Card className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 text-warning rounded-2xl flex items-center justify-center">
              <BookOpen size={24} />
            </div>
            <div>
              <p className="text-xs text-secondary font-bold uppercase tracking-wider">Homework</p>
              {/* CHANGE: Use pendingHomeworkCount instead of array.length */}
              <p className="text-xl font-black text-gray-900">
                  {academicFeed.pendingHomeworkCount} Pending
              </p>
            </div>
          </Card>

        {/* Next Class Card */}
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs text-secondary font-bold uppercase tracking-wider">Today's Schedule</p>
            <p className="text-xl font-black text-gray-900">{today.schedule.length} Periods</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  
      {/* Widget 1: Today's Timetable */}
        <Card title="Today's Timetable" icon={Calendar}>
          <div className="space-y-4">
            {today.schedule.length > 0 ? (
              <>
                {today.schedule.slice(0, 4).map((period, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 animate-in fade-in slide-in-from-right-2">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-primary bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 shadow-sm">
                        {period.startTime}
                      </span>
                      <p className="text-sm font-black text-gray-800">
                        {period.subjectId?.subjectName || 'Break / Assembly'}
                      </p>
                    </div>
                    {/* Point 2: Room number removed from here */}
                  </div>
                ))}
                {/* Point 3: Functional Navigation Link */}
                <Link 
                  to="/student/timetable" 
                  className="block w-full text-center text-xs font-black text-primary uppercase tracking-widest mt-4 hover:underline"
                >
                  View Full Timetable
                </Link>
              </>
            ) : (
              <div className="py-10 text-center opacity-40">
                <p className="text-[10px] font-black uppercase italic">No classes scheduled for today.</p>
              </div>
            )}
          </div>
        </Card>

        {/* Widget 2: Latest Announcements */}
        <Card title="Latest Announcements" icon={Megaphone}>
          <div className="space-y-4">
            {/* Point 4: Session Isolation Check (Backend handles the data, Frontend handles the view) */}
            {today.announcements.length > 0 ? (
              today.announcements.map((item, idx) => (
                <Link to="/student/announcements" key={idx} className="group block">
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                      item.priority === 'Urgent' ? 'bg-danger animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'bg-primary'
                    }`} />
                    <div className="flex-grow">
                      <p className="text-sm font-black text-gray-900 group-hover:text-primary transition-colors line-clamp-1">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-secondary font-medium line-clamp-1 italic">
                        {item.message}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-primary transition-all group-hover:translate-x-1" />
                  </div>
                  {idx !== today.announcements.length - 1 && <div className="h-px bg-gray-50 w-full mt-4" />}
                </Link>
              ))
            ) : (
              <div className="py-10 text-center flex flex-col items-center justify-center opacity-40">
                <Megaphone size={32} className="mb-2 text-gray-300" />
                <p className="text-[10px] font-black uppercase tracking-tighter">
                  No notices for {profileSummary.class} in this session yet.
                </p>
              </div>
            )}
          </div>
        </Card>

      </div>
    </div>
  );
};

export default StudentDashboard;