import React, { useState, useEffect, useCallback } from 'react';
import {
    Bus, Plus, Search, Users, Trash2, Eye, Settings2, X,
    MapPin, IndianRupee, ArrowUpRight, TrendingUp, CheckCircle,
} from 'lucide-react';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Table from '../../components/common/Table';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

/* ── Stat Card — identical pattern to FeeManagement ─────────────────────── */
const StatCard = ({ icon: Icon, label, value, sub, gradient, onClick }) => (
    <button onClick={onClick} className={`${gradient} rounded-2xl p-5 text-left w-full transition-all hover:scale-[1.02] hover:shadow-lg`}>
        <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Icon size={20} className="text-white" />
            </div>
            {onClick && <ArrowUpRight size={16} className="text-white/60" />}
        </div>
        <p className="text-white/70 text-[10px] font-black uppercase tracking-widest">{label}</p>
        <p className="text-white text-2xl font-black mt-0.5">{value}</p>
        {sub && <p className="text-white/60 text-xs mt-1">{sub}</p>}
    </button>
);

/* ── Route Form Modal ────────────────────────────────────────────────────── */
const RouteModal = ({ onClose, onSuccess, editing }) => {
    const [form, setForm] = useState({
        routeName:   editing?.routeName   || '',
        description: editing?.description || '',
        monthlyFee:  editing?.monthlyFee  || '',
        stops:       editing?.stops?.join(', ') || '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState(null);

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.routeName.trim() || !form.monthlyFee)
            return setToast({ message: 'Route name and monthly fee are required', type: 'error' });
        setSubmitting(true);
        try {
            const payload = {
                routeName:   form.routeName.trim(),
                description: form.description.trim(),
                monthlyFee:  Number(form.monthlyFee),
                stops:       form.stops.split(',').map(s => s.trim()).filter(Boolean),
            };
            if (editing) await API.put(`/bus/${editing._id}`, payload);
            else         await API.post('/bus', payload);
            onSuccess(editing ? 'Route updated' : 'Route created');
        } catch (err) {
            setToast({ message: err.response?.data?.message || err.message, type: 'error' });
        } finally { setSubmitting(false); }
    };

    return (
        <Modal isOpen onClose={onClose} title={editing ? 'Edit Bus Route' : 'Create Bus Route'} size="md">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Route Name *" placeholder="e.g. Route A ΓÇô Sector 12"
                    value={form.routeName} onChange={set('routeName')} />
                <Input label="Monthly Fee (₹) *" type="number" min="0" placeholder="500"
                    value={form.monthlyFee} onChange={set('monthlyFee')} />
                <Input label="Description" placeholder="Short description of the route"
                    value={form.description} onChange={set('description')} />
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">
                        Stops <span className="font-normal normal-case text-slate-400">(comma separated)</span>
                    </label>
                    <textarea rows={2}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                        placeholder="Stop 1, Stop 2, Stop 3"
                        value={form.stops} onChange={set('stops')} />
                </div>

                {/* Preview pill */}
                {form.monthlyFee > 0 && (
                    <div className="rounded-2xl p-4 bg-primary flex items-center justify-between">
                        <div>
                            <p className="text-indigo-200 text-xs">Monthly Bus Fee</p>
                            <p className="text-white text-2xl font-black">{fmt(form.monthlyFee)}</p>
                            <p className="text-indigo-200 text-xs mt-0.5">Auto-added to each student's monthly fee</p>
                        </div>
                        <Bus size={28} className="text-white/30" />
                    </div>
                )}

                <div className="flex gap-3 pt-1">
                    <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
                    <Button type="submit" isLoading={submitting} className="flex-1">
                        {editing ? 'Update Route' : 'Create Route'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

/* ── Assign Students Modal ───────────────────────────────────────────────── */
const AssignStudentModal = ({ route, onClose, onSuccess }) => {
    const [search, setSearch]     = useState('');
    const [results, setResults]   = useState([]);
    const [assigned, setAssigned] = useState([]);
    const [loading, setLoading]   = useState(false);
    const [toast, setToast]       = useState(null);

    const loadAssigned = useCallback(async () => {
        try {
            const res = await API.get(`/bus/${route._id}/students`);
            setAssigned(res.data);
        } catch { /* silent */ }
    }, [route._id]);

    useEffect(() => { loadAssigned(); }, [loadAssigned]);

    useEffect(() => {
        if (search.trim().length < 2) return setResults([]);
        const t = setTimeout(async () => {
            try {
                const res = await API.get(`/admin/students?search=${encodeURIComponent(search)}&limit=10&page=1`);
                setResults(res.data.students || res.data || []);
            } catch { setResults([]); }
        }, 300);
        return () => clearTimeout(t);
    }, [search]);

    const assignedIds = new Set(assigned.map(s => s._id));

    const assign = async (student) => {
        setLoading(true);
        try {
            await API.post(`/bus/${route._id}/students`, { studentId: student._id });
            setSearch(''); setResults([]);
            await loadAssigned();
            setToast({ message: `${student.name} assigned to route`, type: 'success' });
        } catch (err) {
            setToast({ message: err.response?.data?.message || err.message, type: 'error' });
        } finally { setLoading(false); }
    };

    const remove = async (studentId, name) => {
        if (!window.confirm(`Remove ${name} from this route?`)) return;
        setLoading(true);
        try {
            await API.delete(`/bus/${route._id}/students/${studentId}`);
            await loadAssigned();
            setToast({ message: `${name} removed`, type: 'success' });
        } catch (err) {
            setToast({ message: err.response?.data?.message || err.message, type: 'error' });
        } finally { setLoading(false); }
    };

    return (
        <Modal isOpen onClose={() => { onSuccess(); onClose(); }} title={`Manage Students — ${route.routeName}`} size="lg">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Route info banner */}
            <div className="rounded-2xl p-4 bg-primary mb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-white font-black text-base">{route.routeName}</p>
                        {route.description && <p className="text-indigo-200 text-xs mt-0.5">{route.description}</p>}
                    </div>
                    <div className="text-right">
                        <p className="text-indigo-200 text-xs">Monthly Fee</p>
                        <p className="text-white font-black text-lg">{fmt(route.monthlyFee)}</p>
                    </div>
                </div>
                {route.stops?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        {route.stops.map((s, i) => (
                            <span key={i} className="text-[10px] bg-white/15 text-white px-2 py-0.5 rounded-full">{s}</span>
                        ))}
                    </div>
                )}
            </div>

            {/* Search */}
            <div className="relative mb-3">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Search student by name or admission no..."
                    value={search} onChange={e => setSearch(e.target.value)} />
                {results.length > 0 && (
                    <div className="absolute z-50 w-full bg-white border border-slate-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
                        {results.filter(s => !assignedIds.has(s._id)).map(s => (
                            <div key={s._id} onClick={() => assign(s)}
                                className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer text-sm flex items-center justify-between">
                                <span className="font-semibold text-slate-800">{s.name}</span>
                                <span className="text-slate-400 text-xs">Class {s.class} · {s.admissionNo || s.UID}</span>
                            </div>
                        ))}
                        {results.filter(s => !assignedIds.has(s._id)).length === 0 && (
                            <p className="px-4 py-3 text-sm text-slate-400 text-center">All matching students already assigned</p>
                        )}
                    </div>
                )}
            </div>

            {/* Assigned students table */}
            {loading && <div className="flex justify-center py-4"><LoadingSpinner /></div>}
            <div className="rounded-xl border border-slate-100 overflow-hidden max-h-64 overflow-y-auto">
                {assigned.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                        <Users size={28} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No students assigned yet</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 sticky top-0">
                            <tr>
                                {['Student', 'Class', 'Admission No', ''].map(h => (
                                    <th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {assigned.map(s => (
                                <tr key={s._id} className="hover:bg-blue-50/20 transition-colors">
                                    <td className="px-4 py-2.5 font-semibold text-slate-800">{s.name}</td>
                                    <td className="px-4 py-2.5 text-slate-500">Class {s.class}</td>
                                    <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">{s.admissionNo || s.UID}</td>
                                    <td className="px-4 py-2.5">
                                        <button onClick={() => remove(s._id, s.name)}
                                            className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-danger transition-colors">
                                            <X size={13} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-secondary">
                    {assigned.length} student{assigned.length !== 1 ? 's' : ''} · Bus fee auto-added to monthly collection
                </p>
                <Button onClick={() => { onSuccess(); onClose(); }}>Done</Button>
            </div>
        </Modal>
    );
};

/* ── Route Detail Modal (view stops + students count) ────────────────────── */
const RouteDetailModal = ({ route, onClose }) => (
    <Modal isOpen onClose={onClose} title="Route Details" size="sm">
        <div className="space-y-4">
            <div className="rounded-2xl p-4 bg-primary">
                <p className="text-white font-black text-lg">{route.routeName}</p>
                {route.description && <p className="text-indigo-200 text-sm mt-0.5">{route.description}</p>}
                <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="bg-white/15 rounded-xl p-3">
                        <p className="text-indigo-200 text-xs">Monthly Fee</p>
                        <p className="text-white font-black text-lg">{fmt(route.monthlyFee)}</p>
                    </div>
                    <div className="bg-white/15 rounded-xl p-3">
                        <p className="text-indigo-200 text-xs">Students</p>
                        <p className="text-white font-black text-lg">{route.studentCount || 0}</p>
                    </div>
                </div>
            </div>
            {route.stops?.length > 0 && (
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Stops</p>
                    <div className="space-y-1.5">
                        {route.stops.map((stop, i) => (
                            <div key={i} className="flex items-center gap-2.5 bg-slate-50 rounded-xl px-3 py-2">
                                <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                                    <span className="text-[9px] font-black text-primary">{i + 1}</span>
                                </div>
                                <span className="text-sm text-slate-700">{stop}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <Button variant="ghost" onClick={onClose} className="w-full">Close</Button>
        </div>
    </Modal>
);

/* ── Main Page ───────────────────────────────────────────────────────────── */
export default function BusManagement() {
    const [routes, setRoutes]               = useState([]);
    const [loading, setLoading]             = useState(true);
    const [toast, setToast]                 = useState(null);
    const [showRouteModal, setShowRouteModal] = useState(false);
    const [editingRoute, setEditingRoute]   = useState(null);
    const [managingRoute, setManagingRoute] = useState(null);
    const [viewingRoute, setViewingRoute]   = useState(null);
    const [search, setSearch]               = useState('');

    const showToast = (message, type = 'success') => setToast({ message, type });

    const loadRoutes = useCallback(async () => {
        setLoading(true);
        try {
            const res = await API.get('/bus');
            setRoutes(res.data);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to load routes', 'error');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { loadRoutes(); }, [loadRoutes]);

    const handleDelete = async (route) => {
        if (!window.confirm(`Delete "${route.routeName}"? All students will be unassigned.`)) return;
        try {
            await API.delete(`/bus/${route._id}`);
            showToast('Route deleted');
            loadRoutes();
        } catch (err) {
            showToast(err.response?.data?.message || err.message, 'error');
        }
    };

    const totalStudents = routes.reduce((s, r) => s + (r.studentCount || 0), 0);
    const totalRevenue  = routes.reduce((s, r) => s + (r.monthlyFee * (r.studentCount || 0)), 0);
    const activeRoutes  = routes.filter(r => r.isActive).length;

    const filtered = routes.filter(r =>
        !search || r.routeName.toLowerCase().includes(search.toLowerCase()) ||
        r.description?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* ── Hero Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        <Bus size={22} className="text-primary" /> Bus Management
                    </h1>
                    <p className="text-sm text-secondary font-medium">Manage routes, stops and student assignments</p>
                </div>
                <button
                    onClick={() => { setEditingRoute(null); setShowRouteModal(true); }}
                    className="flex items-center gap-2 bg-primary text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">
                    <Plus size={16} /> New Route
                </button>
            </div>

            {/* ── Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={Bus}          label="Total Routes"    value={routes.length}    sub="configured"          gradient="bg-gradient-to-br from-blue-500 to-indigo-600" />
                <StatCard icon={CheckCircle}  label="Active Routes"   value={activeRoutes}     sub="currently running"   gradient="bg-gradient-to-br from-emerald-500 to-teal-600" />
                <StatCard icon={Users}        label="Total Students"  value={totalStudents}    sub="assigned to routes"  gradient="bg-gradient-to-br from-violet-500 to-purple-600" />
                <StatCard icon={TrendingUp}   label="Monthly Revenue" value={fmt(totalRevenue)} sub="from bus fees"      gradient="bg-gradient-to-br from-amber-500 to-orange-600" />
            </div>

            {/* ── Routes Table */}
            <Card noPadding>
                <div className="p-4 border-b border-slate-50 flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <div className="relative flex-1 max-w-sm">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            placeholder="Search routes..."
                            value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <p className="text-xs text-secondary shrink-0">{filtered.length} route{filtered.length !== 1 ? 's' : ''}</p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
                ) : (
                    <Table
                        headers={['Route Name', 'Monthly Fee', 'Stops', 'Students', 'Status', '']}
                        count={filtered.length}
                        emptyMessage="No bus routes found"
                        emptyIcon="🚌"
                    >
                        {filtered.map(route => (
                            <tr key={route._id} className="hover:bg-blue-50/20 transition-colors">
                                <td className="px-5 py-3">
                                    <p className="font-semibold text-slate-800 text-sm">{route.routeName}</p>
                                    {route.description && (
                                        <p className="text-xs text-secondary mt-0.5">{route.description}</p>
                                    )}
                                </td>
                                <td className="px-5 py-3">
                                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-xl text-sm font-bold">
                                        <IndianRupee size={12} />{Number(route.monthlyFee).toLocaleString('en-IN')}
                                    </span>
                                </td>
                                <td className="px-5 py-3">
                                    {route.stops?.length > 0 ? (
                                        <button onClick={() => setViewingRoute(route)}
                                            className="inline-flex items-center gap-1 text-xs text-primary bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-xl font-semibold transition-colors">
                                            <MapPin size={11} /> {route.stops.length} stops
                                        </button>
                                    ) : (
                                        <span className="text-slate-300 text-xs">—</span>
                                    )}
                                </td>
                                <td className="px-5 py-3">
                                    <button onClick={() => setManagingRoute(route)}
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold bg-violet-50 text-violet-700 hover:bg-violet-100 px-2.5 py-1 rounded-xl transition-colors">
                                        <Users size={11} /> {route.studentCount || 0} students
                                    </button>
                                </td>
                                <td className="px-5 py-3">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                                        route.isActive
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-slate-100 text-slate-500'
                                    }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${route.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                        {route.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-5 py-3">
                                    <div className="flex gap-1.5">
                                        <button onClick={() => setViewingRoute(route)}
                                            className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-primary transition-colors" title="View Details">
                                            <Eye size={13} />
                                        </button>
                                        <button onClick={() => { setEditingRoute(route); setShowRouteModal(true); }}
                                            className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors" title="Edit Route">
                                            <Settings2 size={13} />
                                        </button>
                                        <button onClick={() => handleDelete(route)}
                                            className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-danger transition-colors" title="Delete Route">
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </Table>
                )}
            </Card>

            {/* ── Modals */}
            {showRouteModal && (
                <RouteModal
                    editing={editingRoute}
                    onClose={() => { setShowRouteModal(false); setEditingRoute(null); }}
                    onSuccess={(msg) => {
                        showToast(msg);
                        setShowRouteModal(false);
                        setEditingRoute(null);
                        loadRoutes();
                    }}
                />
            )}
            {managingRoute && (
                <AssignStudentModal
                    route={managingRoute}
                    onClose={() => setManagingRoute(null)}
                    onSuccess={loadRoutes}
                />
            )}
            {viewingRoute && (
                <RouteDetailModal
                    route={viewingRoute}
                    onClose={() => setViewingRoute(null)}
                />
            )}
        </div>
    );
}