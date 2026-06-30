import React, { useState, useEffect } from 'react';
import { Trophy, AlertTriangle, Save } from 'lucide-react';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';
import { useSettings } from '../../context/SettingsContext';

const MarksEntry = () => {
  const [exams, setExams] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedAsgn, setSelectedAsgn] = useState('');
  const [roster, setRoster] = useState([]);
  const [marksData, setMarksData] = useState({}); 
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const { settings } = useSettings();
  const [lockStatus, setLockStatus] = useState({ isLocked: false, daysRemaining: 7 });

  // 1. Initial Load: Exams and Assignments
  useEffect(() => {
    const fetchInitialData = async () => {
  try {
    const [examRes, asgnRes] = await Promise.all([
      // ADDED /admin prefix to match the backend router
      API.get(`/admin/exams?status=Ongoing&year=${settings.currentAcademicYear}`), 
      API.get('/teacher/my-assignments')
    ]);
    
    setExams(examRes.data);
    setAssignments(asgnRes.data.assignments);
  } catch (err) {
    // This will now only trigger if there is a real server error
    setToast({ message: "Failed to load entry requirements", type: "error" });
  } finally {
    setLoading(false);
  }
};


    fetchInitialData();
  }, []);

  // 2. Fetch Roster when Selection Changes
useEffect(() => {
    // 1. HARD GUARD: Do nothing if selections aren't made or settings aren't ready
    if (!selectedAsgn || !selectedExam || !settings?.currentAcademicYear) {
        return; 
    }

    const loadPageData = async () => {
        // Find the current assignment details
        const asgn = assignments.find(a => a._id === selectedAsgn);
        
        // 2. SOFT GUARD: If asgn isn't in the list yet, wait for next render
        if (!asgn || !asgn.subjectId?._id || !asgn.classId?._id) return;

        // 3. START LOADING only after we are sure we have the IDs
        setLoading(true);

        try {
            // 4. Run both API calls in parallel for better performance
            const [rosterRes, lockRes] = await Promise.all([
                API.get(`/marks/roster/${selectedExam}/${asgn.subjectId._id}/${asgn.classId._id}`),
                API.get(`/marks/check-lock/${selectedExam}/${asgn.subjectId._id}/${asgn.classId._id}`)
            ]);

            // 5. UPDATE ALL STATES AT ONCE
            setRoster(rosterRes.data);
            setLockStatus(lockRes.data);

            // Pre-fill the marks memory
            const initialMarks = {};
            rosterRes.data.forEach(item => {
                initialMarks[item._id] = { 
                    marksObtained: item.savedMarks,
                    remarks: item.savedRemarks 
                };
            });
            setMarksData(initialMarks);

        } catch (err) {
            console.error("Data Load Error:", err);
            setToast({ message: "Error synchronization failed", type: "error" });
        } finally {
            // 6. ALWAYS close the loading state
            setLoading(false);
        }
    };

    loadPageData();

}, [selectedAsgn, selectedExam, settings, assignments]); 

  // 3. Dynamic Grading Logic
  const calculateGrade = (obtained, maxMarks) => {
    if (obtained === '' || obtained === null || obtained === undefined) return '-';
    const percentage = (Number(obtained) / Number(maxMarks)) * 100;

    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    if (percentage >= 33) return 'E';
    return 'F';
  };

  const handleMarkChange = (studentId, value, maxLimit) => {
    const numValue = value === '' ? '' : Number(value);
    if (numValue > maxLimit) {
      setToast({ message: `Marks cannot exceed ${maxLimit}`, type: "error" });
      return;
    }
    setMarksData(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], marksObtained: numValue }
    }));
  };

  const handleSubmit = async () => {
    const asgn = assignments.find(a => a._id === selectedAsgn);
    const currentExam = exams.find(e => e._id === selectedExam);

    // Get subject-wise max marks
    const subjectId = asgn?.subjectId?._id;
    const subjectMaxMarksMap = currentExam?.subjectMaxMarks || {};
    const specificMax = subjectId && subjectMaxMarksMap[subjectId]
      ? Number(subjectMaxMarksMap[subjectId])
      : null;
    const finalMax = specificMax || currentExam?.defaultMaxMarks || currentExam?.maxMarks || 100;

    const formattedData = roster.map(s => ({
      studentId: s._id,
      marksObtained: marksData[s._id].marksObtained || 0,
      maxMarks: finalMax,
      remarks: marksData[s._id].remarks
    }));

    setSubmitting(true);
    try {
      await API.post('/marks/bulk-enter', {
        examId: selectedExam,
        subjectId: asgn.subjectId._id,
        classId: asgn.classId._id,
        academicYear: settings.currentAcademicYear,
        marksData: formattedData
      });
      setToast({ message: "Marks saved successfully!", type: "success" });
    } catch (err) {
      setToast({ message: err.response?.data?.message || "Submit failed", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && roster.length === 0) return <div className="py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6 pb-24">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight text-indigo-700">Exam Marks Entry</h1>
        <p className="text-xs text-secondary font-bold uppercase tracking-widest">Accuracy is Priority</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <select 
        className="h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold text-gray-800 outline-none focus:border-primary disabled:opacity-50 transition-all"
        value={selectedExam}
        onChange={(e) => setSelectedExam(e.target.value)}
        // Disable the dropdown while the system is fetching data
        disabled={loading || !settings?.currentAcademicYear}
      >
        {loading ? (
          <option>Synchronizing with Server...</option>
        ) : exams.length === 0 ? (
          <option>No Ongoing Exams for {settings.currentAcademicYear}</option>
        ) : (
          <>
            <option value="">Select Exam Event...</option>
            {exams.map(e => (
              <option key={e._id} value={e._id}>{e.examName}</option>
            ))}
          </>
        )}
      </select>

        <select 
          className="h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold text-gray-800 outline-none focus:border-primary"
          value={selectedAsgn}
          onChange={(e) => setSelectedAsgn(e.target.value)}
        >
          <option value="">Select Class/Subject...</option>
          {assignments.map(a => <option key={a._id} value={a._id}>{a.classId.className} - {a.subjectId.subjectName}</option>)}
        </select>
      </div>

{roster.length > 0 ? (
  <div className="space-y-4">
    
    {/* --- DYNAMIC WARNING BLOCK STARTS HERE --- */}
    <div className={`p-4 rounded-2xl border flex items-start gap-3 transition-all duration-500 ${
      lockStatus.isLocked 
        ? 'bg-red-50 border-red-200 text-danger animate-pulse' 
        : 'bg-amber-50 border-amber-100 text-warning'
    }`}>
      <AlertTriangle size={20} className="shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-black uppercase tracking-widest">
          {lockStatus.isLocked ? "ACCESS EXPIRED" : "TIME-SENSITIVE ENTRY"}
        </p>
        
        <p className="text-[11px] font-bold opacity-90 uppercase leading-relaxed">
          {!lockStatus.exists 
            ? "ATTENTION: Once you submit these marks for the first time, a 7-day editing window will begin." 
            : lockStatus.isLocked 
              ? "This entry was finalized more than 7 days ago. Editing is now disabled. Contact Admin to unlock." 
              : `Warning: You have ${lockStatus.daysRemaining} days left to make any corrections to these marks.`}
        </p>
      </div>
    </div>
    {/* --- DYNAMIC WARNING BLOCK ENDS HERE --- */}

    <div className="grid grid-cols-1 gap-3">
      {roster.map((student) => {
        const currentExam = exams.find(e => e._id === selectedExam);
        const asgn = assignments.find(a => a._id === selectedAsgn);
        const subjectId = asgn?.subjectId?._id;
        const subjectMaxMap = currentExam?.subjectMaxMarks || {};
        const specificMax = subjectId && subjectMaxMap[subjectId]
          ? Number(subjectMaxMap[subjectId]) : null;
        const max = specificMax || currentExam?.defaultMaxMarks || currentExam?.maxMarks || 100;
        const grade = calculateGrade(marksData[student._id]?.marksObtained, max);

        return (
          <Card key={student._id} className={`p-4 ${lockStatus.isLocked ? 'opacity-75 grayscale-[0.5]' : ''}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-[120px]">
                <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-[10px] font-black text-gray-400 border border-gray-100">
                  {student.UID?.slice(-3) || '000'}
                </div>
                <p className="text-sm font-bold text-gray-900">{student.name}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-20">
                  <input 
                    type="number" 
                    placeholder="Marks"
                    disabled={lockStatus.isLocked}
                    className={`w-full h-10 border-2 rounded-lg text-center font-black outline-none transition-all ${
                        lockStatus.isLocked 
                        ? 'bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed' 
                        : marksData[student._id]?.marksObtained !== '' 
                          ? 'bg-green-50/50 border-green-200 text-success focus:border-primary' 
                          : 'bg-gray-50 border-gray-100 text-primary focus:border-primary'
                    }`}
                    value={marksData[student._id]?.marksObtained}
                    onChange={(e) => handleMarkChange(student._id, e.target.value, max)}
                  />
                </div>
                <span className="text-[10px] font-bold text-gray-400">/ {max}</span>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-xs ${
                  grade === 'F' ? 'bg-red-50 text-danger' : 'bg-green-50 text-success'
                }`}>
                  {grade}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  </div>
) : (
  <div className="py-20 text-center flex flex-col items-center opacity-40">
     <Trophy size={48} className="mb-4" />
     <p className="text-sm font-medium">Select both Exam and Class to start entry.</p>
  </div>
)}

      {roster.length > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-8 md:w-80 z-40">
        <Button 
          fullWidth 
          icon={Save} 
          isLoading={submitting} 
          onClick={handleSubmit}
          disabled={lockStatus.isLocked} 
        >
          {lockStatus.isLocked ? "Records Locked" : "Submit Final Marks"}
        </Button>
        </div>
      )}
    </div>
  );
};

export default MarksEntry;