import React, { useState, useEffect } from 'react';
import { CalendarDays, Flag, Church, School, BookOpen, HelpCircle, Sun } from 'lucide-react';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
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

const groupByMonth = (holidays) => {
    const map = {};
    holidays.forEach(h => {
        const key = new Date(h.date).toISOString().slice(0, 7);
        if (!map[key]) map[key] = [];
        map[key].push(h);
    });
    return map;
};

// Find the next upcoming holiday
const getNextHoliday = (holidays) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return holidays.find(h => new Date(h.date) >= today) || null;
};

const HolidayCalendarView = () => {
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { settings } = useSettings();

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await API.get('/holidays');
                setHolidays(res.data);
            } catch {
                setError('Could not load holiday calendar');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    if (loading) return <div className="py-20"><LoadingSpinner size="lg" /></div>;
    if (error) return <div className="py-20 text-center text-red-500 font-bold">{error}</div>;

    const grouped = groupByMonth(holidays);
    const nextHoliday = getNextHoliday(holidays);
    const totalDays = holidays.reduce((sum, h) => {
        if (h.endDate) {
            return sum + Math.ceil((new Date(h.endDate) - new Date(h.date)) / (1000 * 60 * 60 * 24)) + 1;
        }
        return sum + 1;
    }, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
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

            {/* Next Holiday Banner */}
            {nextHoliday && (
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
                    <div className="flex items-center gap-2 mb-1">
                        <Sun size={16} className="opacity-80" />
                        <span className="text-xs font-black uppercase tracking-widest opacity-80">Next Holiday</span>
                    </div>
                    <p className="text-xl font-black">{nextHoliday.title}</p>
                    <p className="text-sm opacity-80 mt-0.5">
                        {fmt(nextHoliday.date)}
                        {nextHoliday.endDate && ` — ${fmt(nextHoliday.endDate)}`}
                        {' · '}
                        {new Date(nextHoliday.date).toLocaleString('en-IN', { weekday: 'long' })}
                    </p>
                    {nextHoliday.description && (
                        <p className="text-xs opacity-70 mt-1">{nextHoliday.description}</p>
                    )}
                </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-2">
                {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
                    <span key={type} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${cfg.color}`}>
                        <cfg.icon size={12} /> {type}
                    </span>
                ))}
            </div>

            {/* List */}
            {Object.keys(grouped).length === 0 ? (
                <div className="py-24 text-center opacity-30">
                    <CalendarDays size={64} className="mx-auto mb-4" />
                    <p className="font-bold text-lg">No holidays scheduled yet</p>
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
                                    const isPast = new Date(h.endDate || h.date) < new Date(new Date().setHours(0,0,0,0));

                                    return (
                                        <Card key={h._id} className={`transition-all ${isPast ? 'opacity-50' : 'hover:shadow-md'}`}>
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

                                                <div className="w-px h-12 bg-gray-100 shrink-0" />

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
                                                        {isPast && (
                                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full text-[10px] font-black">
                                                                Past
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
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default HolidayCalendarView;