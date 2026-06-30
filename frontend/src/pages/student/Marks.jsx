import React, { useState, useEffect } from 'react';
import { Trophy, BookOpen, ChevronRight, AlertCircle, Search } from 'lucide-react';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';

const StudentMarks = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchingMarks, setFetchingMarks] = useState(false);
  const { settings } = useSettings();
  const [viewYear, setViewYear] = useState(settings.currentAcademicYear);
  const historyOptions = user.academicHistory || [];;


  useEffect(() => {
    const fetchExams = async () => {
      setLoading(true);
      
      setExams([]);
      setSelectedExam('');
      setReportData(null); // This clears the blue card and subject cards instantly

      try {
        const res = await API.get(`/admin/exams?year=${viewYear}`);
        setExams(res.data);
        
        if (res.data.length > 0) {
          setSelectedExam(res.data[0]._id);
        }
        // Note: If res.data.length is 0, reportData remains NULL, fixing the bug.
      } catch (err) {
        console.error("Fetch failed");
      } finally {
        setLoading(false);
      }
    };
    fetchExams();
  }, [viewYear]);


  // 2. Fetch marks when an exam OR year is selected
 useEffect(() => {
    if (!selectedExam || !user?._id) return;

    const fetchMarks = async () => {
      setFetchingMarks(true);
      try {
        // We pass the viewYear in the query to ensure we hit the archived data if needed
        const res = await API.get(`/marks/report-card/${user._id}/${selectedExam}?year=${viewYear}`);
        setReportData(res.data);
      } catch (err) {
        setReportData(null); 
      } finally {
        setFetchingMarks(false);
      }
    };
    fetchMarks();
  }, [selectedExam, user?._id, viewYear]);


  // Helper for Grade Colors
  const getGradeColor = (grade) => {
    if (['A+', 'A', 'B'].includes(grade)) return 'text-success bg-green-50';
    if (['C', 'D'].includes(grade)) return 'text-warning bg-amber-50';
    return 'text-danger bg-red-50';
  };

  if (loading) return <div className="py-20"><LoadingSpinner size="lg" /></div>;

return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Academic Results</h1>
        <p className="text-sm text-secondary font-medium">Select a session to view your historical performance.</p>
      </div>

      {/* 2. Session Selector (Keep this as the primary anchor) */}
      <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-primary shadow-sm"><Trophy size={16} /></div>
          <span className="text-xs font-black text-indigo-900 uppercase tracking-tight">Viewing Session:</span>
        </div>
        <select 
            value={viewYear} 
            onChange={(e) => setViewYear(e.target.value)}
            className="bg-white border-2 border-indigo-100 rounded-xl text-sm font-black text-primary px-3 py-1.5 outline-none"
        >
            <option value={settings.currentAcademicYear}>Current ({settings.currentAcademicYear})</option>
            {user.academicHistory && user.academicHistory.map((h, idx) => (
                <option key={idx} value={h.year}>{h.year} (Class {h.class})</option>
            ))}
        </select>
      </div>

      {/* --- THE MASTER GATE: Everything below depends on exams.length --- */}
      {exams.length > 0 ? (
        <div className="space-y-6">
          {/* A. The Exam Selector (Only shows if exams exist) */}
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary z-10">
              <Search size={18} />
            </div>
            <select 
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="w-full h-14 pl-12 pr-4 bg-white border-2 border-gray-100 rounded-2xl font-bold text-gray-800 outline-none focus:border-primary transition-all appearance-none cursor-pointer"
            >
              {exams.map(exam => (
                <option key={exam._id} value={exam._id}>{exam.examName} ({viewYear})</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
               <ChevronRight size={18} className="rotate-90" />
            </div>
          </div>

          {/* B. The Results Area */}
          {fetchingMarks ? (
            <div className="py-20 text-center"><LoadingSpinner /> <p className="text-xs text-secondary mt-2">Fetching marks...</p></div>
          ) : reportData ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Percentage Card */}
              <div className="bg-primary rounded-3xl p-6 text-white shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Final Percentage</p>
                  <h2 className="text-4xl font-black">{reportData.percentage}%</h2>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Total Marks</p>
                  <p className="text-xl font-bold">{reportData.totalObtained} / {reportData.totalMax}</p>
                </div>
              </div>

              {/* Subject List */}
              <div className="grid grid-cols-1 gap-3">
                {reportData.subjects.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-50 text-primary rounded-xl flex items-center justify-center"><BookOpen size={20} /></div>
                      <div>
                        <p className="font-bold text-gray-800 text-sm">{item.subjectId?.subjectName}</p>
                        <p className="text-[10px] text-secondary font-medium">Marks: {item.marksObtained} / {item.maxMarks}</p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-lg font-black text-sm ${getGradeColor(item.grade)}`}>{item.grade}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* No data for this specific exam */
            <div className="py-20 text-center space-y-4">
              <Trophy size={32} className="mx-auto text-gray-300" />
              <p className="text-secondary font-medium">Marks for this exam haven't been published yet.</p>
            </div>
          )}
        </div>
      ) : (
        /* 3. Empty State (Only shows if exams.length is 0) */
        <div className="p-16 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
           <p className="text-sm font-bold text-secondary italic">
             No examinations were recorded for the {viewYear} session.
           </p>
        </div>
      )}
    </div>
  );
};

export default StudentMarks;