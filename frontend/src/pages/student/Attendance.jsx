import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, AlertTriangle, ChevronLeft, ChevronRight, TrendingDown } from 'lucide-react';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const StudentAttendance = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // 1. AVAILABLE MONTHS LOGIC (Session-Aware)
  const generateAvailableMonths = () => {
    const months = [
      { num: 1, name: 'January' }, { num: 2, name: 'February' }, { num: 3, name: 'March' },
      { num: 4, name: 'April' }, { num: 5, name: 'May' }, { num: 6, name: 'June' },
      { num: 7, name: 'July' }, { num: 8, name: 'August' }, { num: 9, name: 'September' },
      { num: 10, name: 'October' }, { num: 11, name: 'November' }, { num: 12, name: 'December' }
    ];

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // GUARD: Disable future months
    return months.map(m => ({
      ...m,
      disabled: (selectedYear === currentYear && m.num > currentMonth)
    }));
  };

  const availableMonths = generateAvailableMonths();

  // 2. FETCH DATA WHENEVER MONTH CHANGES
  useEffect(() => {
    fetchAttendance();
  }, [selectedMonth, selectedYear]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await API.get('/attendance/my-summary', {
        params: { month: selectedMonth, year: selectedYear }
      });
      setData(res.data);
    } catch (err) {
      console.error("Failed to load attendance");
    } finally {
      setLoading(false);
    }
  };

  // 3. NAVIGATION HANDLERS
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    // GUARD: Can't go into future
    if (selectedYear === currentYear && selectedMonth === currentMonth) return;

    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  if (loading) return <div className="py-20"><LoadingSpinner size="lg" /></div>;
  if (!data) return null;

  const { monthlyStats, dailyRecords } = data;
  const isLow = monthlyStats.percentage < 75;
  const currentMonthName = availableMonths.find(m => m.num === selectedMonth)?.name;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-gray-900 tracking-tight">Attendance History</h1>

      {/* MONTH NAVIGATOR */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <button 
          onClick={handlePrevMonth}
          className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="text-center">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Viewing</p>
          <p className="text-lg font-black text-primary">{currentMonthName} {selectedYear}</p>
        </div>

        <button 
          onClick={handleNextMonth}
          disabled={selectedYear === new Date().getFullYear() && selectedMonth === (new Date().getMonth() + 1)}
          className="p-2 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* MONTHLY STATS CARD */}
      <Card className="bg-white overflow-hidden">
        <div className="flex flex-col items-center text-center py-4">
          <p className="text-sm font-bold text-secondary uppercase tracking-widest mb-2">
            Monthly Presence
          </p>
          <h2 className={`text-6xl font-black ${isLow ? 'text-danger' : 'text-success'}`}>
            {monthlyStats.percentage}%
          </h2>
          
          <div className="w-full bg-gray-100 h-3 rounded-full mt-6 mb-2 overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ${isLow ? 'bg-danger' : 'bg-success'}`}
              style={{ width: `${monthlyStats.percentage}%` }}
            />
          </div>
          
          <div className="flex justify-between w-full text-[10px] font-bold text-gray-400 uppercase">
            <span>0%</span>
            <span className="text-danger">75% (Min)</span>
            <span>100%</span>
          </div>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-4 gap-2 mt-6 pt-6 border-t border-gray-50">
          <StatBox label="Present" value={monthlyStats.presentDays} color="text-success" />
          <StatBox label="Absent" value={monthlyStats.absentDays} color="text-danger" />
          <StatBox label="Late" value={monthlyStats.lateDays} color="text-warning" />
          <StatBox label="Half" value={monthlyStats.halfDays} color="text-blue-600" />
        </div>
      </Card>

      {/* LOW ATTENDANCE ALERT */}
      {isLow && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-danger animate-pulse">
          <AlertTriangle size={20} className="shrink-0" />
          <p className="text-xs font-bold">
            Your {currentMonthName} attendance is below 75%. Please improve regularity.
          </p>
        </div>
      )}

      {/* DAILY RECORDS TIMELINE */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Clock size={18} className="text-primary" /> 
          Day-by-Day Evidence ({dailyRecords.length} working days)
        </h3>
        
        {dailyRecords.length > 0 ? (
          dailyRecords.map((record, idx) => {
            const statusConfig = {
              'Present': { icon: CheckCircle, color: 'text-success bg-green-50 border-green-100' },
              'Absent': { icon: XCircle, color: 'text-danger bg-red-50 border-red-100' },
              'Late': { icon: Clock, color: 'text-warning bg-amber-50 border-amber-100' },
              'Half-day': { icon: TrendingDown, color: 'text-blue-600 bg-blue-50 border-blue-100' }
            };
            const config = statusConfig[record.status];

            return (
              <div key={idx} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl border ${config.color}`}>
                    <config.icon size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">
                      {new Date(record.date).toLocaleDateString('en-GB', { 
                        day: 'numeric', 
                        month: 'short', 
                        weekday: 'short' 
                      })}
                    </p>
                    {record.remarks && (
                      <p className="text-[10px] text-secondary italic">{record.remarks}</p>
                    )}
                  </div>
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${config.color}`}>
                  {record.status}
                </span>
              </div>
            );
          })
        ) : (
          <div className="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <Calendar size={48} className="mx-auto text-gray-200 mb-2" />
            <p className="text-sm text-secondary font-medium">
              No school days recorded for {currentMonthName}.
            </p>
            <p className="text-xs text-gray-400 mt-1">This might be a vacation month.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// HELPER COMPONENT
const StatBox = ({ label, value, color }) => (
  <div className="text-center p-2 bg-gray-50 rounded-xl">
    <p className={`text-2xl font-black ${color}`}>{value}</p>
    <p className="text-[10px] font-bold text-secondary uppercase tracking-tighter">{label}</p>
  </div>
);

export default StudentAttendance;