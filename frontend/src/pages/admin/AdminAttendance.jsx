import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Users, AlertTriangle, Search, Filter, Download } from 'lucide-react';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useSettings } from '../../context/SettingsContext';

const AdminAttendance = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);

  const { settings } = useSettings();

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await API.get('/admin/classes');
        setClasses(res.data);
      } finally { setLoading(false); }
    };
    fetchClasses();
  }, []);

  const fetchClassReport = async (classId) => {
    setLoading(true);
    try {
      // Hits the aggregation logic you wrote in attendanceController.js
      const res = await API.get(`/attendance/class-report/${classId}`, {
        params: { academicYear: settings.currentAcademicYear }
      });
      setReport(res.data);
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight text-indigo-700">Attendance Oversight</h1>
          <p className="text-sm text-secondary font-medium">Monitor school-wide presence and track defaulters.</p>
        </div>
      </div>

      {/* 1. Selector Bar */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
        <Filter className="text-primary" />
        <select 
          className="flex-grow h-12 bg-transparent font-bold text-gray-800 outline-none"
          onChange={(e) => {
            setSelectedClass(e.target.value);
            fetchClassReport(e.target.value);
          }}
        >
          <option value="">Select a Class to view report...</option>
          {classes.map(c => <option key={c._id} value={c._id}>Grade {c.className}</option>)}
        </select>
      </div>

      {/* 2. Report Content */}
      {loading ? (
        <div className="py-20"><LoadingSpinner size="lg" /></div>
      ) : report.length > 0 ? (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Student</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Present / Total</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-right">Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {report.map((s) => (
                  <tr key={s._id}>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-gray-800">{s.name}</p>
                      <p className="text-[10px] text-secondary">Adm No: {s.UID}</p>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-600">{s.presentCount} / {s.totalCount}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-sm font-black ${s.percentage < 75 ? 'text-danger' : 'text-success'}`}>
                        {s.percentage.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="py-20 text-center opacity-30">
          <ClipboardCheck size={64} className="mx-auto mb-4" />
          <p className="font-bold">Choose a grade above to generate the attendance report.</p>
        </div>
      )}
    </div>
  );
};

export default AdminAttendance;