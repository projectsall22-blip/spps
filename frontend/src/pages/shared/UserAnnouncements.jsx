import React, { useState, useEffect } from 'react';
import { Megaphone, Clock, Calendar, AlertCircle, Globe, GraduationCap, Users } from 'lucide-react';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useSettings } from '../../context/SettingsContext';

const UserAnnouncements = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  const { settings } = useSettings();

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const res = await API.get('/users/announcements');
        setNotices(res.data);
        // Mark all visible announcements as viewed
        API.post('/users/announcements/mark-viewed').catch(() => {});
      } catch (err) {
        console.error("Failed to load announcements");
      } finally {
        setLoading(false);
      }
    };
    fetchNotices();
  }, []);

  const audienceConfig = {
    Everyone: { icon: Globe, color: "text-indigo-600 bg-indigo-50" },
    Teachers: { icon: GraduationCap, color: "text-green-600 bg-green-50" },
    Students: { icon: Users, color: "text-blue-600 bg-blue-50" }
  };

  if (loading) return <div className="py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">School Noticeboard</h1>
        <p className="text-sm text-secondary font-medium">
          Viewing updates for <span className="text-primary font-black uppercase tracking-tighter bg-indigo-50 px-2 py-0.5 rounded">Session {settings.currentAcademicYear}</span>
        </p>
      </div>

      <div className="space-y-4">
        {notices.length > 0 ? (
          notices.map((item) => {
            const Audience = audienceConfig[item.targetAudience];
            return (
              <Card key={item._id} className="relative overflow-hidden hover:shadow-md transition-all">
                {item.priority === 'Urgent' && (
                   <div className="absolute top-0 left-0 w-1.5 h-full bg-danger animate-pulse" />
                )}
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${Audience.color}`}>
                       <Audience.icon size={12} /> {item.targetAudience}
                    </div>
                    {item.priority === 'Urgent' && (
                      <span className="px-2 py-1 bg-red-50 text-danger text-[10px] font-black uppercase rounded-lg border border-red-100">Action Required</span>
                    )}
                  </div>

                  <h3 className="text-lg font-black text-gray-900 leading-tight">{item.title}</h3>
                  <p className="text-sm text-secondary leading-relaxed whitespace-pre-line">{item.message}</p>
                  
                  <div className="flex items-center gap-4 pt-2 border-t border-gray-50">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase">
                       <Clock size={12} /> Posted: {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="py-20 text-center opacity-30">
            <Megaphone size={64} className="mx-auto mb-4" />
            <p className="font-bold">No announcements for you at this time.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserAnnouncements;