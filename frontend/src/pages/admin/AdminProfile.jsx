import React, { useState } from 'react';
import { User, ShieldCheck, Mail, Lock, LogOut, Phone, Edit3, Fingerprint, Info, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Toast from '../../components/common/Toast';
import EditableAvatar from '../shared/EditableAvatar';

const AdminProfile = () => {
  const { user, updateUser, logout } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // FORM 1: Identity Form
  const { 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm();

  // FORM 2: Password Form (Separated to prevent validation conflicts)
  const { 
    register: registerPass, 
    handleSubmit: handleSubmitPass, 
    reset: resetPass, 
    watch: watchPass, 
    formState: { errors: errorsPass } 
  } = useForm();

  const newPassword = watchPass("newPassword");

  // THE MASTER UPDATE LOGIC
  const onUpdateIdentity = async (data) => {
    console.log("Step 1: Function triggered with data:", data);
    setSubmitting(true);
    try {
      const res = await API.put('/users/update-info', data);
      console.log("Step 2: Backend response received:", res.data);

      if (res.data && res.data.user) {
          updateUser(res.data.user); 
          setToast({ message: "Identity updated successfully!", type: "success" });
          setIsEditModalOpen(false); 
      }
    } catch (err) {
      console.error("Step 3: Error caught:", err);
      const msg = err.response?.data?.message || "Failed to update";
      setToast({ message: msg, type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const onChangePassword = async (data) => {
    console.log("Password Logic Triggered", data);
    setSubmitting(true);
    try {
      await API.put('/users/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });
      setToast({ message: "Password updated successfully!", type: "success" });
      setIsPasswordModalOpen(false);
      resetPass(); // Use the separated reset
    } catch (err) {
      const msg = err.response?.data?.message || "Password change failed";
      setToast({ message: msg, type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 pb-10 max-w-4xl mx-auto">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* HEADER SECTION */}
      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col items-center text-center">
        <EditableAvatar currentImage={user.profileImage} />
        <h2 className="text-2xl font-black text-gray-900 mt-4">{user.name}</h2>
        <span className="px-3 py-1 bg-primary text-white text-[10px] font-bold uppercase rounded-full">Administrator</span>
      </div>

      {/* IDENTITY DETAILS CARD */}
      <Card 
        title="Identity" 
        icon={User} 
        noPadding
        footer={
          <button onClick={() => setIsEditModalOpen(true)} className="p-3 text-xs font-black text-primary uppercase flex items-center gap-2">
            <Edit3 size={14} /> Edit Admin Details
          </button>
        }
      >
        <div className="divide-y divide-gray-50">
          <InfoRow label="Full Name" value={user.name} icon={User} />
          <InfoRow label="Official Email" value={user.email || 'Not Set'} icon={Mail} />
          <InfoRow label="Contact Number" value={user.phone || 'Not Set'} icon={Phone} />
          <InfoRow label="Login Username" value={user.username || 'admin'} icon={Fingerprint} />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button 
            variant="outline" 
            fullWidth 
            icon={Lock} 
            onClick={() => setIsPasswordModalOpen(true)}
          >
            Update Password
          </Button>

          <Button 
            variant="danger" 
            fullWidth 
            icon={LogOut} 
            onClick={logout}
          >
            Logout Account
          </Button>
      </div>

      {/* --- THE EDIT IDENTITY MODAL --- */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Admin Details">
        <form onSubmit={handleSubmit(onUpdateIdentity)} className="space-y-4">
          <Input 
            label="Full Name" 
            defaultValue={user.name} 
            {...register("name", { required: "Name is required" })} 
            error={errors.name?.message} 
          />
          <Input 
            label="Official Email" 
            defaultValue={user.email} 
            {...register("email", { required: "Email is required" })} 
            error={errors.email?.message} 
          />
          <Input 
            label="Contact Number" 
            defaultValue={user.phone} 
            {...register("phone")} 
          />
          
          <div className="flex gap-3 pt-4">
             <Button variant="ghost" fullWidth onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
             <Button type="submit" fullWidth isLoading={submitting}>Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* --- THE PASSWORD MODAL --- */}
      <Modal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} title="Update Admin Password">
      <form onSubmit={handleSubmitPass(onChangePassword)} className="space-y-4">
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex gap-3 mb-2">
            <Info size={18} className="text-warning shrink-0" />
            <p className="text-[10px] font-bold text-amber-700 uppercase leading-tight">
              To verify it's you, please provide your current login password.
            </p>
        </div>

        <Input 
          label="Current Password" 
          type="password" 
          {...registerPass("currentPassword", { required: "Current password is required" })} 
          error={errorsPass.currentPassword?.message} 
        />
        <Input 
          label="New Password" 
          type="password" 
          {...registerPass("newPassword", { 
              required: "Required", 
              minLength: { value: 6, message: "Min 6 characters required" } 
          })} 
          error={errorsPass.newPassword?.message} 
        />
        <Input 
          label="Confirm New Password" 
          type="password" 
          {...registerPass("confirmPassword", { 
            validate: (val) => val === newPassword || "Passwords do not match" 
          })} 
          error={errorsPass.confirmPassword?.message} 
        />

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" fullWidth onClick={() => setIsPasswordModalOpen(false)}>Cancel</Button>
          <Button type="submit" fullWidth isLoading={submitting} icon={CheckCircle}>Confirm Change</Button>
        </div>
      </form>
    </Modal>
    </div>
  );
};

// HELPER COMPONENT
const InfoRow = ({ label, value, icon: Icon }) => (
  <div className="flex items-center gap-4 p-4">
    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-300">
      <Icon size={20} />
    </div>
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{label}</p>
      <p className="text-sm font-black text-gray-800">{value}</p>
    </div>
  </div>
);

export default AdminProfile;
