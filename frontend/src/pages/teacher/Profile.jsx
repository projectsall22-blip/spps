import React, { useState, useEffect } from 'react';
import { 
  User, Clock, ShieldCheck, Lock, LogOut, Mail, Phone, 
  Info, Fingerprint, Calendar, Briefcase, MapPin, GraduationCap 
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Toast from '../../components/common/Toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EditableAvatar from '../shared/EditableAvatar';



const TeacherProfile = () => {
  const { user, logout } = useAuth();
  const [agenda, setAgenda] = useState({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
  const newPassword = watch("newPassword");

  useEffect(() => {
    const fetchAgenda = async () => {
      try {
        const res = await API.get('/timetable/teacher-agenda');
        setAgenda(res.data);
      } catch (err) {
        console.error("Failed to load agenda");
      } finally {
        setLoading(false);
      }
    };
    fetchAgenda();
  }, []);

  const onChangePassword = async (data) => {
    setSubmitting(true);
    try {
      await API.put('/users/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });
      setToast({ message: "Password updated successfully!", type: "success" });
      setIsModalOpen(false);
      reset();
    } catch (err) {
      setToast({ message: err.response?.data?.message || "Update failed", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="py-20"><LoadingSpinner size="lg" /></div>;

  const today = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
  const todaysSchedule = agenda[today] || [];

  return (
    <div className="space-y-6 pb-10 max-w-4xl mx-auto">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* 1. TEACHER IDENTITY HEADER */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
        <EditableAvatar currentImage={user.profileImage} />
        <div className="flex-grow">
          <h2 className="text-2xl font-black text-gray-900 leading-tight">{user.name}</h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Official ID: {user.employeeCode}</p>
          <div className="flex justify-center md:justify-start gap-2 mt-3">
             <span className="px-3 py-1 bg-primary text-white text-[10px] font-black rounded-full uppercase tracking-tighter shadow-sm">Faculty Member</span>
             <span className="px-3 py-1 bg-green-50 text-success text-[10px] font-black rounded-full border border-green-100 uppercase tracking-tighter">Status: Active</span>
          </div>
        </div>
      </div>

      {/* 2. EMPLOYMENT DETAILS CARD (THE NEW STUFF) */}
      <Card title="Official Employment Profile" icon={ShieldCheck} noPadding>
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-50">
            
            {/* Left Column */}
            <div className="divide-y divide-gray-50">
               <InfoRow label="Aadhar Number" value={user.aadharNumber} icon={Fingerprint} />
               <InfoRow 
                 label="Date of Joining" 
                 value={user.joiningDate ? new Date(user.joiningDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'} 
                 icon={Calendar} 
               />
               <InfoRow label="Teaching Experience" value={user.experience} icon={Briefcase} />
               <InfoRow label="Mobile Number" value={user.phone} icon={Phone} />
            </div>

            {/* Right Column */}
            <div className="divide-y divide-gray-50 border-t md:border-t-0">
               <InfoRow 
                 label="Date of Birth" 
                 value={user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString('en-GB') : 'N/A'} 
                 icon={User} 
               />
               <InfoRow label="Registered Email" value={user.email || 'No Email Linked'} icon={Mail} />
               <InfoRow label="Highest Qualifications" value={user.qualifications} icon={GraduationCap} />
               <InfoRow label="Residential Address" value={user.address} icon={MapPin} />
            </div>

          </div>
      </Card>

      {/* 3. TODAY'S AGENDA CARD */}
      <Card title="My Teaching Agenda" icon={Clock} subtitle={`Classes for ${today}`}>
        <div className="space-y-3">
          {todaysSchedule.length > 0 ? (
            todaysSchedule.map((period, idx) => (
              <div key={idx} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white transition-colors flex justify-between items-center group">
                 <div>
                    <p className="text-sm font-black text-gray-900 group-hover:text-primary transition-colors">{period.subjectName}</p>
                    <p className="text-[10px] font-bold text-secondary uppercase">Class {period.className} • {period.startTime} - {period.endTime}</p>
                 </div>
                 <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-primary shadow-sm border border-indigo-50 font-black text-xs">
                    {period.periodNumber}
                 </div>
              </div>
            ))
          ) : (
            <div className="py-6 text-center opacity-40">
               <Calendar size={32} className="mx-auto mb-2" />
               <p className="text-xs font-bold uppercase italic">No periods assigned for today.</p>
            </div>
          )}
        </div>
      </Card>

      {/* 4. ACTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button variant="outline" icon={Lock} onClick={() => setIsModalOpen(true)}>Update Login Password</Button>
        <Button variant="danger" icon={LogOut} onClick={logout}>Sign Out from Portal</Button>
      </div>

            <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          reset();
        }} 
        title="Update Account Password"
      >
        <form onSubmit={handleSubmit(onChangePassword)} className="space-y-4">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex gap-3 mb-2">
            <Info size={18} className="text-warning shrink-0" />
            <p className="text-[10px] font-bold text-amber-700 uppercase leading-tight">
              For security, you must enter your current password to authorize this change.
            </p>
          </div>

          <Input 
            label="Current Password" 
            type="password" 
            placeholder="••••••••"
            {...register("currentPassword", { required: "Current password is required" })} 
            error={errors.currentPassword?.message} 
          />

          <Input 
            label="New Password" 
            type="password" 
            placeholder="Minimum 6 characters"
            {...register("newPassword", { 
              required: "New password is required",
              minLength: { value: 6, message: "Too short (min 6)" }
            })} 
            error={errors.newPassword?.message} 
          />

          <Input 
            label="Confirm New Password" 
            type="password" 
            placeholder="Repeat new password"
            {...register("confirmPassword", { 
              validate: (val) => val === newPassword || "Passwords do not match" 
            })} 
            error={errors.confirmPassword?.message} 
          />

          <div className="flex gap-3 pt-2">
             <Button variant="ghost" fullWidth onClick={() => setIsModalOpen(false)}>Cancel</Button>
             <Button type="submit" fullWidth isLoading={submitting}>Update Password</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// HELPER COMPONENT (Ensure this matches the icons and labels)
const InfoRow = ({ label, value, icon: Icon }) => (
  <div className="flex items-center gap-4 p-4 hover:bg-gray-50/50 transition-colors">
    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-300">
      <Icon size={20} />
    </div>
    <div>
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{label}</p>
      <p className="text-sm font-bold text-gray-800">{value || '---'}</p>
    </div>
  </div>
);

export default TeacherProfile;