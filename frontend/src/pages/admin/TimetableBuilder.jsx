import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Plus, 
  Trash2, 
  Save, 
  Calendar, 
  Filter, 
  BookOpen, 
  GraduationCap, 
  AlertCircle, 
  CheckCircle2, 
  Edit3,
  LayoutGrid
} from 'lucide-react';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';
import { useSettings } from '../../context/SettingsContext';

const TimetableBuilder = () => {
  // --- INFRASTRUCTURE STATE ---
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]); // Master list
  const [subjects, setSubjects] = useState([]); // Filtered list for the selected class
  const [classAssignments, setClassAssignments] = useState([]); // Faculty Matrix links

  // --- SELECTION STATE ---
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDay, setSelectedDay] = useState('Monday');
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // --- DATA STATE ---
  const [periods, setPeriods] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const { settings } = useSettings();

  // 1. INITIAL LOAD: Fetch master data
  useEffect(() => {
    const fetchBaseData = async () => {
      try {
        const [clsRes, teaRes] = await Promise.all([
          API.get('/admin/classes'),
          API.get('/admin/teachers?status=active&limit=200&page=1')
        ]);
        setClasses(clsRes.data);
        setTeachers(teaRes.data.teachers);
      } catch (err) {
        setToast({ message: "Failed to load base data", type: "error" });
      } finally {
        setLoading(false);
      }
    };
    fetchBaseData();
  }, []);

  // 2. CLASS CHANGE LOGIC: Fetch Faculty Matrix (Contextual Filter)
  const handleClassChange = async (classId) => {
    setSelectedClass(classId);
    if (!classId) return;

    setLoading(true);
    try {
      const cls = classes.find(c => c._id === classId);
      // Fetch who teaches what in THIS class
      const res = await API.get(`/admin/assignments/class/${classId}`);
      setClassAssignments(res.data);
      
      // Extract only subjects that have an assigned teacher in this class
      const uniqueSubjects = [];
      const seen = new Set();
      res.data.forEach(item => {
        if (!seen.has(item.subjectId._id)) {
          seen.add(item.subjectId._id);
          uniqueSubjects.push(item.subjectId);
        }
      });
      setSubjects(uniqueSubjects);
    } catch (err) {
      setToast({ message: "Failed to load class matrix", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // 3. AUTO-LOAD LOGIC: Fetch existing schedule whenever Class or Day switches
  useEffect(() => {
    if (selectedClass && selectedDay) {
      fetchExistingSchedule(selectedClass, selectedDay);
    }
  }, [selectedClass, selectedDay]);

  const fetchExistingSchedule = async (classId, day) => {
    try {
      const res = await API.get(`/timetable/admin/fetch`, {
        params: { classId, day, academicYear: settings.currentAcademicYear }
      });

      if (res.data && res.data.periods && res.data.periods.length > 0) {
        const formattedPeriods = res.data.periods.map(p => ({
          ...p,
          subjectId: p.subjectId?._id || p.subjectId,
          teacherId: p.teacherId?._id || p.teacherId,
          isEditing: false // Every existing row starts LOCKED (Read-Only)
        }));
        setPeriods(formattedPeriods);
      } else {
        setPeriods([]); // Clear if no schedule exists for this day
      }
    } catch (err) {
      console.error("Load error", err);
    }
  };

  // 4. GRID MANAGEMENT LOGIC
  const addPeriod = () => {
    const lastPeriod = periods[periods.length - 1];
    let nextStartTime = "08:00";
    
    if (lastPeriod) {
      const [h, m] = lastPeriod.endTime.split(':').map(Number);
      const nextTotal = (h * 60 + m + 5);
      const newH = Math.floor(nextTotal / 60).toString().padStart(2, '0');
      const newM = (nextTotal % 60).toString().padStart(2, '0');
      nextStartTime = `${newH}:${newM}`;
    }

    setPeriods([...periods, {
      periodNumber: periods.length + 1,
      startTime: nextStartTime,
      endTime: "",
      subjectId: "",
      teacherId: "",
      periodType: "Class",
      isEditing: true // New rows start UNLOCKED
    }]);
  };

  const toggleEdit = (index) => {
    const newPeriods = [...periods];
    newPeriods[index].isEditing = !newPeriods[index].isEditing;
    setPeriods(newPeriods);
  };

  const removePeriod = (index) => {
    setPeriods(periods.filter((_, i) => i !== index));
  };

  const updatePeriod = (index, field, value) => {
    const newPeriods = [...periods];
    newPeriods[index][field] = value;
    setPeriods(newPeriods);
  };

  // 5. SAVE LOGIC
  const onSave = async () => {
    if (!selectedClass || periods.length === 0) {
      setToast({ message: "Select a class and add periods first", type: "error" });
      return;
    }

    setSubmitting(true);
    try {

    const cleanedPeriods = periods.map(p => ({
        ...p,
        // For Break/Assembly/Other: send null instead of empty string to avoid backend cast error
        subjectId: p.periodType === 'Class' ? (p.subjectId || null) : null,
        teacherId: p.periodType === 'Class' ? (p.teacherId || null) : null,
        // If endTime is placeholder "--:--", send empty string so backend handles it
        endTime: (p.endTime === '--:--' || !p.endTime) ? '' : p.endTime,
    }));
    await API.post('/timetable/save', {
        classId: selectedClass,
        day: selectedDay,
        periods: cleanedPeriods,
        academicYear: settings.currentAcademicYear
    });
      setToast({ message: `Timetable for ${selectedDay} saved successfully!`, type: "success" });
      fetchExistingSchedule(selectedClass, selectedDay); // Re-fetch to lock all rows
    } catch (err) {
      setToast({ message: err.response?.data?.message || "Conflict Detected", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && classes.length === 0) return <div className="py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6 pb-24">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight text-indigo-700">Master Timetable</h1>
        <Button variant="primary" icon={Save} isLoading={submitting} onClick={onSave}>Save Weekday</Button>
      </div>

      {/* Selector Panel */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Target Class</label>
           <select 
             className="w-full h-12 bg-gray-50 border-2 border-transparent focus:border-primary rounded-xl px-4 font-black"
             onChange={(e) => handleClassChange(e.target.value)}
             value={selectedClass}
           >
             <option value="">Choose Class...</option>
             {classes.map(c => <option key={c._id} value={c._id}>Grade {c.className}</option>)}
           </select>
        </div>

        <div className="space-y-2">
           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Working Weekday</label>
           <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {days.map(d => (
                <button key={d} onClick={() => setSelectedDay(d)} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${selectedDay === d ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-secondary'}`}>
                  {d.slice(0, 3)}
                </button>
              ))}
           </div>
        </div>
      </div>

      {/* Dynamic Grid */}
      {selectedClass ? (
        <div className="space-y-4">
           {periods.map((p, index) => (
             <Card key={index} className={`relative transition-all ${p.isEditing ? 'border-primary ring-2 ring-indigo-50' : 'bg-white border-transparent shadow-sm'}`}>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                   
                   {/* Type Selector */}
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase">Period Type</label>
                      {p.isEditing ? (
                        <select className="w-full h-10 bg-gray-50 rounded-lg px-2 text-xs font-bold" value={p.periodType} onChange={(e) => updatePeriod(index, 'periodType', e.target.value)}>
                           <option value="Class">Teaching</option>
                           <option value="Break">Break</option>
                           <option value="Assembly">Assembly</option>
                        </select>
                      ) : (
                        <p className="h-10 flex items-center text-sm font-bold text-gray-700">{p.periodType}</p>
                      )}
                   </div>

                   {/* Time Slots */}
                   <div className="md:col-span-1 grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase">Start</label>
                        {p.isEditing ? (
                          <input type="time" className="w-full h-10 bg-gray-50 rounded-lg px-2 text-xs font-bold" value={p.startTime} onChange={(e) => updatePeriod(index, 'startTime', e.target.value)} />
                        ) : (
                          <p className="h-10 flex items-center text-sm font-black text-primary">{p.startTime}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase">End</label>
                        {p.isEditing ? (
                          <input type="time" className="w-full h-10 bg-gray-50 rounded-lg px-2 text-xs font-bold" value={p.endTime} onChange={(e) => updatePeriod(index, 'endTime', e.target.value)} />
                        ) : (
                          <p className="h-10 flex items-center text-sm font-bold text-gray-500">{p.endTime}</p>
                        )}
                      </div>
                   </div>

                   {/* Contextual Subject Selector */}
                   <div className="md:col-span-1 space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase">Subject</label>
                      {p.isEditing ? (
                        <select disabled={p.periodType !== 'Class'} className="w-full h-10 bg-gray-50 rounded-lg px-2 text-xs font-bold outline-none" value={p.subjectId} onChange={(e) => updatePeriod(index, 'subjectId', e.target.value)}>
                           <option value="">Subject...</option>
                           {subjects.map(s => <option key={s._id} value={s._id}>{s.subjectName}</option>)}
                        </select>
                      ) : (
                        <p className="h-10 flex items-center text-sm font-bold text-gray-800">
                          {subjects.find(s => s._id === p.subjectId)?.subjectName || (p.periodType === 'Class' ? '???' : '---')}
                        </p>
                      )}
                   </div>

                   {/* Contextual Teacher Selector */}
                   <div className="md:col-span-1 space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase">Teacher</label>
                      {p.isEditing ? (
                        <select disabled={p.periodType !== 'Class' || !p.subjectId} className="w-full h-10 bg-gray-50 rounded-lg px-2 text-xs font-bold outline-none" value={p.teacherId} onChange={(e) => updatePeriod(index, 'teacherId', e.target.value)}>
                           <option value="">Teacher...</option>
                           {classAssignments.filter(a => a.subjectId._id === p.subjectId).map(a => (
                             <option key={a.teacherId._id} value={a.teacherId._id}>{a.teacherId.name}</option>
                           ))}
                        </select>
                      ) : (
                        <p className="h-10 flex items-center text-sm font-bold text-gray-800">
                          {teachers.find(t => t._id === p.teacherId)?.name || (p.periodType === 'Class' ? '???' : '---')}
                        </p>
                      )}
                   </div>

                   {/* Row Actions */}
                   <div className="flex gap-2">
                      <button onClick={() => toggleEdit(index)} className={`h-10 flex-1 rounded-lg flex items-center justify-center transition-all ${p.isEditing ? 'bg-success text-white' : 'bg-indigo-50 text-primary hover:bg-primary hover:text-white'}`}>
                        {p.isEditing ? <CheckCircle2 size={18} /> : <Edit3 size={18} />}
                      </button>
                      <button onClick={() => removePeriod(index)} className="h-10 w-10 bg-red-50 text-danger rounded-lg flex items-center justify-center hover:bg-danger hover:text-white"><Trash2 size={18} /></button>
                   </div>
                </div>
             </Card>
           ))}

           <button onClick={addPeriod} className="w-full py-4 border-2 border-dashed border-gray-200 rounded-3xl text-secondary font-bold text-sm flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-all">
             <Plus size={20} /> Add Next Period
           </button>
        </div>
      ) : (
        <div className="py-20 text-center opacity-30">
           <LayoutGrid size={64} className="mx-auto mb-4" />
           <p className="font-bold">Select a classroom above to build the schedule.</p>
        </div>
      )}

      {/* Logic Guard Alert */}
      <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-start gap-3">
         <AlertCircle size={18} className="text-primary shrink-0 mt-0.5" />
         <p className="text-[10px] font-bold text-indigo-700 uppercase leading-relaxed">
           Architect Guard: Edits are local until you click 'Save Weekday'. The system will block you if you try to book a teacher who is already in another classroom at the same time.
         </p>
      </div>
    </div>
  );
};

export default TimetableBuilder;
