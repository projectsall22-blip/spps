import React, { useState, useEffect } from 'react';
import { Clock, BookOpen, Info, Calendar } from 'lucide-react';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const TeacherTimetable = () => {
  const [agenda, setAgenda] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState('');
  
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  useEffect(() => {
    const fetchAgenda = async () => {
      try {
        const res = await API.get('/timetable/teacher-agenda');
        setAgenda(res.data);
        const today = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
        setSelectedDay(days.includes(today) ? today : "Monday");
      } catch (err) {
        console.error("Failed to load agenda");
      } finally {
        setLoading(false);
      }
    };
    fetchAgenda();
  }, []);

  const periods = agenda[selectedDay] || [];

  if (loading) return <div className="py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight text-indigo-700">Teaching Schedule</h1>
        <p className="text-sm text-secondary font-medium">Your weekly subject distribution across classes.</p>
      </div>

      {/* Day Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {days.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap border-2 ${
              selectedDay === day 
              ? 'bg-primary border-primary text-white shadow-lg' 
              : 'bg-white border-gray-100 text-secondary'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Periods List */}
      <div className="space-y-4">
        {periods.length > 0 ? (
          periods.map((period, idx) => (
            <Card key={idx} className="border-l-4 border-l-primary">
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center justify-center w-20 h-20 bg-indigo-50 text-primary rounded-2xl shrink-0">
                  <Clock size={18} className="mb-1" />
                  <span className="text-xs font-black">{period.startTime}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                     <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Period {period.periodNumber}</span>
                     <span className="px-2 py-0.5 bg-green-50 text-success text-[10px] font-black rounded uppercase">Class {period.className}</span>
                  </div>
                  <h3 className="text-lg font-black text-gray-900">{period.subjectName}</h3>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="py-20 text-center opacity-30">
            <Calendar size={64} className="mx-auto mb-4" />
            <p className="font-bold">No teaching periods assigned for {selectedDay}.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherTimetable;