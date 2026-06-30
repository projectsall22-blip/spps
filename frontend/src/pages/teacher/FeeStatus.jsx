import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, CheckCircle, AlertCircle, Clock, Search, Eye } from 'lucide-react';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useSettings } from '../../context/SettingsContext';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const MonthPill = ({ isPaid, isOverdue }) => {
    if (isPaid) return <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center"><CheckCircle size={14} className="text-emerald-600" /></div>;
    if (isOverdue) return <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center"><AlertCircle size={14} className="text-red-500" /></div>;
    return <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center"><Clock size={14} className="text-amber-500" /></div>;
};

const LedgerModal = ({ studentId, academicYear, onClose }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        API.get(`/fees/student/${studentId}?academicYear=${academicYear}`)
            .then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
    }, [studentId, academicYear]);

    return (
        <Modal isOpen onClose={onClose} title="Student Fee Ledger" size="lg">
            {loading ? <LoadingSpinner /> : !data ? <p className="text-center text-slate-400">No data</p> : (
                <div className="space-y-4">
                    <div className="rounded-2xl p-4 bg-slate-800">
                        <p className="text-white font-black text-lg">{data.student.name}</p>
                        <p className="text-slate-300 text-sm">Class {data.student.class}</p>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                            <div className="bg-white/10 rounded-xl p-3">
                                <p className="text-slate-300 text-xs">Total Paid</p>
                                <p className="text-emerald-400 font-black text-lg">{fmt(data.totalPaid)}</p>
                            </div>
                            <div className="bg-white/10 rounded-xl p-3">
                                <p className="text-slate-300 text-xs">Balance Due</p>
                                <p className={`font-black text-lg ${data.totalDue > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{fmt(data.totalDue)}</p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Month-wise Status</p>
                        <div className="flex flex-wrap gap-2">
                            {(data.monthStatus || []).filter(ms => ms.isActive || ms.isPaid).map(ms => (
                                <div key={ms.month} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                                    ms.isPaid ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    : ms.isOverdue ? 'bg-red-50 border-red-200 text-red-700'
                                    : 'bg-amber-50 border-amber-200 text-amber-700'
                                }`}>
                                    {ms.isPaid ? <CheckCircle size={11} /> : ms.isOverdue ? <AlertCircle size={11} /> : <Clock size={11} />}
                                    {ms.month}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="overflow-x-auto max-h-56 overflow-y-auto rounded-xl border border-slate-100">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 sticky top-0">
                                <tr>{['Receipt','Month','Paid','Mode','Date'].map(h => (
                                    <th key={h} className="px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase">{h}</th>
                                ))}</tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {data.payments.map(p => (
                                    <tr key={p._id} className="hover:bg-slate-50">
                                        <td className="px-3 py-2.5 font-mono text-xs text-slate-400">{p.receiptNo}</td>
                                        <td className="px-3 py-2.5 font-medium">{p.month || '—'}</td>
                                        <td className="px-3 py-2.5 font-bold text-emerald-600">{fmt(p.amountPaid)}</td>
                                        <td className="px-3 py-2.5 text-xs text-slate-500">{p.paymentMode}</td>
                                        <td className="px-3 py-2.5 text-xs text-slate-400">{fmtDate(p.createdAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {data.payments.length === 0 && <p className="text-center text-slate-400 py-8 text-sm">No payments yet</p>}
                    </div>
                </div>
            )}
        </Modal>
    );
};

const TeacherFeeStatus = () => {
    const { settings } = useSettings();
    const academicYear = settings?.academicYear || settings?.currentAcademicYear || '2025-26';
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [ledgerStudent, setLedgerStudent] = useState(null);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const res = await API.get(`/fees/class-fee-status?academicYear=${academicYear}`);
            setData(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Could not load fee status');
        } finally { setLoading(false); }
    }, [academicYear]);

    useEffect(() => { load(); }, [load]);

    if (loading) return <div className="py-24"><LoadingSpinner size="lg" /></div>;

    if (error) return (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center">
                <AlertCircle size={28} className="text-amber-500" />
            </div>
            <p className="font-bold text-slate-700">{error}</p>
            <p className="text-sm text-slate-400">Only class teachers can view this section.</p>
        </div>
    );

    const months = data?.months || [];
    const students = (data?.students || []).filter(({ student }) =>
        !search || student.name.toLowerCase().includes(search.toLowerCase())
    );
    const overdueCount  = students.filter(({ monthStatus }) => monthStatus.some(m => m.isOverdue)).length;
    const allClearCount = students.filter(({ monthStatus }) => !monthStatus.some(m => m.isOverdue)).length;

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Class Teacher View</p>
                        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                            <DollarSign size={22} className="text-indigo-500" />
                            Fee Status — Class {data?.className}
                        </h1>
                        <p className="text-slate-400 text-sm mt-0.5">{academicYear} · Read-only</p>
                    </div>
                    <div className="flex gap-3">
                        {[
                            { label: 'Total',   value: students.length, cls: 'bg-indigo-50 text-indigo-700' },
                            { label: 'Overdue', value: overdueCount,    cls: 'bg-red-50 text-red-700' },
                            { label: 'Clear',   value: allClearCount,   cls: 'bg-emerald-50 text-emerald-700' },
                        ].map(({ label, value, cls }) => (
                            <div key={label} className={`${cls} rounded-2xl px-4 py-3 text-center min-w-[68px]`}>
                                <p className="text-2xl font-black">{value}</p>
                                <p className="text-xs font-bold uppercase">{label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 shadow-sm"
                    placeholder="Search student..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {/* Legend */}
            <div className="flex items-center gap-5 text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-1.5"><CheckCircle size={13} className="text-emerald-500" /> Paid</span>
                <span className="flex items-center gap-1.5"><AlertCircle size={13} className="text-red-500" /> Overdue</span>
                <span className="flex items-center gap-1.5"><Clock size={13} className="text-amber-500" /> Due</span>
            </div>

            {/* Table */}
            <Card>
                <div className="overflow-x-auto -mx-5 md:-mx-6">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-5 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wide">#</th>
                                <th className="px-5 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wide">Student</th>
                                {months.map(m => (
                                    <th key={m} className="px-2 py-3 text-center text-[10px] font-black text-slate-500 uppercase tracking-wide whitespace-nowrap">
                                        {m.slice(0, 3)}
                                    </th>
                                ))}
                                <th className="px-5 py-3 text-center text-xs font-black text-slate-500 uppercase tracking-wide">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {students.length === 0 && (
                                <tr><td colSpan={months.length + 3} className="text-center py-12 text-slate-400">No students found</td></tr>
                            )}
                            {students.map(({ student, monthStatus }, idx) => {
                                const hasOverdue = monthStatus.some(m => m.isOverdue);
                                return (
                                    <tr key={student._id} className={`hover:bg-slate-50 transition-colors ${hasOverdue ? 'bg-red-50/30' : ''}`}>
                                        <td className="px-5 py-3 text-xs text-slate-400 font-medium">{idx + 1}</td>
                                        <td className="px-5 py-3">
                                            <p className="font-semibold text-slate-800">{student.name}</p>
                                            <p className="text-xs text-slate-400">{student.admissionNo || student.UID}</p>
                                        </td>
                                        {monthStatus.map(ms => (
                                            <td key={ms.month} className="px-2 py-3">
                                                <div className="flex justify-center">
                                                    <MonthPill isPaid={ms.isPaid} isOverdue={ms.isOverdue} />
                                                </div>
                                            </td>
                                        ))}
                                        <td className="px-5 py-3">
                                            <div className="flex justify-center">
                                                <button onClick={() => setLedgerStudent(student._id)}
                                                    className="w-8 h-8 rounded-xl bg-indigo-50 hover:bg-indigo-100 flex items-center justify-center text-indigo-600 transition-colors">
                                                    <Eye size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            {ledgerStudent && (
                <LedgerModal studentId={ledgerStudent} academicYear={academicYear} onClose={() => setLedgerStudent(null)} />
            )}
        </div>
    );
};

export default TeacherFeeStatus;