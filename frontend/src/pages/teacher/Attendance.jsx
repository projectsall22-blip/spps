import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, XCircle, Clock, Calendar, AlertCircle, Save, ClipboardCheck } from 'lucide-react';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';
import { useSettings } from '../../context/SettingsContext';

const AttendanceMarking = () => {
  const [assignments, setAssignments] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
  const [roster, setRoster] = useState([]);
  const [attendance, setAttendance] = useState({}); // { studentId: "Present" }
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [isAlreadyMarked, setIsAlreadyMarked] = useState(false);
  const { settings } = useSettings();

  const todayStr = new Date().toISOString().split('T')[0];
  const minDate = new Date();
  minDate.setDate(minDate.getDate() - 3);
  const minDateStr = minDate.toISOString().split('T')[0];

  // 1. Fetch Teacher's Classes on load
  useEffect(() => {
    const fetchManagedClasses = async () => {
      try {
        // CHANGED: From '/teacher/my-assignments' to '/teacher/managed-classes'
        const res = await API.get('/teacher/managed-classes');
        setAssignments(res.data); // We can keep the state name 'assignments' or rename to 'managedClasses'
      } catch (err) {
        setToast({ message: "Failed to load managed classes", type: "error" });
      } finally {
        setLoading(false);
      }
    };
    fetchManagedClasses();
  }, []);

  const checkIfAlreadyMarked = async () => {
    if (!selectedClass || !date) return;
    
    // We stop using 'getClassReport' because it's too broad
    try {
      const res = await API.get(`/attendance/check-status`, {
        params: { classId: selectedClass, date: date }
      });
      
      // The backend now returns a simple true/false for THAT specific day
      setIsAlreadyMarked(res.data.isMarked);
      
    } catch (err) {
      console.error("Status check failed");
      setIsAlreadyMarked(false);
    }
  };

// Trigger the check
  useEffect(() => {
    if (selectedClass) {
        checkIfAlreadyMarked();
    } else {
        setIsAlreadyMarked(false); // Reset if no class selected
    }
  }, [selectedClass, date]);


  // 2. Fetch Students when Class changes
  const handleClassChange = async (e) => {
  const classId = e.target.value;
  setSelectedClass(classId);
  if (!classId) return;

  setLoading(true);
  try {
    const res = await API.get(`/teacher/class-roster/${classId}`);
      
      setRoster(res.data.students);
      
      // DEFAULT LOGIC: Initialize all students as 'Present'
      const initialAttendance = {};
      res.data.students.forEach(s => {
        initialAttendance[s._id] = 'Present';
      });
      setAttendance(initialAttendance);

    } catch (err) {
      setToast({ message: "Could not fetch roster", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // 3. Toggle Status Logic
  const toggleStatus = (studentId, status) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  // 4. Submit Attendance Handshake
const handleSubmit = async () => {
  
    setSubmitting(true);
    try {
      const targetClass = assignments.find(c => c._id === selectedClass);
      
      const attendanceData = Object.keys(attendance).map(studentId => ({
        studentId: studentId,
        status: attendance[studentId]
      }));

      await API.post('/attendance/mark', {
        classId: targetClass._id,
        date: date,
        attendanceData: attendanceData,
        academicYear: settings.currentAcademicYear 
      });

      setToast({ message: "Attendance marked successfully!", type: "success" });
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Submit failed";
      setToast({ message: errorMsg, type: "error" });
    } finally {
      setSubmitting(false);
    }
};

  if (loading && assignments.length === 0) return <div className="py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6 pb-24"> {/* Extra padding for sticky button */}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight text-indigo-700">Attendance Marker</h1>
        <p className="text-xs text-secondary font-bold uppercase tracking-widest">Speed Entry Mode</p>
      </div>

      {/* 5. Select Class & Date Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Select Class</label>
          <select 
            className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold text-gray-800 outline-none focus:border-primary"
            onChange={handleClassChange}
            value={selectedClass}
          >
            <option value="">Choose Class...</option>
              {assignments.map(cls => (
                <option key={cls._id} value={cls._id}>Grade Level: {cls.className}</option>
              ))}
            </select>

        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Attendance Date</label>
          <input 
            type="date" 
            className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold text-gray-800 outline-none focus:border-primary"
            value={date}
            min={minDateStr} // Disallows selecting older than 3 days
            max={todayStr}   // Disallows future dates
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        
      </div>
            
      {/* 6. Roster List */}
      {selectedClass ? (
        <div className="space-y-4">
          {isAlreadyMarked && (
            <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-2xl flex items-center gap-3 text-warning mb-6 animate-in fade-in zoom-in-95">
              <AlertCircle size={24} />
              <div>
                <p className="font-black text-sm uppercase">Attendance Already Locked</p>
                <p className="text-xs font-bold opacity-80 uppercase tracking-tighter">
                  Records for this class and date have already been submitted. Overwriting is disabled.
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between px-2">
            
             <p className="text-sm font-bold text-gray-900">Students ({roster.length})</p>
             <button 
               onClick={() => {
                  const allPresent = {};
                  roster.forEach(s => allPresent[s._id] = 'Present');
                  setAttendance(allPresent);
               }}
               className="text-xs font-black text-primary uppercase"
             >
               Reset All to Present
             </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {roster.map((student) => (
              <Card key={student._id} className="p-4 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 font-bold border border-gray-100">
                      {student.UID.slice(-2)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{student.name}</p>
                      <p className="text-[10px] text-secondary font-medium">Adm No: {student.UID}</p>
                    </div>
                  </div>

                  {/* 7. Toggle Actions */}
                  <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
                    <StatusButton 
                      active={attendance[student._id] === 'Present'} 
                      color="success" 
                      onClick={() => toggleStatus(student._id, 'Present')}
                      icon={CheckCircle2}
                    />
                    <StatusButton 
                      active={attendance[student._id] === 'Absent'} 
                      color="danger" 
                      onClick={() => toggleStatus(student._id, 'Absent')}
                      icon={XCircle}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="py-20 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-indigo-50 text-primary rounded-full flex items-center justify-center mb-4">
            <ClipboardCheck size={32} />
          </div>
          <p className="text-secondary font-medium">Please select a class to start marking attendance.</p>
        </div>
      )}

      {/* 8. Sticky Submit Button */}
      {selectedClass && (
        <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-8 md:w-80 z-40">
        <Button 
          fullWidth 
          icon={Save} 
          isLoading={submitting} 
          disabled={isAlreadyMarked} // DISABLES CLICKING IF MARKED
          onClick={handleSubmit}
        >
          {isAlreadyMarked ? "Attendance Locked" : "Save Attendance"}
        </Button>
        </div>
      )}
    </div>
  );
};

// Helper Status Button Component
const StatusButton = ({ active, color, onClick, icon: Icon }) => {
  const colors = {
    success: active ? 'bg-success text-white' : 'text-gray-300 hover:text-success',
    danger: active ? 'bg-danger text-white' : 'text-gray-300 hover:text-danger',
    warning: active ? 'bg-warning text-white' : 'text-gray-300 hover:text-warning',
  };

  return (
    <button 
      onClick={onClick}
      className={`p-2 rounded-lg transition-all duration-200 ${colors[color]}`}
    >
      <Icon size={20} />
    </button>
  );
};

export default AttendanceMarking;
