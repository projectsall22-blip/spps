import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Clock, Save, Filter, BookOpen } from 'lucide-react';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Toast from '../../components/common/Toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useSettings } from '../../context/SettingsContext';

const DatesheetBuilder = () => {
    const [exams, setExams] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [selectedExam, setSelectedExam] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const { settings } = useSettings();

    // Form State
    const [formData, setFormData] = useState({
        subjectId: '',
        examDate: '',
        startTime: '',
        endTime: '',
        roomNumber: '',
        instructions: ''
    });

    // Load Initial Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [examRes, classRes] = await Promise.all([
                    API.get(`/admin/exams?status=Scheduled&year=${settings.currentAcademicYear}`),
                    API.get('/admin/classes')
                ]);
                setExams(examRes.data);
                setClasses(classRes.data);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Load Subjects when Class changes
    useEffect(() => {
        if (selectedClass) {
            const cls = classes.find(c => c._id === selectedClass);
            if (cls) {
                API.get(`/admin/subjects/${cls.className}`)
                    .then(res => setSubjects(res.data));
            }
        }
    }, [selectedClass]);

    // Load Existing Entries
    useEffect(() => {
        if (selectedExam && selectedClass) {
            API.get(`/datesheet/exam/${selectedExam}?classId=${selectedClass}`)
                .then(res => setEntries(res.data));
        }
    }, [selectedExam, selectedClass]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await API.post('/datesheet/create', {
                examId: selectedExam,
                classId: selectedClass,
                ...formData
            });
            setToast({ message: "Entry added!", type: "success" });
            setFormData({ subjectId: '', examDate: '', startTime: '', endTime: '', roomNumber: '', instructions: '' });
            // Refresh
            const res = await API.get(`/datesheet/exam/${selectedExam}?classId=${selectedClass}`);
            setEntries(res.data);
        } catch (err) {
            setToast({ message: err.response?.data?.message || "Failed", type: "error" });
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Remove this entry?")) return;
        try {
            await API.delete(`/datesheet/${id}`);
            setEntries(prev => prev.filter(e => e._id !== id));
            setToast({ message: "Entry removed", type: "success" });
        } catch (err) {
            setToast({ message: "Delete failed", type: "error" });
        }
    };

    // Date Constraints
    const selectedExamObj = exams.find(e => e._id === selectedExam);
    const minDate = selectedExamObj ? new Date(selectedExamObj.startDate).toISOString().split('T')[0] : '';
    const maxDate = selectedExamObj ? new Date(selectedExamObj.endDate).toISOString().split('T')[0] : '';

    if (loading) return <div className="py-20"><LoadingSpinner size="lg" /></div>;

    return (
        <div className="space-y-6">
            {toast && <Toast {...toast} onClose={() => setToast(null)} />}

            <h1 className="text-2xl font-black text-gray-900">Datesheet Builder</h1>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select 
                className="h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold outline-none focus:border-primary"
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
            >
                <option value="">{exams.length > 0 ? "Select Exam..." : "No Scheduled Exams Found"}</option>
                {exams.map(e => <option key={e._id} value={e._id}>{e.examName}</option>)}
            </select>


                <select 
                    className="h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold"
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                >
                    <option value="">Select Class...</option>
                    {classes.map(c => <option key={c._id} value={c._id}>Class {c.className}</option>)}
                </select>
            </div>

            {/* Entry Form */}
            {selectedExam && selectedClass && (
                <Card title="Add Entry">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <select 
                            className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold"
                            value={formData.subjectId}
                            onChange={(e) => setFormData({...formData, subjectId: e.target.value})}
                            required
                        >
                            <option value="">Select Subject...</option>
                            {subjects.map(s => <option key={s._id} value={s._id}>{s.subjectName}</option>)}
                        </select>

                        <input 
                            type="date" 
                            className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold"
                            value={formData.examDate}
                            min={minDate}
                            max={maxDate}
                            onChange={(e) => setFormData({...formData, examDate: e.target.value})}
                            required
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <input type="time" className="h-12 border-2 rounded-xl px-4" value={formData.startTime} onChange={(e) => setFormData({...formData, startTime: e.target.value})} required />
                            <input type="time" className="h-12 border-2 rounded-xl px-4" value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} required />
                        </div>

                        <input type="text" placeholder="Room Number" className="w-full h-12 border-2 rounded-xl px-4" value={formData.roomNumber} onChange={(e) => setFormData({...formData, roomNumber: e.target.value})} />

                        <Button type="submit" fullWidth icon={Plus}>Add to Schedule</Button>
                    </form>
                </Card>
            )}

            {/* Existing Entries */}
            {entries.length > 0 && (
                <div className="space-y-3">
                    <h3 className="font-bold">Current Schedule</h3>
                    {entries.map(e => (
                        <Card key={e._id} className="flex items-center justify-between">
                            <div>
                                <p className="font-bold">{e.subjectId.subjectName}</p>
                                <p className="text-xs text-secondary">{new Date(e.examDate).toLocaleDateString()} | {e.startTime} - {e.endTime}</p>
                            </div>
                            <button onClick={() => handleDelete(e._id)} className="text-danger"><Trash2 size={18} /></button>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DatesheetBuilder;