import React, { useState, useEffect, useRef } from 'react';
import { Save, School, Calendar, ShieldCheck, Info, Smartphone, QrCode, Upload, X } from 'lucide-react';
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
    const qrInputRef = useRef(null);

    useEffect(() => { setFormData(settings); }, [settings]);

    const handleQrUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 1000000) { setToast({ message: "QR image must be under 1MB", type: "error" }); return; }
        const reader = new FileReader();
        reader.onloadend = () => setFormData(prev => ({ ...prev, upiQrCode: reader.result }));
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await API.put('/admin/settings', formData);
            await refreshSettings();
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

            {/* 3. UPI PAYMENT SETTINGS */}
            <Card title="UPI Payment Settings" icon={Smartphone}>
                <div className="space-y-4">
                    <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100">
                        <p className="text-[10px] font-black text-blue-700 uppercase">Student Fee Payment</p>
                        <p className="text-xs text-blue-600 mt-1">
                            Yahan apna UPI ID aur QR code daalo. Students fee payment ke time yeh dekhenge.
                        </p>
                    </div>

                    <Input
                        label="UPI ID"
                        placeholder="e.g. school@upi or 9876543210@paytm"
                        value={formData.upiId || ''}
                        onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                        icon={Smartphone}
                    />

                    <Input
                        label="Account Name (UPI par dikhne wala naam)"
                        placeholder="e.g. Sardar Patel Public School"
                        value={formData.upiName || ''}
                        onChange={(e) => setFormData({ ...formData, upiName: e.target.value })}
                    />

                    {/* QR Code Upload */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-secondary uppercase">QR Code Image</label>
                        {formData.upiQrCode ? (
                            <div className="flex flex-col items-center gap-3 p-4 bg-gray-50 rounded-2xl border-2 border-green-200">
                                <div className="relative">
                                    <img src={formData.upiQrCode} alt="UPI QR Code"
                                        className="w-40 h-40 object-contain border-2 border-gray-200 rounded-xl" />
                                    <button
                                        onClick={() => setFormData(prev => ({ ...prev, upiQrCode: '' }))}
                                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md">
                                        <X size={12} />
                                    </button>
                                </div>
                                <p className="text-xs text-green-600 font-bold">✅ QR Code uploaded</p>
                                <button onClick={() => qrInputRef.current?.click()}
                                    className="text-xs text-primary font-bold hover:underline">
                                    Change QR Code
                                </button>
                            </div>
                        ) : (
                            <div onClick={() => qrInputRef.current?.click()}
                                className="flex flex-col items-center gap-3 p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 hover:border-primary hover:bg-indigo-50 cursor-pointer transition-all">
                                <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center">
                                    <QrCode size={24} className="text-primary" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-gray-700">Click karke QR Code upload karo</p>
                                    <p className="text-xs text-gray-400 mt-1">PNG, JPG — max 1MB</p>
                                </div>
                            </div>
                        )}
                        <input ref={qrInputRef} type="file" accept="image/*"
                            className="hidden" onChange={handleQrUpload} />
                    </div>

                    {/* Preview */}
                    {(formData.upiId || formData.upiQrCode) && (
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Student ko aise dikhega:</p>
                            <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200">
                                <div>
                                    <p className="text-xs text-slate-400 font-medium">UPI ID</p>
                                    <p className="font-black text-slate-800">{formData.upiId || '—'}</p>
                                </div>
                                <Smartphone size={20} className="text-primary" />
                            </div>
                            {formData.upiQrCode && (
                                <div className="flex justify-center">
                                    <img src={formData.upiQrCode} alt="QR Preview"
                                        className="w-28 h-28 object-contain border-2 border-slate-200 rounded-xl" />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Card>

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