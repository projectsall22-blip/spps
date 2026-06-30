import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Star, Search, Calendar, ChevronRight, Hash } from 'lucide-react';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';
import { useSettings } from '../../context/SettingsContext';


const RankList = ({ role }) => {
  const [classes, setClasses] = useState([]);
  const [exams, setExams] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const { settings } = useSettings();

  const [sessions, setSessions] = useState([]);
  const [viewYear, setViewYear] = useState(''); 
useEffect(() => {
    const discoverSessions = async () => {
        try {
            // This API scans the Exams and Settings collections to find all unique years
            const res = await API.get('/admin/exams/sessions'); 
            setSessions(res.data); // 'sessions' state stores the array [2027-28, 2026-27, 2025-26...]
        } catch (err) {
            console.error("Critical: Could not discover history sessions.");
        }
    };
    discoverSessions();
}, []);

// 2. DEFAULT SYNC EFFECT
// This ensures that when the Admin opens the page, they start on the CURRENT year
useEffect(() => {
    if (settings?.currentAcademicYear && !viewYear) {
        setViewYear(settings.currentAcademicYear);
    }
}, [settings, viewYear]);

// 3. MASTER DATA LOADER EFFECT
// This fetches Classes and Exams every time the 'viewYear' or 'role' changes
useEffect(() => {
    // 🛡️ GUARD: Don't run if viewYear isn't set yet (prevents empty API calls)
    if (!viewYear) return; 

    const fetchAcademicData = async () => {
        setLoading(true);
        try {
            // Step A: Determine class endpoint based on user role
            const classUrl = (role === 'teacher') ? '/teacher/managed-classes' : '/admin/classes';
            
            // Step B: Parallel fetch for speed
            const [clsRes, exRes] = await Promise.all([
                API.get(classUrl),
                API.get(`/admin/exams?year=${viewYear}`) // Dynamic Year Filtering
            ]);
            
            setClasses(clsRes.data);
            setExams(exRes.data);
            
            // Step C: Cleanup - If the year changes, reset the exam choice and the list
            setSelectedExam('');
            setResults([]); 
        } catch (err) {
            console.error("MERIT_FETCH_ERROR:", err);
        } finally {
            setLoading(false);
        }
    };

    fetchAcademicData();
}, [role, viewYear]);


  // 2. Fetch Rank List logic
  const handleGenerate = async () => {
    if (!selectedClass || !selectedExam) {
      setToast({ message: "Select Class and Exam first", type: "error" });
      return;
    }
    setLoading(true);
    try {
      const res = await API.get(`/admin/marks/ranklist/${selectedClass}/${selectedExam}`);
      setResults(res.data);
    } catch (err) {
      setToast({ message: "No marks found for this combination", type: "error" });
      setResults([]);
    } finally { setLoading(false); }
  };

  
  return (
    <div className="space-y-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight text-indigo-700">School Merit List</h1>
        <p className="text-sm text-secondary font-medium">Generate class-wise academic rankings.</p>
      </div>

          {/* --- ADD THIS SESSION SELECTOR BLOCK HERE --- */}
    <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between">
       <div className="flex items-center gap-2">
         <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-primary shadow-sm">
            <Calendar size={16} />
         </div>
         <span className="text-xs font-black text-indigo-900 uppercase tracking-tight">Viewing Session:</span>
       </div>

      <select 
          value={viewYear} 
          onChange={(e) => setViewYear(e.target.value)}
          className="bg-white border-2 border-indigo-100 rounded-xl text-sm font-black text-primary px-3 py-1.5 outline-none"
      >
          {/* 
            THE FIX: We map directly through the 'sessions' state 
            which was populated by your useEffect Hook 
          */}
          {sessions.length > 0 ? (
              sessions.map(year => (
                  <option key={year} value={year}>
                      {year === settings?.currentAcademicYear ? `Current (${year})` : `Session ${year}`}
                  </option>
              ))
          ) : (
              /* Fallback if API hasn't responded yet */
              <option value={settings?.currentAcademicYear}>
                  {settings?.currentAcademicYear} (Loading...)
              </option>
          )}
      </select>
    </div>

      {/* 3. Filter Controls */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <select className="h-12 bg-gray-50 rounded-xl px-4 font-bold outline-none" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
           <option value="">Select Class...</option>
           {classes.map(c => <option key={c._id} value={c._id}>Grade {c.className}</option>)}
        </select>
        <select 
          className="h-12 bg-gray-50 rounded-xl px-4 font-bold outline-none disabled:opacity-50" 
          value={selectedExam} 
          onChange={(e) => setSelectedExam(e.target.value)}
          disabled={loading || !viewYear}
        >
          {loading ? (
              <option>Loading Exams...</option>
          ) : exams.length > 0 ? (
              <>
                <option value="">Select Exam...</option>
                {exams.map(e => <option key={e._id} value={e._id}>{e.examName}</option>)}
              </>
          ) : (
              <option value="">No Exams found for {viewYear}</option>
          )}
        </select>
        <button onClick={handleGenerate} className="bg-primary text-white font-black rounded-xl hover:bg-indigo-700 transition-all h-12 uppercase tracking-tight">
           Show Rankings
        </button>
      </div>

      {/* 4. Results Display */}
      {loading ? <div className="py-20"><LoadingSpinner size="lg" /></div> : results.length > 0 ? (
        <div className="space-y-4">
          
          {/* TOP 3 HIGHLIGHT CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {results.slice(0, 3).map((student, idx) => (
              <Card key={student._id} className={`text-center border-b-4 ${idx === 0 ? 'border-b-yellow-400' : idx === 1 ? 'border-b-slate-400' : 'border-b-orange-400'}`}>
                <div className="flex flex-col items-center py-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${idx === 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-500'}`}>
                    {idx === 0 ? <Trophy size={24} /> : <Medal size={24} />}
                  </div>
                  <p className="text-[10px] font-black uppercase text-gray-400">Rank {student.rank}</p>
                  <h3 className="text-lg font-black text-gray-900">{student.name}</h3>
                  <p className="text-2xl font-black text-primary">{student.percentage}%</p>
                </div>
              </Card>
            ))}
          </div>

          {/* FULL LIST TABLE */}
          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
             <table className="w-full text-left">
                <thead className="bg-gray-50 border-b">
                   <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Rank</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Student</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-right">Scores</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                   {results.map((s) => (
                     <tr key={s._id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4"><span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-black">{s.rank}</span></td>
                        <td className="px-6 py-4">
                           <p className="text-sm font-bold text-gray-800">{s.name}</p>
                           <p className="text-[10px] text-secondary font-medium uppercase">UID: {s.UID}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <p className="text-sm font-black text-primary">{s.percentage}%</p>
                           <p className="text-[10px] text-gray-400 font-bold">{s.totalObtained} / {s.totalMax}</p>
                        </td>
                     </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>
      ) : (
        <div className="py-20 text-center opacity-30">
          <Star size={64} className="mx-auto mb-4" />
          <p className="font-bold text-lg">Select filters to view the classroom leaderboard.</p>
        </div>
      )}
    </div>
  );
};

export default RankList;