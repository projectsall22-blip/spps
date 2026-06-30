import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CreditCard, CheckCircle, AlertCircle, Clock, X, Receipt,
  Wallet, BadgeCheck, Banknote, Smartphone, BookOpen, ExternalLink, Copy,
} from 'lucide-react';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const MONTHS = ['April','May','June','July','August','September','October','November','December','January','February','March'];

const modeIcon = (mode) => {
    if (mode === 'UPI' || mode === 'Online') return <Smartphone size={11} />;
    if (mode === 'Cash') return <Banknote size={11} />;
    return <CreditCard size={11} />;
};

const StatusPill = ({ status }) => {
    const cfg = {
        paid:         { cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
        partial:      { cls: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500' },
        pending:      { cls: 'bg-red-100 text-red-600',         dot: 'bg-red-500' },
        pending_upi:  { cls: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500' },
    }[status] || { cls: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {status === 'pending_upi' ? 'Pending Confirmation' : status}
        </span>
    );
};

// ── UPI Pay Modal ─────────────────────────────────────────────────────────────
const UPI_APPS = [
    { name: 'Google Pay',  color: 'from-blue-500 to-blue-600',   scheme: (upiId, amt, note) => `tez://upi/pay?pa=${upiId}&pn=School+Fee&am=${amt}&tn=${encodeURIComponent(note)}&cu=INR` },
    { name: 'PhonePe',     color: 'from-violet-500 to-purple-600', scheme: (upiId, amt, note) => `phonepe://pay?pa=${upiId}&pn=School+Fee&am=${amt}&tn=${encodeURIComponent(note)}&cu=INR` },
    { name: 'Paytm',       color: 'from-sky-400 to-cyan-500',    scheme: (upiId, amt, note) => `paytmmp://pay?pa=${upiId}&pn=School+Fee&am=${amt}&tn=${encodeURIComponent(note)}&cu=INR` },
    { name: 'BHIM / Any',  color: 'from-orange-400 to-amber-500', scheme: (upiId, amt, note) => `upi://pay?pa=${upiId}&pn=School+Fee&am=${amt}&tn=${encodeURIComponent(note)}&cu=INR` },
];

const PayModal = ({ student, academicYear, monthStatus, monthlyFeeAmt, preselectedMonth, onClose, onSuccess }) => {
    const [step, setStep] = useState('months');
    const [selectedMonths, setSelectedMonths] = useState(() =>
        preselectedMonth ? new Set([preselectedMonth]) : new Set()
    );
    const [upiInfo, setUpiInfo] = useState(null);
    const [txnId, setTxnId] = useState('');
    const [paidBy, setPaidBy] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const txnRef = useRef(null);

    const payableMonths = (monthStatus || []).filter(m => !m.isPaid && m.isActive);
    const monthAmounts = {};
    (monthStatus || []).forEach(ms => {
        monthAmounts[ms.month] = ms.isPaid ? 0 : Math.max(0, ms.monthDue - ms.paidAmt) || monthlyFeeAmt || 0;
    });
    const totalSelected = Array.from(selectedMonths).reduce((s, m) => s + (monthAmounts[m] || 0), 0);
    const monthsArr = Array.from(selectedMonths);

    const toggleMonth = (m) => setSelectedMonths(prev => {
        const next = new Set(prev); next.has(m) ? next.delete(m) : next.add(m); return next;
    });

    const copyUpiId = () => {
        if (upiInfo?.upiId) {
            navigator.clipboard.writeText(upiInfo.upiId).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Open UPI app via deep link, then move to txn ID step
    const openUpiApp = (schemeBuilder) => {
        const note = `School Fee - ${student.name} - ${monthsArr.join(',')}`;
        const url = schemeBuilder(upiInfo.upiId, totalSelected.toFixed(2), note);
        window.location.href = url;
        // After a short delay (user returns from UPI app), show txn ID step
        setTimeout(() => setStep('txn'), 1800);
    };

    const goToUpi = async () => {
        if (selectedMonths.size === 0) return setError('Select at least one month');
        setError('');
        try {
            const res = await API.get('/fees/upi/info');
            setUpiInfo(res.data);
            setStep('upi');
        } catch { setError('Could not load UPI details. Contact admin.'); }
    };

    const handleSubmit = async () => {
        if (!txnId.trim()) return setError('Enter the UPI Transaction ID');
        setError(''); setSubmitting(true);
        try {
            await API.post('/fees/upi/submit', {
                studentId: student._id, academicYear,
                months: monthsArr,
                monthAmounts, totalAmount: totalSelected,
                transactionId: txnId.trim(),
                paidBy: paidBy.trim() || student.name,
            });
            setStep('done');
        } catch (err) { setError(err.message || 'Submission failed'); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">

                {/* Header */}
                <div className="bg-primary px-6 pt-5 pb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-300 text-xs">{student.name} · Class {student.class}</p>
                            <p className="text-white font-bold text-2xl mt-0.5">{fmt(totalSelected)}</p>
                            {monthsArr.length > 0 && (
                                <p className="text-blue-200 text-xs mt-0.5">{monthsArr.join(', ')}</p>
                            )}
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                            <X size={16} className="text-white" />
                        </button>
                    </div>
                    {/* Step indicator */}
                    <div className="flex items-center gap-1.5 mt-4">
                        {['months','upi','txn','done'].map((s, i) => (
                            <div key={s} className={`h-1 rounded-full flex-1 transition-all ${
                                ['months','upi','txn','done'].indexOf(step) >= i ? 'bg-white' : 'bg-white/30'
                            }`} />
                        ))}
                    </div>
                </div>

                <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

                    {/* ── STEP 1: Select Months ── */}
                    {step === 'months' && (
                        <>
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Select Months to Pay</p>
                                {payableMonths.length > 0 && (
                                    <button onClick={() => setSelectedMonths(new Set(payableMonths.map(m => m.month)))}
                                        className="text-xs font-bold text-primary hover:underline">Select All Due</button>
                                )}
                            </div>
                            <div className="space-y-2">
                                {(monthStatus || []).filter(ms => ms.isActive || ms.isPaid).map(ms => {
                                    const due = Math.max(0, ms.monthDue - ms.paidAmt);
                                    const isSelected = selectedMonths.has(ms.month);
                                    return (
                                        <button key={ms.month} type="button" disabled={ms.isPaid}
                                            onClick={() => !ms.isPaid && toggleMonth(ms.month)}
                                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${
                                                ms.isPaid ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-100'
                                                : isSelected ? 'border-primary bg-blue-50'
                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                            }`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-slate-300'}`}>
                                                    {isSelected && <CheckCircle size={12} className="text-white" />}
                                                </div>
                                                <p className="text-sm font-semibold text-slate-800">{ms.month}</p>
                                            </div>
                                            {ms.isPaid
                                                ? <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Paid</span>
                                                : <span className={`text-sm font-bold ${ms.isOverdue ? 'text-danger' : 'text-slate-800'}`}>{fmt(due)}</span>
                                            }
                                        </button>
                                    );
                                })}
                            </div>
                            {error && <p className="text-xs text-danger bg-red-50 rounded-xl px-4 py-2">{error}</p>}
                            <button onClick={goToUpi} disabled={selectedMonths.size === 0}
                                className="w-full disabled:opacity-50 bg-primary text-white font-bold rounded-2xl py-3.5 flex items-center justify-center gap-2 text-base">
                                <Smartphone size={18} /> Pay {fmt(totalSelected)} via UPI
                            </button>
                        </>
                    )}

                    {/* ── STEP 2: Choose UPI App ── */}
                    {step === 'upi' && (
                        <>
                            <div className="text-center">
                                <p className="font-black text-slate-800 text-lg">Choose UPI App</p>
                                <p className="text-sm text-slate-500 mt-1">
                                    Tap an app — it will open with <span className="font-bold text-primary">{fmt(totalSelected)}</span> pre-filled
                                </p>
                            </div>

                            {/* UPI App Buttons */}
                            {upiInfo?.upiId ? (
                                <div className="grid grid-cols-2 gap-3">
                                    {UPI_APPS.map(app => (
                                        <button key={app.name} onClick={() => openUpiApp(app.scheme)}
                                            className={`bg-gradient-to-br ${app.color} text-white font-bold rounded-2xl py-4 flex flex-col items-center gap-2 shadow-md hover:shadow-lg hover:scale-[1.03] active:scale-95 transition-all`}>
                                            <ExternalLink size={20} />
                                            <span className="text-sm">{app.name}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-center text-sm text-amber-700">
                                    UPI ID not configured by admin yet. Please pay via QR or contact school.
                                </div>
                            )}

                            {/* UPI ID display + copy */}
                            {upiInfo?.upiId && (
                                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium">UPI ID</p>
                                        <p className="font-black text-slate-800">{upiInfo.upiId}</p>
                                    </div>
                                    <button onClick={copyUpiId}
                                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${copied ? 'bg-emerald-100 text-emerald-700' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                                        <Copy size={12} /> {copied ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                            )}

                            {/* QR fallback */}
                            {upiInfo?.upiQrCode && (
                                <details className="group">
                                    <summary className="text-xs font-bold text-primary cursor-pointer text-center hover:underline">
                                        Show QR Code instead
                                    </summary>
                                    <div className="flex justify-center mt-3">
                                        <img src={upiInfo.upiQrCode} alt="UPI QR" className="w-44 h-44 border-2 border-slate-200 rounded-2xl object-contain" />
                                    </div>
                                </details>
                            )}

                            <div className="flex gap-3 pt-1">
                                <button onClick={() => setStep('months')} className="flex-1 border-2 border-slate-200 text-slate-600 font-semibold rounded-2xl py-3 text-sm hover:bg-slate-50 transition-colors">Back</button>
                                <button onClick={() => setStep('txn')} className="flex-1 bg-slate-100 text-slate-700 font-bold rounded-2xl py-3 text-sm hover:bg-slate-200 transition-colors">
                                    Already Paid? Enter Txn ID ΓåÆ
                                </button>
                            </div>
                        </>
                    )}

                    {/* ── STEP 3: Enter Transaction ID ── */}
                    {step === 'txn' && (
                        <>
                            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-center">
                                <p className="font-bold text-emerald-800">Payment Done?</p>
                                <p className="text-sm text-emerald-600 mt-0.5">Enter the Transaction ID from your UPI app to confirm</p>
                            </div>

                            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 flex items-center justify-between">
                                <span className="text-xs text-blue-500">Amount Paid</span>
                                <span className="font-black text-primary text-lg">{fmt(totalSelected)}</span>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">UPI Transaction ID *</label>
                                <input
                                    ref={txnRef}
                                    autoFocus
                                    value={txnId}
                                    onChange={e => setTxnId(e.target.value)}
                                    placeholder="e.g. 407311258934"
                                    className="w-full border-2 border-slate-200 focus:border-primary rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors font-mono"
                                />
                                <p className="text-xs text-slate-400 mt-1.5">
                                    Find in your UPI app: <span className="font-semibold">Payment History ΓåÆ Transaction Details</span>
                                </p>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Paid By (optional)</label>
                                <input value={paidBy} onChange={e => setPaidBy(e.target.value)} placeholder="Parent / Guardian name"
                                    className="w-full border-2 border-slate-200 focus:border-primary rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors" />
                            </div>

                            {error && <p className="text-xs text-danger bg-red-50 rounded-xl px-4 py-2">{error}</p>}

                            <div className="flex gap-3">
                                <button onClick={() => setStep('upi')} className="flex-1 border-2 border-slate-200 text-slate-600 font-semibold rounded-2xl py-3 text-sm hover:bg-slate-50 transition-colors">Back</button>
                                <button onClick={handleSubmit} disabled={submitting || !txnId.trim()}
                                    className="flex-1 disabled:opacity-50 bg-primary text-white font-bold rounded-2xl py-3 text-sm flex items-center justify-center gap-2">
                                    {submitting ? <><LoadingSpinner size="sm" color="white" /> Submitting...</> : 'Submit'}
                                </button>
                            </div>
                            <p className="text-center text-xs text-slate-400">Admin will verify and confirm within 24 hours</p>
                        </>
                    )}

                    {/* ── STEP 4: Done ── */}
                    {step === 'done' && (
                        <div className="text-center space-y-4 py-4">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                                <BadgeCheck size={32} className="text-emerald-600" />
                            </div>
                            <div>
                                <p className="font-black text-slate-900 text-lg">Submitted!</p>
                                <p className="text-slate-500 text-sm mt-1">Payment is pending admin confirmation.</p>
                                <p className="text-slate-400 text-xs mt-1">You'll see "Pending Confirmation" in history until verified.</p>
                            </div>
                            <button onClick={() => { onSuccess(); onClose(); }}
                                className="w-full bg-primary text-white font-bold rounded-2xl py-3">Done</button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
// ── Due Status Section ────────────────────────────────────────────────────────
const DueStatus = ({ monthStatus, onPayMonth }) => {
    // Show only overdue and active due months (not paid)
    const dueMonths = monthStatus.filter(ms => !ms.isPaid && ms.isActive);

    if (dueMonths.length === 0) return (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
            <BadgeCheck size={32} className="text-emerald-600 mx-auto mb-2" />
            <p className="font-bold text-emerald-800">All Clear!</p>
            <p className="text-sm text-emerald-600 mt-1">No pending dues</p>
        </div>
    );

    return (
        <div className="space-y-3">
            {dueMonths.map((ms) => {
                const { month, monthDue, paidAmt, isOverdue, isPartial, hasExtraFee, extraFees } = ms;
                const remaining = Math.max(0, monthDue - paidAmt);
                
                return (
                    <div key={month} className={`border-2 rounded-2xl p-4 transition-all ${
                        isOverdue 
                            ? 'bg-red-50 border-red-300' 
                            : isPartial 
                            ? 'bg-amber-50 border-amber-200' 
                            : 'bg-blue-50 border-blue-200'
                    }`}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                {isOverdue ? <AlertCircle size={18} className="text-red-600" /> 
                                    : isPartial ? <Clock size={18} className="text-amber-600" />
                                    : <Clock size={18} className="text-blue-600" />}
                                <span className={`font-bold ${
                                    isOverdue ? 'text-red-800' : isPartial ? 'text-amber-800' : 'text-blue-800'
                                }`}>{month}</span>
                            </div>
                            <span className={`text-xs font-black px-2 py-1 rounded-full uppercase ${
                                isOverdue 
                                    ? 'bg-red-100 text-red-700' 
                                    : isPartial 
                                    ? 'bg-amber-100 text-amber-700' 
                                    : 'bg-blue-100 text-blue-700'
                            }`}>
                                {isOverdue ? 'Overdue' : isPartial ? 'Partial' : 'Due'}
                            </span>
                        </div>

                        {hasExtraFee && (
                            <div className="space-y-1 mb-2">
                                {extraFees.map((e, i) => (
                                    <div key={i} className="flex items-center gap-1.5 text-xs text-violet-700">
                                        <BookOpen size={12} className="shrink-0" />
                                        <span className="font-semibold">{e.name}: {fmt(e.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-500 font-medium">Amount Due</p>
                                <p className={`text-xl font-black ${
                                    isOverdue ? 'text-red-700' : isPartial ? 'text-amber-700' : 'text-blue-700'
                                }`}>{fmt(remaining)}</p>
                                {isPartial && <p className="text-xs text-slate-500 mt-0.5">Paid: {fmt(paidAmt)} of {fmt(monthDue)}</p>}
                            </div>
                            <button onClick={() => onPayMonth(month)}
                                className={`text-sm font-bold text-white px-5 py-2.5 rounded-xl transition-all hover:shadow-lg ${isOverdue ? 'bg-danger' : 'bg-primary'}`}>
                                Pay Now
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const StudentFees = () => {
    const { user } = useAuth();
    const { settings } = useSettings();
    const academicYear = settings?.academicYear || settings?.currentAcademicYear || '2025-26';
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [preselectedMonth, setPreselectedMonth] = useState('');
    const [activeTab, setActiveTab] = useState('due');
    const [toast, setToast] = useState(null);

    const fetchFees = useCallback(() => {
        if (!user?._id) return;
        setLoading(true);
        API.get(`/fees/student/${user._id}?academicYear=${academicYear}`)
            .then(r => setData(r.data))
            .catch(() => setToast({ message: 'Could not load fee details', type: 'error' }))
            .finally(() => setLoading(false));
    }, [user, academicYear]);

    useEffect(() => { fetchFees(); }, [fetchFees]);

    const openPayModal = (month = '') => {
        setPreselectedMonth(month);
        setShowModal(true);
    };

    if (loading) return <div className="py-24"><LoadingSpinner size="lg" /></div>;
    if (!data)   return <p className="text-center text-slate-400 p-8">Unable to load fee details.</p>;

    const allClear    = data.structure ? data.totalDue <= 0 : false;
    const overdueCount = (data.monthStatus || []).filter(m => m.isOverdue).length;
    const dueCount = (data.monthStatus || []).filter(m => !m.isPaid && m.isActive).length;

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Hero */}
            <div className="bg-primary rounded-3xl p-6 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1">Fee Portal · {academicYear}</p>
                        <h1 className="text-white text-2xl font-black">{data.student.name}</h1>
                        <p className="text-indigo-200 text-sm mt-0.5">Class {data.student.class}</p>
                    </div>
                    {allClear
                        ? <span className="flex items-center gap-1.5 bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/30"><BadgeCheck size={13} /> All Clear</span>
                        : overdueCount > 0
                        ? <span className="flex items-center gap-1.5 bg-red-400/30 text-red-200 text-xs font-bold px-3 py-1.5 rounded-full border border-red-400/30 animate-pulse"><AlertCircle size={13} /> {overdueCount} Overdue</span>
                        : null
                    }
                </div>
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-slate-100">
                {[
                    ['due', `Due${dueCount > 0 ? ` (${dueCount})` : ''}`],
                    ['history', 'Payment History']
                ].map(([key, label]) => (
                    <button key={key} onClick={() => setActiveTab(key)}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === key ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        {label}
                    </button>
                ))}
            </div>

            {/* Due Tab */}
            {activeTab === 'due' && (
                <Card title="Fee Due Status" icon={AlertCircle}>
                    <DueStatus monthStatus={data.monthStatus || []} onPayMonth={openPayModal} />
                </Card>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
                <Card title="Payment History" icon={Receipt}>
                    {data.payments.length === 0 ? (
                        <div className="flex flex-col items-center py-12 text-slate-400">
                            <Wallet size={36} className="mb-3 opacity-30" />
                            <p className="font-medium">No payments yet</p>
                            <p className="text-sm mt-1">Your payment history will appear here</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50 -mx-5 md:-mx-6">
                            {data.payments.map(p => (
                                <div key={p._id} className="px-5 md:px-6 py-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                                        p.status === 'paid' ? 'bg-emerald-100' : p.status === 'partial' ? 'bg-amber-100' : p.status === 'pending_upi' ? 'bg-blue-100' : 'bg-red-100'
                                    }`}>
                                        {p.status === 'paid' ? <CheckCircle size={20} className="text-emerald-600" />
                                            : p.status === 'partial' ? <Clock size={20} className="text-amber-600" />
                                            : p.status === 'pending_upi' ? <Smartphone size={20} className="text-blue-600" />
                                            : <AlertCircle size={20} className="text-danger" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-slate-900 text-sm">{p.month || 'General'}</span>
                                            <StatusPill status={p.status} />
                                            <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                                {modeIcon(p.paymentMode)} {p.paymentMode}
                                            </span>
                                        </div>
                                        <p className="text-xs text-secondary mt-1">{fmtDate(p.createdAt)}</p>
                                        <p className="text-xs text-secondary font-mono">{p.receiptNo}</p>
                                        {p.transactionId && (
                                            <p className="text-xs text-primary font-mono mt-0.5 truncate">{p.transactionId}</p>
                                        )}
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="font-bold text-slate-900 text-base">{fmt(p.amountPaid)}</p>
                                        {p.discount > 0 && <p className="text-xs text-emerald-600 mt-0.5">-{fmt(p.discount)} off</p>}
                                        {p.fine > 0 && <p className="text-xs text-danger mt-0.5">+{fmt(p.fine)} fine</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            )}

            {showModal && (
                <PayModal
                    student={data.student} academicYear={academicYear}
                    monthStatus={data.monthStatus || []}
                    monthlyFeeAmt={data.monthlyFeeAmt || 0}
                    preselectedMonth={preselectedMonth}
                    onClose={() => setShowModal(false)} onSuccess={fetchFees}
                />
            )}
        </div>
    );
};

export default StudentFees;