import React, { useState, useEffect } from 'react';
import { UserCheck, UserX, Clock, Phone, ShieldAlert, Key, Hash, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';

const PendingStudents = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Approval Form State
  const [approvalData, setApprovalData] = useState({ UID: '', password: '' });

  // 1. Fetch Pending Applications
  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      const res = await API.get('/admin/pending-students');
      setApplications(res.data);
    } catch (err) {
      setToast({ message: "Failed to load applications", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // 2. Open Approval Modal
  const openApproval = (student) => {
    setSelectedStudent(student);
    // Suggest a default password to save admin time
    setApprovalData({ UID: '', password: 'Student@123' }); 
    setIsModalOpen(true);
  };

  // 3. Submit Approval Handshake
  const handleApprove = async () => {
    if (!approvalData.UID || !approvalData.password) {
      setToast({ message: "UID and Password are required", type: "error" });
      return;
    }

    setSubmitting(true);
    try {
      await API.put(`/admin/approve-student/${selectedStudent._id}`, approvalData);
      
      setToast({ message: `Student ${selectedStudent.name} approved!`, type: "success" });
      setIsModalOpen(false);
      // Remove the approved student from the UI list
      setApplications(prev => prev.filter(s => s._id !== selectedStudent._id));
    } catch (err) {
      setToast({ message: err.response?.data?.message || "Approval failed", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/dashboard')} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Pending Admissions</h1>
      </div>

      {applications.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {applications.map((student) => (
            <Card key={student._id} className="relative overflow-hidden border-l-4 border-l-warning">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-black text-gray-900">{student.name}</h3>
                  <p className="text-xs font-bold text-primary uppercase">Applying for Class {student.class}</p>
                </div>
                <div className="bg-amber-50 text-warning p-2 rounded-xl">
                  <Clock size={18} />
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm text-secondary font-medium">
                   <Phone size={14} />
                   <span>
                    {student.fatherMobile || student.motherMobile || student.guardianMobile || 'No contact provided'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-gray-400">
                   <Clock size={14} /> Applied: {new Date(student.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div className="flex gap-2">
                <Button fullWidth size="sm" icon={UserCheck} onClick={() => openApproval(student)}>
                  Review & Approve
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center flex flex-col items-center opacity-40">
           <ShieldAlert size={48} className="mb-4" />
           <p className="text-sm font-medium">No pending applications to review.</p>
        </div>
      )}

      {/* 4. Approval Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Assign Credentials"
        footer={
          <div className="flex gap-3 w-full">
            <Button variant="ghost" fullWidth onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button fullWidth isLoading={submitting} onClick={handleApprove}>Confirm Approval</Button>
          </div>
        }
      >
        <div className="space-y-4">
           <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
              <p className="text-xs font-bold text-primary uppercase mb-1">Student Selected</p>
              <p className="text-sm font-black text-gray-800">{selectedStudent?.name}</p>
              <p className="text-[10px] text-secondary font-medium">Class {selectedStudent?.class}</p>
           </div>

           <Input 
             label="Assign UID" 
             icon={Hash} 
             placeholder="e.g. 2024001" 
             value={approvalData.UID}
             onChange={(e) => setApprovalData({...approvalData, UID: e.target.value})}
           />

           <Input 
             label="Temporary Password" 
             icon={Key} 
             placeholder="Student@123" 
             value={approvalData.password}
             onChange={(e) => setApprovalData({...approvalData, password: e.target.value})}
           />

           <p className="text-[10px] text-secondary leading-relaxed italic">
             Note: Once approved, the student can use these credentials to log in. They will be prompted to change their password on first login.
           </p>
        </div>
      </Modal>
    </div>
  );
};

export default PendingStudents;