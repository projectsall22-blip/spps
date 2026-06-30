import React, { useState, useEffect } from 'react';
import { UserCheck, BookOpen, GraduationCap, Plus, Trash2, Filter, ShieldCheck, Link2, Info, Edit3 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';
import { useSettings } from '../../context/SettingsContext';

const TeacherAssignments = () => {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [viewingClassId, setViewingClassId] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [modalSubjects, setModalSubjects] = useState([]);

  // MODAL STATES
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAsgn, setSelectedAsgn] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [editTeacherId, setEditTeacherId] = useState('');

  const { settings } = useSettings(); 

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm();
  const selectedModalClassId = watch("classId");

  useEffect(() => { fetchBaseData(); }, []);

  const fetchBaseData = async () => {
    try {
      const [clsRes, teaRes] = await Promise.all([
        API.get('/admin/classes'),
        API.get('/admin/teachers?status=active&limit=200&page=1')
      ]);
      setClasses(clsRes.data);
      setTeachers(teaRes.data.teachers);
    } catch (err) { setToast({ message: "Failed to load base data", type: "error" }); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (viewingClassId) fetchAssignments(viewingClassId);
  }, [viewingClassId]);

  const fetchAssignments = async (classId) => {
    setLoading(true);
    try {
      const res = await API.get(`/admin/assignments/class/${classId}`);
      setAssignments(res.data);
    } catch (err) { setToast({ message: "Failed to load assignments", type: "error" }); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (selectedModalClassId) {
      const cls = classes.find(c => c._id === selectedModalClassId);
      if (cls) API.get(`/admin/subjects/${cls.className}`).then(res => setModalSubjects(res.data));
    }
  }, [selectedModalClassId, classes]);

  // --- DELETE LOGIC ---
  const handleRemove = async (id) => {
    if (!window.confirm("Are you sure? The teacher will lose access to this subject instantly.")) return;
    try {
      await API.delete(`/admin/assignments/${id}`);
      setToast({ message: "Assignment removed", type: "success" });
      fetchAssignments(viewingClassId);
    } catch (err) { setToast({ message: "Delete failed", type: "error" }); }
  };

  const handleEditClick = (asgn) => {
    setSelectedAsgn(asgn);
    setEditTeacherId(asgn.teacherId?._id || ""); // Pre-fill with current teacher
    setIsEditModalOpen(true);
  };

  const onUpdateAssignment = async (e) => {
      e.preventDefault(); // Prevent page reload
      
      if (!editTeacherId) {
          setToast({ message: "Please select a teacher", type: "error" });
          return;
      }

      setSubmitting(true);
      try {
        const res = await API.put(`/admin/assignments/${selectedAsgn._id}`, { 
          teacherId: editTeacherId 
        });
        
        setToast({ message: res.data.message || "Teacher updated!", type: "success" });
        setIsEditModalOpen(false);
        fetchAssignments(viewingClassId); // Refresh the list
      } catch (err) {
        setToast({ message: "Update failed", type: "error" });
      } finally {
        setSubmitting(false);
      }
  };

  const onAssign = async (data) => {
    setSubmitting(true);
    try {
      await API.post('/admin/assignments', data);
      setToast({ message: "Teacher assigned!", type: "success" });
      setIsModalOpen(false);
      reset();
      if (viewingClassId === data.classId) fetchAssignments(viewingClassId);
    } catch (err) { setToast({ message: "Duplicate link detected", type: "error" }); }
    finally { setSubmitting(false); }
  };

  if (loading && classes.length === 0) return <div className="py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight text-indigo-700">Faculty Matrix</h1>
          <p className="text-sm text-secondary font-medium">Control which teacher handles which subject.</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsModalOpen(true)}>New Assignment</Button>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
         <div className="w-10 h-10 bg-indigo-50 text-primary rounded-xl flex items-center justify-center shrink-0"><Filter size={20} /></div>
         <select className="flex-grow h-12 bg-transparent font-bold text-gray-800 outline-none" value={viewingClassId} onChange={(e) => setViewingClassId(e.target.value)}>
           <option value="">Filter by Class...</option>
           {classes.map(c => <option key={c._id} value={c._id}>Grade Level: {c.className}</option>)}
         </select>
      </div>

      {/* ASSIGNMENT GRID */}
      {viewingClassId ? (
        <div className="space-y-4">
          <p className="text-xs font-black text-gray-400 uppercase ml-1">Current Matrix: Class {classes.find(c => c._id === viewingClassId)?.className}</p>
          {assignments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignments.map((asgn) => (
                <Card key={asgn._id} className="border-l-4 border-l-success group hover:border-l-primary transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-50 text-success rounded-2xl flex items-center justify-center"><ShieldCheck size={24} /></div>
                      <div>
                        <h3 className="text-lg font-black text-gray-900">{asgn.subjectId?.subjectName}</h3>
                        <p className="text-xs font-bold text-secondary">{asgn.teacherId?.name}</p>
                      </div>
                    </div>
                    {/* ACTION BUTTONS (FIXED) */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEditClick(asgn)} className="p-2 text-warning hover:bg-amber-50 rounded-lg"><Edit3 size={16}/></button>
                        <button onClick={() => handleRemove(asgn._id)} className="p-2 text-danger hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center bg-gray-50/50 rounded-3xl border-2 border-dashed"><p className="text-secondary font-medium">No subjects assigned yet.</p></div>
          )}
        </div>
      ) : (
        <div className="py-20 text-center opacity-30"><BookOpen size={64} className="mx-auto mb-4" /><p className="font-bold">Choose a grade to manage faculty.</p></div>
      )}

      {/* MODAL 1: NEW ASSIGNMENT */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Faculty Assignment">
        <form onSubmit={handleSubmit(onAssign)} className="space-y-5">
          <select className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold" {...register("classId", { required: true })}><option value="">Choose Class...</option>{classes.map(c => <option key={c._id} value={c._id}>Class {c.className}</option>)}</select>
          <select disabled={!selectedModalClassId} className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold disabled:opacity-40" {...register("subjectId", { required: true })}><option value="">Select Subject...</option>{modalSubjects.map(s => <option key={s._id} value={s._id}>{s.subjectName}</option>)}</select>
          <select className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold" {...register("teacherId", { required: true })}><option value="">Select Teacher...</option>{teachers.map(t => <option key={t._id} value={t._id}>{t.name} ({t.employeeCode})</option>)}</select>
          <Button type="submit" fullWidth isLoading={submitting} icon={UserCheck}>Create Link</Button>
        </form>
      </Modal>

      {/* MODAL 2: EDIT (SWAP TEACHER) */}
      {/* MODAL 2: EDIT (REPLACED THE FORM LOGIC) */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Switch Faculty Member">
        {selectedAsgn && (
            <form onSubmit={onUpdateAssignment} className="space-y-6">
                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <p className="text-xs font-black text-primary uppercase">Subject: {selectedAsgn.subjectId?.subjectName}</p>
                    <p className="text-[10px] text-secondary font-bold">Currently Taught by: {selectedAsgn.teacherId?.name}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">Assign New Teacher</label>
                  <select 
                    className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold outline-none focus:border-primary"
                    value={editTeacherId}
                    onChange={(e) => setEditTeacherId(e.target.value)}
                    required
                  >
                      <option value="">Choose Teacher...</option>
                      {teachers.map(t => <option key={t._id} value={t._id}>{t.name} ({t.employeeCode})</option>)}
                  </select>
                </div>

                <Button type="submit" fullWidth isLoading={submitting}>Confirm Swap</Button>
            </form>
        )}
      </Modal>
    </div>
  );
};

export default TeacherAssignments;
