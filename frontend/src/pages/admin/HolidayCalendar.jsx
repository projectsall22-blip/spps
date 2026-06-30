import React, { useState, useEffect } from 'react';
import { CalendarDays, Plus, Trash2, Flag, Church, School, BookOpen, HelpCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';
import { useSettings } from '../../context/SettingsContext';

const TYPE_CONFIG = {
    National:  { color: 'bg-orange-50 text-orange-600 border-orange-200', icon: Flag },
    Religious: { color: 'bg-purple-50 text-purple-600 border-purple-200', icon: Church },
    School:    { color: 'bg-blue-50 text-blue-600 border-blue-200',       icon: School },
    Exam:      { color: 'bg-red-50 text-red-600 border-red-200',          icon: BookOpen },
    Other:     { color: 'bg-gray-50 text-gray-600 border-gray-200',       icon: HelpCircle },
};

const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const monthName = (d) => new Date(d).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

// Group holidays by month
const groupByMonth = (holidays) => {
    const map = {};
    holidays.forEach(h => {
        const key = new Date(h.date).toISOString().slice(0, 7); // "2025-08"
        if (!map[key]) map[key] = [];
        map[key].push(h);
    });
    return map;
};

const HolidayCalendar = () => {
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState(null);
    const { settings } = useSettings();

    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
    const watchDate = watch('date');

    useEffect(() => { fetchHolidays(); }, []);

    const fetchHolidays = async () => {
        setLoading(true);
        try {
            const res = await API.get('/holidays');
            setHolidays(res.data);
        } catch {
            setToast({ message: 'Failed to load holidays', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const onAdd = async (data) => {
        setSubmitting(true);
        try {
            await API.post('/holidays', data);
            setToast({ message: 'Holiday added successfully', type: 'success' });
            setIsModalOpen(false);
            reset();
            fetchHolidays();
        } catch (err) {
            setToast({ message: err.response?.data?.message || 'Failed to add holiday', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const onDelete = async (id, title) => {
        if (!window.confirm(`Delete "${title}"?`)) return;
        try {
            await API.delete(`/holidays/${id}`);
            setHolidays(prev => prev.filter(h => h._id !== id));
            setToast({ message: 'Holiday removed', type: 'success' });
        } catch {
            setToast({ message: 'Failed to delete', type: 'error' });
        }
    };

    const grouped = groupByMonth(holidays);
    const totalDays = holidays.reduce((sum, h) => {
        if (h.endDate) {
            const diff = Math.ceil((new Date(h.endDate) - new Date(h.date)) / (1000 * 60 * 60 * 24)) + 1;
            return sum + diff;
        }
        return sum + 1;
    }, 0);

    if (loading) return <div className="py-20"><LoadingSpinner size="lg" /></div>;

    return (
        <div className="space-y-6">
            {toast && <Toast {...toast} onClose={() => setToast(null)} />}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Holiday Calendar</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Session:</span>
                        <span className="px-2 py-0.5 bg-indigo-50 text-primary text-[10px] font-black rounded border border-indigo-100">
                            {settings.currentAcademicYear}
                        </span>
                        <span className="text-[10px] font-black text-gray-400 uppercase">• {holidays.length} holidays • {totalDays} days off</span>
                    </div>
                </div>
                <Button variant="primary" icon={Plus} onClick={() => setIsModalOpen(true)}>
                    Add Holiday
                </Button>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-2">
                {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
                    <span key={type} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${cfg.color}`}>
                        <cfg.icon size={12} /> {type}
                    </span>
                ))}
            </div>

            {/* Grouped by Month */}
            {Object.keys(grouped).length === 0 ? (
                <div className="py-24 text-center opacity-30">
                    <CalendarDays size={64} className="mx-auto mb-4" />
                    <p className="font-bold text-lg">No holidays added yet</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([monthKey, items]) => (
                        <div key={monthKey}>
                            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">
                                {monthName(monthKey + '-01')}
                            </h2>
                            <div className="space-y-2">
                                {items.map(h => {
                                    const cfg = TYPE_CONFIG[h.type] || TYPE_CONFIG.Other;
                                    const Icon = cfg.icon;
                                    const isMultiDay = !!h.endDate;
                                    return (
                                        <Card key={h._id} className="hover:shadow-md transition-all">
                                            <div className="flex items-center gap-4">
                                                {/* Date block */}
                                                <div className="shrink-0 w-14 text-center">
                                                    <div className="text-2xl font-black text-gray-800 leading-none">
                                                        {new Date(h.date).getDate()}
                                                    </div>
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase">
                                                        {new Date(h.date).toLocaleString('en-IN', { month: 'short' })}
                                                    </div>
                                                    <div className="text-[10px] font-bold text-gray-300">
                                                        {new Date(h.date).toLocaleString('en-IN', { weekday: 'short' })}
                                                    </div>
                                                </div>

                                                {/* Divider */}
                                                <div className="w-px h-12 bg-gray-100 shrink-0" />

                                                {/* Info */}
                                                <div className="flex-grow min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${cfg.color}`}>
                                                            <Icon size={10} /> {h.type}
                                                        </span>
                                                        {isMultiDay && (
                                                            <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-full text-[10px] font-black">
                                                                Multi-day
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="font-black text-gray-900 mt-1 truncate">{h.title}</p>
                                                    {isMultiDay && (
                                                        <p className="text-[11px] text-gray-400 font-medium">
                                                            {fmt(h.date)} — {fmt(h.endDate)}
                                                        </p>
                                                    )}
                                                    {h.description && (
                                                        <p className="text-xs text-gray-400 mt-0.5 truncate">{h.description}</p>
                                                    )}
                                                </div>

                                                {/* Delete */}
                                                <button
                                                    onClick={() => onDelete(h._id, h.title)}
                                                    className="shrink-0 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Modal */}
            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); reset(); }} title="Add Holiday" size="md">
                <form onSubmit={handleSubmit(onAdd)} className="space-y-4">
                    <Input
                        label="Holiday Name"
                        placeholder="e.g. Diwali, Republic Day"
                        {...register('title', { required: 'Name is required' })}
                        error={errors.title?.message}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Date"
                            type="date"
                            {...register('date', { required: 'Date is required' })}
                            error={errors.date?.message}
                        />
                        <Input
                            label="End Date (if multi-day)"
                            type="date"
                            min={watchDate || undefined}
                            {...register('endDate')}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase ml-1">Type</label>
                        <select
                            className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold text-gray-700 outline-none focus:border-primary"
                            {...register('type')}
                        >
                            <option value="National">National Holiday</option>
                            <option value="Religious">Religious</option>
                            <option value="School">School Holiday</option>
                            <option value="Exam">Exam / No Classes</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase ml-1">Description (Optional)</label>
                        <textarea
                            className="w-full p-3 bg-white border-2 border-gray-100 rounded-xl font-medium text-gray-700 outline-none focus:border-primary resize-none"
                            rows={2}
                            placeholder="Any extra details..."
                            {...register('description')}
                        />
                    </div>

                    <Button type="submit" fullWidth isLoading={submitting} icon={Plus}>
                        Add to Calendar
                    </Button>
                </form>
            </Modal>
        </div>
    );
};

export default HolidayCalendar;