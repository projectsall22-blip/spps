import React, { useState } from 'react';
import { 
  User, 
  Users, 
  ShieldCheck, 
  Lock, 
  LogOut, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Toast from '../../components/common/Toast';

const StudentProfile = () => {
  const { user, logout } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
  const newPassword = watch("newPassword");

  const onChangePassword = async (data) => {
    setLoading(true);
    try {
      await API.put('/users/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });
      setToast({ message: "Password updated successfully!", type: "success" });
      setIsModalOpen(false);
      reset();
    } catch (err) {
      setToast({ message: err.response?.data?.message || "Failed to update password", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 pb-10">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header ID Card */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col items-center text-center">
          <div className="mb-4">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-indigo-50 rounded-full border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
              {user.profileImage ? (
                <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-black text-primary/30 uppercase">
                  {user.name?.charAt(0)}
                </span>
              )}
            </div>
          </div>
        <h2 className="text-xl font-black text-gray-900">{user.name}</h2>
        <div className="flex gap-2 mt-1">
          <span className="px-3 py-1 bg-primary text-white text-[10px] font-bold uppercase rounded-full">
            Class {user.class}
          </span>
          <span className="px-3 py-1 bg-green-50 text-success text-[10px] font-bold uppercase rounded-full border border-green-100 flex items-center gap-1">
            <CheckCircle size={10} /> Active Student
          </span>
        </div>
      </div>

      {/* Information Sections */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Personal Details */}
        <Card title="Personal Details" icon={User} noPadding>
          <div className="divide-y divide-gray-50">
            <InfoRow label="Admission No." value={user.UID || 'Not Assigned'} icon={ShieldCheck} />
            <InfoRow 
                label="Date of Birth" 
                value={user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString('en-GB') : 'Not Provided'} 
                icon={Calendar} 
            />
            <InfoRow label="Gender" value={user.gender || 'Not Provided'} icon={User} />
            <InfoRow label="Address" value={user.address || 'Not Provided'} icon={MapPin} />
            <InfoRow label="Pincode" value={user.pincode || 'Not Provided'} icon={MapPin} />
            <InfoRow label="Category" value={user.category || 'Not Provided'} icon={User} />
            <InfoRow label="Aadhar Number" value={user.aadharNumber || 'Not Provided'} icon={ShieldCheck} />
            <InfoRow label="PEN No." value={user.penNumber || 'Not Provided'} icon={ShieldCheck} />

          </div>
        </Card>

        {/* Parent & Guardian Details */}
        <Card title="Parent & Contact" icon={Users} noPadding>
          <div className="divide-y divide-gray-50">
            {/* Show Parents if available */}
            {(user.fatherName || user.motherName) && (
              <>
                <InfoRow label="Father's Name" value={user.fatherName || 'Not Provided'} icon={User} />
                <InfoRow label="Father's Mobile" value={user.fatherMobile || 'Not Provided'} icon={Phone} />
                <InfoRow label="Mother's Name" value={user.motherName || 'Not Provided'} icon={User} />
                <InfoRow label="Mother's Mobile" value={user.motherMobile || 'Not Provided'} icon={Phone} />
              </>
            )}
            
            {/* Show Guardian if available */}
            {user.guardianName && (
              <>
                <InfoRow label="Guardian's Name" value={user.guardianName} icon={User} />
                <InfoRow label="Guardian's Mobile" value={user.guardianMobile || 'Not Provided'} icon={Phone} />
              </>
            )}
            
            {/* Email is always shown */}
            <InfoRow label="Email for Comms" value={user.parentEmail || 'Not Provided'} icon={Mail} />
          </div>
        </Card>

        {/* Account Actions */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest ml-1">Account Actions</h3>
          
          <Button 
            fullWidth 
            variant="outline" 
            icon={Lock} 
            onClick={() => setIsModalOpen(true)}
          >
            Change Account Password
          </Button>

          <Button 
            fullWidth 
            variant="danger" 
            icon={LogOut} 
            onClick={logout}
          >
            Logout from System
          </Button>
        </div>
      </div>

      {/* Password Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Update Password">
        <form onSubmit={handleSubmit(onChangePassword)} className="space-y-4">
          <Input label="Current Password" type="password" {...register("currentPassword", { required: "Required" })} error={errors.currentPassword?.message} />
          <Input label="New Password" type="password" {...register("newPassword", { required: "Required", minLength: 6 })} error={errors.newPassword?.message} />
          <Input label="Confirm Password" type="password" {...register("confirmPassword", { validate: v => v === newPassword || "Passwords do not match" })} error={errors.confirmPassword?.message} />
          <Button type="submit" fullWidth isLoading={loading}>Save New Password</Button>
        </form>
      </Modal>
    </div>
  );
};

// Helper Component (Internal)
const InfoRow = ({ label, value, icon: Icon }) => (
  <div className="flex items-center gap-4 p-4">
    <div className="text-gray-400">
      <Icon size={18} />
    </div>
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1">{label}</p>
      <p className="text-sm font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

export default StudentProfile;