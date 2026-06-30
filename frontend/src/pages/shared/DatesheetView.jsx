import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Filter } from 'lucide-react';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useSettings } from '../../context/SettingsContext';

const DatesheetView = ({ role }) => {
    const [exams, setExams] = useState([]);
    const [classes, setClasses] = useState([]);
    const [selectedExam, setSelectedExam] = useState('');
    const [selectedClass, setSelectedClass] = useState(''); // NEW
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);
    const { settings } = useSettings();

    // Load Exams (and Classes for Teachers)
    useEffect(() => {
        const fetchData = async () => {
            try {
                // ✅ FIXED: Only fetch Scheduled exams
                const examRes = await API.get(`/admin/exams?status=Scheduled&year=${settings.currentAcademicYear}`);
                setExams(examRes.data);
                
                if (examRes.data.length > 0) {
                    setSelectedExam(examRes.data[0]._id);
                }

                // NEW: Fetch classes for teacher filtering
                if (role === 'teacher') {
                    const classRes = await API.get('/admin/classes');
                    setClasses(classRes.data);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [role, settings]);

    // Load Schedule
    useEffect(() => {
        if (!selectedExam) return;

        const fetchSchedule = async () => {
            try {
                if (role === 'student') {
                    // Students see their own class only
                    const res = await API.get(`/datesheet/my-schedule/${selectedExam}`);
                    setSchedule(res.data);
                } else if (role === 'teacher') {
                    // Teachers can filter by class
                    const endpoint = selectedClass 
                        ? `/datesheet/exam/${selectedExam}?classId=${selectedClass}`
                        : `/datesheet/exam/${selectedExam}`;
                    const res = await API.get(endpoint);
                    setSchedule(res.data);
                }
            } catch (err) {
                console.error("Failed to load schedule");
            }
        };

        fetchSchedule();
    }, [selectedExam, selectedClass, role]);

    if (loading) return <div className="py-20"><LoadingSpinner size="lg" /></div>;

    // Empty State
    if (exams.length === 0) {
        return (
            <div className="py-20 text-center">
                <Calendar size={64} className="mx-auto text-gray-200 mb-4" />
                <p className="text-secondary font-medium">No upcoming exams scheduled for {settings.currentAcademicYear}.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-black text-gray-900">Exam Schedule</h1>
                <p className="text-sm text-secondary font-medium">View date sheets for scheduled examinations.</p>
            </div>

            {/* Filters */}
            <div className={`grid grid-cols-1 ${role === 'teacher' ? 'md:grid-cols-2' : ''} gap-4`}>
                {/* Exam Filter */}
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">Select Examination</label>
                    <select 
                        className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold outline-none focus:border-primary"
                        value={selectedExam}
                        onChange={(e) => setSelectedExam(e.target.value)}
                    >
                        {exams.map(e => (
                            <option key={e._id} value={e._id}>{e.examName}</option>
                        ))}
                    </select>
                </div>

                {/* Class Filter (Only for Teachers) */}
                {role === 'teacher' && (
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase ml-1">Filter by Class</label>
                        <select 
                            className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold outline-none focus:border-primary"
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                        >
                            <option value="">All Classes</option>
                            {classes.map(c => (
                                <option key={c._id} value={c._id}>Class {c.className}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Schedule List */}
            <div className="space-y-4">
                {schedule.length > 0 ? (
                    schedule.map((entry, idx) => (
                        <Card 
                            key={entry._id} 
                            className="border-l-4 border-l-primary animate-in fade-in slide-in-from-bottom-2 duration-300"
                            style={{ animationDelay: `${idx * 50}ms` }}
                        >
                            <div className="flex items-start gap-4">
                                {/* Date Badge */}
                                <div className="flex flex-col items-center justify-center w-16 h-16 bg-indigo-50 rounded-2xl shrink-0 border border-indigo-100">
                                    <p className="text-xl font-black text-primary">
                                        {new Date(entry.examDate).getDate()}
                                    </p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">
                                        {new Date(entry.examDate).toLocaleString('default', { month: 'short' })}
                                    </p>
                                </div>

                                {/* Details */}
                                <div className="flex-grow">
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="font-black text-gray-900 text-lg">
                                            {entry.subjectId.subjectName}
                                        </h3>
                                        {/* Show class badge for teachers */}
                                        {role === 'teacher' && entry.classId && (
                                            <span className="px-2 py-1 bg-green-50 text-success text-[10px] font-black rounded uppercase">
                                                Class {entry.classId.className}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-4 text-xs text-secondary font-bold">
                                        <span className="flex items-center gap-1">
                                            <Clock size={14} /> {entry.startTime} - {entry.endTime}
                                        </span>
                                        {entry.roomNumber && entry.roomNumber !== 'TBA' && (
                                            <span className="flex items-center gap-1">
                                                <MapPin size={14} /> Room {entry.roomNumber}
                                            </span>
                                        )}
                                    </div>

                                    {/* Instructions */}
                                    {entry.instructions && (
                                        <p className="text-xs text-secondary mt-2 italic">
                                            "{entry.instructions}"
                                        </p>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))
                ) : (
                    <div className="py-20 text-center opacity-40">
                        <Calendar size={48} className="mx-auto mb-4" />
                        <p className="text-sm font-medium">
                            {role === 'teacher' && selectedClass 
                                ? "No schedule entries for the selected class." 
                                : "Date sheet not yet published for this exam."}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DatesheetView;