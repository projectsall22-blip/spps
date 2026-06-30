import React, { useState, useEffect } from 'react';
import { Clock, User, BookOpen, Coffee, Bell, Info } from 'lucide-react';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const StudentTimetable = () => {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState('');
  
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // 1. Fetch the full week schedule
  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        const res = await API.get('/timetable/my-timetable');
        setSchedule(res.data);
        
        // Auto-select today's day if possible
        const today = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
        setSelectedDay(days.includes(today) ? today : "Monday");
      } catch (err) {
        console.error("Failed to load timetable");
      } finally {
        setLoading(false);
      }
    };
    fetchTimetable();
  }, []);

  // 2. Filter periods for the active tab
  const activeDayData = schedule.find(item => item.day === selectedDay);
  const periods = activeDayData ? activeDayData.periods : [];

  if (loading) return <div className="py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Weekly Schedule</h1>
        <p className="text-sm text-secondary font-medium">Find your classes and timings below.</p>
      </div>

      {/* 3. Horizontal Scroll Day Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4">
        {days.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap border-2 ${
              selectedDay === day 
              ? 'bg-primary border-primary text-white shadow-lg shadow-indigo-100' 
              : 'bg-white border-gray-100 text-secondary hover:border-primary/30'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* 4. Period List */}
      <div className="space-y-4">
        {periods.length > 0 ? (
          periods.map((period, idx) => (
            <div key={idx} className="animate-in fade-in slide-in-from-right-4 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
              <Card className={`relative overflow-hidden ${period.periodType === 'Break' ? 'bg-gray-50/50 border-dashed' : 'bg-white'}`}>
                
                <div className="flex items-center gap-4">
                  {/* Time Badge */}
                  <div className={`flex flex-col items-center justify-center w-20 h-20 rounded-2xl shrink-0 ${
                    period.periodType === 'Break' ? 'bg-gray-100 text-gray-400' : 'bg-indigo-50 text-primary'
                  }`}>
                    <Clock size={18} className="mb-1" />
                    <span className="text-xs font-black">{period.startTime}</span>
                    <span className="text-[10px] font-bold opacity-60">{period.endTime}</span>
                  </div>

                  {/* Subject Details */}
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-1">
                      {period.periodType === 'Break' ? (
                          <Coffee size={14} className="text-gray-400" /> 
                      ) : (
                          <BookOpen size={14} className="text-primary" />
                      )}

                      {/* THE FIX IS HERE */}
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {period.periodType === 'Class' ? 'Period' : period.periodType} {period.periodNumber}
                      </span>
                    </div>
                    
                    <h3 className={`text-lg font-black tracking-tight ${period.periodType === 'Break' ? 'text-gray-400' : 'text-gray-900'}`}>
                      {period.subjectId?.subjectName || (period.periodType === 'Break' ? 'Lunch Break' : 'Special Event')}
                    </h3>

                    {period.teacherId && (
                      <div className="flex items-center gap-1.5 mt-1 text-secondary font-medium text-xs">
                        <User size={12} />
                        <span>{period.teacherId.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Period Indicator */}
                  <div className="hidden sm:block">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex flex-col items-center justify-center border border-indigo-100 shadow-sm">
                        <span className="text-[8px] font-black text-primary uppercase leading-none">Period</span>
                        <span className="text-lg font-black text-primary leading-none">{period.periodNumber}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          ))
        ) : (
          /* 5. Empty State */
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-200">
              <Info size={32} />
            </div>
            <p className="text-secondary font-medium italic">No classes scheduled for {selectedDay}.</p>
          </div>
        )}
      </div>

      <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-start gap-3">
        <Info size={18} className="text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-indigo-700 leading-relaxed font-medium">
          Classes usually run for 45 minutes. Please be on time and bring the required textbooks for each subject.
        </p>
      </div>
    </div>
  );
};

export default StudentTimetable;