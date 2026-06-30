import React, { useState, useEffect } from 'react';
import { Save, School, Calendar, ShieldCheck, Info } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Toast from '../../components/common/Toast';

const AdminSettings = () => {
    const { settings, refreshSettings } = useSettings();
    const [formData, setFormData] = useState(settings);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    useEffect(() => { setFormData(settings); }, [settings]);

    const handleSave = async () => {
        setLoading(true);
        try {
            await API.put('/admin/settings', formData);
            await refreshSettings(); // Update global state
            setToast({ message: "System settings updated!", type: "success" });
        } catch (err) {
            setToast({ message: "Failed to save", type: "error" });
        } finally { setLoading(false); }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            {toast && <Toast {...toast} onClose={() => setToast(null)} />}
            
            <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">System Settings</h1>
                <p className="text-sm text-secondary font-medium">Control global configurations and school identity.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. SCHOOL PROFILE */}
                <Card title="School Profile" icon={School}>
                    <div className="space-y-4">
                        <Input label="School Name" value={formData.schoolName} onChange={(e) => setFormData({...formData, schoolName: e.target.value})} />
                        <Input label="Contact Number" value={formData.contactNumber} onChange={(e) => setFormData({...formData, contactNumber: e.target.value})} />
                        <Input 
                            label="School Slogan (Tagline)" 
                            value={formData.schoolSlogan} 
                            onChange={(e) => setFormData({...formData, schoolSlogan: e.target.value})} 
                            />
                            <Input 
                            label="Physical Address" 
                            value={formData.schoolAddress} 
                            onChange={(e) => setFormData({...formData, schoolAddress: e.target.value})} 
                            />
                    </div>
                </Card>

                {/* 2. ACADEMIC CONFIG */}
                {/* 2. ACADEMIC CONFIG */}
                <Card title="Academic Session" icon={Calendar}>
                    <div className="space-y-4">
                        
                        {/* LIVE STATUS DISPLAY (The "Displaying Option") */}
                        <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex justify-between items-center shadow-inner">
                        <div>
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none mb-1">Live Now</p>
                            <p className="text-lg font-black text-gray-900">{settings.currentAcademicYear}</p>
                        </div>
                        <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                        </div>

                        {/* MANUAL ENTRY OPTION */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Change/Update Session</label>
                            <Input 
                                placeholder="e.g. 2026-2027"
                                value={formData.currentAcademicYear}
                                onChange={(e) => setFormData({...formData, currentAcademicYear: e.target.value})}
                                className="font-black text-gray-800"
                            />
                            <p className="text-[9px] text-secondary font-medium ml-1">
                            Type the new year and click "Save System Changes" to update.
                            </p>
                        </div>

                        {/* REGISTRATION TOGGLE */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <span className="text-xs font-bold text-gray-600 uppercase">Admission Portal Open</span>
                        <input 
                            type="checkbox" 
                            checked={formData.isRegistrationOpen} 
                            onChange={(e) => setFormData({...formData, isRegistrationOpen: e.target.checked})}
                            className="w-6 h-6 rounded accent-primary cursor-pointer" 
                        />
                        </div>
                    </div>
                </Card>
            </div>

            <div className="flex justify-end">
                <Button icon={Save} isLoading={loading} onClick={handleSave} className="w-full md:w-auto px-10">
                    Save System Changes
                </Button>
            </div>

            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3">
                <Info className="text-warning shrink-0" />
                <p className="text-[10px] font-bold text-amber-700 uppercase leading-relaxed">
                    Architect Note: Changing the Academic Year will filter all Dashboard data, Attendance, and Marks to only show records for the selected year.
                </p>
            </div>
        </div>
    );
};

export default AdminSettings;