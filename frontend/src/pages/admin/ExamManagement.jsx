import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Calendar, Clock, CheckCircle2, Play, Power,
         Trash2, ArrowRight, ShieldCheck, Edit3, BookOpen } from 'lucide-react';
import { useForm } from 'react-hook-form';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';
import { useSettings } from '../../context/SettingsContext';

const EXAM_TYPES = ['Unit Test-I', 'Unit Test-II', 'Final Exam'];

const statusConfig = {
  Scheduled: "bg-blue-50 text-blue-600 border-blue-100",
  Ongoing:   "bg-green-50 text-success border-green-100",
  Completed: "bg-gray-50 text-gray-400 border-gray-100",
  Cancelled: "bg-red-50 text-danger border-red-100"
};

const ExamManagement = () => {
  const [exams, setExams]           = useState([]);
  const [subjects, setSubjects]     = useState([]);   // all subjects
  const [loading, setLoading]       = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMarksOpen, setIsMarksOpen]   = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast]           = useState(null);
  const { settings }                = useSettings();

  // subject-max marks edit state (for the marks modal)
  const [subjectMarks, setSubjectMarks] = useState({});
  const [defaultMax, setDefaultMax]     = useState(100);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get(`/admin/exams?year=${settings.currentAcademicYear}`);
      setExams(res.data);
    } catch { setToast({ message: "Failed to load exams", type: "error" }); }
    finally  { setLoading(false); }
  }, [settings.currentAcademicYear]);

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await API.get('/admin/subjects');
      setSubjects(res.data || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchExams(); fetchSubjects(); }, [fetchExams, fetchSubjects]);

  // ── Create Exam ──
  const onCreateExam = async (data) => {
    setSubmitting(true);
    try {
      await API.post('/admin/exams', { ...data, academicYear: settings.currentAcademicYear });
      setToast({ message: "Exam created!", type: "success" });
      setIsCreateOpen(false);
      reset();
      fetchExams();
    } catch (err) {
      setToast({ message: err.response?.data?.message || "Creation failed", type: "error" });
    } finally { setSubmitting(false); }
  };

  // ── Delete ──
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? All marks will also be deleted.`)) return;
    try {
      await API.delete(`/admin/exams/${id}`);
      setExams(prev => prev.filter(e => e._id !== id));
      setToast({ message: "Exam deleted", type: "success" });
    } catch { setToast({ message: "Delete failed", type: "error" }); }
  };

  // ── Status ──
  const updateStatus = async (examId, newStatus) => {
    try {
      await API.put(`/admin/exams/${examId}/status`, { status: newStatus });
      setToast({ message: `Status → ${newStatus}`, type: "success" });
      fetchExams();
    } catch { setToast({ message: "Status update failed", type: "error" }); }
  };

  // ── Open Subject Marks Modal ──
  const openMarksModal = (exam) => {
    setSelectedExam(exam);
    // Pre-fill from exam.subjectMaxMarks (plain object or Map serialised to object)
    const existing = exam.subjectMaxMarks
      ? (typeof exam.subjectMaxMarks.get === 'function'
          ? Object.fromEntries(exam.subjectMaxMarks)
          : exam.subjectMaxMarks)
      : {};
    setSubjectMarks(existing);
    setDefaultMax(exam.defaultMaxMarks || 100);
    setIsMarksOpen(true);
  };

  // ── Save Subject Marks ──
  const saveSubjectMarks = async () => {
    setSubmitting(true);
    try {
      await API.put(`/admin/exams/${selectedExam._id}/subject-marks`, {
        subjectMaxMarks: subjectMarks,
        defaultMaxMarks: Number(defaultMax)
      });
      setToast({ message: "Max marks saved!", type: "success" });
      setIsMarksOpen(false);
      fetchExams();
    } catch (err) {
      setToast({ message: err.response?.data?.message || "Save failed", type: "error" });
    } finally { setSubmitting(false); }
  };

  if (loading && exams.length === 0) return <div className="py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-indigo-700 tracking-tight">Exam Scheduler</h1>
          <p className="text-sm text-secondary font-medium">Manage exam events and subject-wise max marks.</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsCreateOpen(true)}>
          Create Exam Event
        </Button>
      </div>

      {/* Exam Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exams.length > 0 ? exams.map((exam) => (
          <Card key={exam._id} className="relative overflow-hidden group min-h-[160px]">

            {/* Delete */}
            <button onClick={() => handleDelete(exam._id, exam.examName)}
              className="absolute top-3 left-3 w-8 h-8 flex items-center justify-center text-danger bg-red-50 hover:bg-danger hover:text-white rounded-xl border border-red-100 transition-all opacity-0 group-hover:opacity-100 z-30">
              <Trash2 size={16} />
            </button>

            {/* Status badge */}
            <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-black uppercase border z-20 ${statusConfig[exam.status]}`}>
              {exam.status}
            </div>

            <div className="pt-10 space-y-4">
              {/* Title */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-indigo-50 text-primary rounded-2xl flex items-center justify-center shrink-0 border border-indigo-100">
                  <FileText size={20} />
                </div>
                <div className="pr-16">
                  <h3 className="font-black text-gray-800 text-base">{exam.examName}</h3>
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mt-0.5">{exam.examType}</p>
                </div>
              </div>

              {/* Dates */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100/50">
                <div className="text-center flex-1">
                  <p className="text-[8px] font-black text-gray-400 uppercase">Starts</p>
                  <p className="text-xs font-bold text-gray-700">{new Date(exam.startDate).toLocaleDateString('en-GB')}</p>
                </div>
                <ArrowRight size={14} className="text-gray-300 mx-2" />
                <div className="text-center flex-1">
                  <p className="text-[8px] font-black text-gray-400 uppercase">Ends</p>
                  <p className="text-xs font-bold text-gray-700">{new Date(exam.endDate).toLocaleDateString('en-GB')}</p>
                </div>
              </div>

              {/* Subject max marks summary */}
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-gray-400">
                  Default Max: <span className="text-primary font-black">{exam.defaultMaxMarks || 100}</span>
                  {exam.subjectMaxMarks && Object.keys(exam.subjectMaxMarks).length > 0
                    ? ` • ${Object.keys(exam.subjectMaxMarks).length} subject(s) customised`
                    : ''}
                </p>
                <button onClick={() => openMarksModal(exam)}
                  className="flex items-center gap-1 text-[10px] font-black text-primary bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-100 transition-all">
                  <BookOpen size={12} /> Set Max Marks
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                {exam.status === 'Scheduled' && (
                  <Button fullWidth size="sm" icon={Play} onClick={() => updateStatus(exam._id, 'Ongoing')}>
                    Start Exam
                  </Button>
                )}
                {exam.status === 'Ongoing' && (
                  <Button fullWidth variant="success" size="sm" icon={CheckCircle2} onClick={() => updateStatus(exam._id, 'Completed')}>
                    Close & Finish
                  </Button>
                )}
                {exam.status === 'Completed' && (
                  <div className="flex items-center justify-center w-full gap-2 text-success font-bold text-xs py-2 bg-green-50 rounded-xl">
                    <ShieldCheck size={16} /> Results Published
                  </div>
                )}
              </div>
            </div>
          </Card>
        )) : (
          <div className="col-span-full py-20 text-center opacity-30">
            <Calendar size={64} className="mx-auto mb-4" />
            <p className="font-bold text-lg">No exams scheduled for this session.</p>
          </div>
        )}
      </div>

      {/* ── CREATE EXAM MODAL ── */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="New Exam Event">
        <form onSubmit={handleSubmit(onCreateExam)} className="space-y-5">

          <Input label="Examination Name" placeholder="e.g. Unit Test-I 2025"
            {...register("examName", { required: "Name required" })} error={errors.examName?.message} />

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Exam Type</label>
            <select className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold text-gray-800 outline-none focus:border-primary"
              {...register("examType", { required: true })}>
              {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" {...register("startDate", { required: true })} />
            <Input label="End Date"   type="date" {...register("endDate",   { required: true })} />
          </div>

          <Input label="Default Max Marks (for all subjects)" type="number" placeholder="e.g. 25 or 100"
            {...register("defaultMaxMarks", { required: true, min: 1 })}
            error={errors.defaultMaxMarks?.message} />

          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-xs text-indigo-700 font-medium">
            💡 After creating the exam, use <strong>"Set Max Marks"</strong> button on the exam card to set different max marks per subject.
          </div>

          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3 text-warning">
            <Power size={20} className="shrink-0" />
            <p className="text-[10px] font-bold uppercase leading-relaxed">
              Only "Ongoing" exams are visible to teachers for marks entry.
            </p>
          </div>

          <Button type="submit" fullWidth isLoading={submitting} icon={Plus}>Create Schedule</Button>
        </form>
      </Modal>

      {/* ── SUBJECT MAX MARKS MODAL ── */}
      <Modal isOpen={isMarksOpen} onClose={() => setIsMarksOpen(false)} title={`Set Max Marks — ${selectedExam?.examName || ''}`}>
        <div className="space-y-4">
          <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100">
            <p className="text-xs font-black text-primary uppercase mb-1">Default Max Marks</p>
            <p className="text-[10px] text-gray-500 mb-2">Used for any subject not listed below</p>
            <input type="number" value={defaultMax} onChange={e => setDefaultMax(e.target.value)}
              className="w-full h-11 bg-white border-2 border-indigo-200 rounded-xl px-4 font-black text-lg text-primary outline-none focus:border-primary transition-colors"
              min={1} />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-black text-gray-500 uppercase ml-1">Subject-Wise Max Marks (Optional)</p>
            {subjects.length === 0 && (
              <p className="text-xs text-gray-400 italic px-1">No subjects found. Add subjects first.</p>
            )}
            {subjects.map(sub => (
              <div key={sub._id} className="flex items-center gap-3 p-3 bg-white border-2 border-gray-100 rounded-xl hover:border-indigo-200 transition-all">
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-800">{sub.subjectName}</p>
                  {sub.className && <p className="text-[10px] text-gray-400">Class {sub.className}</p>}
                </div>
                <input
                  type="number"
                  min={1}
                  placeholder={String(defaultMax)}
                  value={subjectMarks[sub._id] || ''}
                  onChange={e => {
                    const val = e.target.value;
                    setSubjectMarks(prev => {
                      const next = { ...prev };
                      if (val === '') delete next[sub._id];
                      else next[sub._id] = Number(val);
                      return next;
                    });
                  }}
                  className="w-20 h-10 bg-gray-50 border-2 border-gray-200 rounded-xl text-center font-black text-sm outline-none focus:border-primary transition-colors"
                />
                <span className="text-[10px] text-gray-400 font-bold w-8 text-right">marks</span>
              </div>
            ))}
          </div>

          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
            <p className="text-[10px] text-amber-700 font-bold">
              Leave a subject blank to use the default max marks ({defaultMax}).
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" fullWidth onClick={() => setIsMarksOpen(false)}>Cancel</Button>
            <Button fullWidth isLoading={submitting} icon={BookOpen} onClick={saveSubjectMarks}>Save Max Marks</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ExamManagement;
