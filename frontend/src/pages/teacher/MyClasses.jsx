import React, { useState, useEffect } from 'react';
import { BookOpen, Users, Search, ChevronDown, ChevronUp, UserCircle, Phone } from 'lucide-react';
import API from '../../api/axios';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Input from '../../components/common/Input';

const MyClasses = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedClass, setExpandedClass] = useState(null); // Tracks which class roster is visible
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // 1. Fetch Teacher's Assigned Classes
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const res = await API.get('/teacher/my-assignments');
        setAssignments(res.data.assignments);
      } catch (err) {
        console.error("Failed to load assignments");
      } finally {
        setLoading(false);
      }
    };
    fetchAssignments();
  }, []);

  // 2. Fetch Students for a specific Class
  const toggleRoster = async (classId, className, assignmentId) => {
    if (expandedClass === assignmentId) {
      setExpandedClass(null);
      return;
    }

    setExpandedClass(assignmentId);
    setLoadingStudents(true);
    setSearchTerm(""); // Reset search on new class
    try {
      const res = await API.get(`/teacher/class-roster/${classId}`, {
        params: searchTerm ? { search: searchTerm } : {}
      });
      setStudents(res.data.students);
    } catch (err) {
      console.error("Failed to load roster");
    } finally {
      setLoadingStudents(false);
    }
  };

  // 3. Filtered Roster for Search
  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.UID.includes(searchTerm)
  );

  if (loading) return <div className="py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">My Classes</h1>
        <p className="text-sm text-secondary font-medium">Manage your assigned classes and student rosters.</p>
      </div>

      {assignments.length > 0 ? (
        <div className="space-y-4">
          {assignments.map((asgn) => (
            <div key={asgn._id} className="space-y-2">
              {/* 4. The Class Card */}
              <button 
                onClick={() => toggleRoster(asgn.classId._id, asgn.classId.className, asgn._id)}
                className={`w-full text-left transition-all ${expandedClass === asgn._id ? 'scale-[0.98]' : ''}`}
              >
                <Card className={`group border-l-4 transition-colors ${expandedClass === asgn._id ? 'border-l-primary bg-indigo-50/30' : 'border-l-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-primary border border-gray-100">
                        <BookOpen size={24} />
                      </div>
                      <div>
                        <h3 className="font-black text-gray-900">Class {asgn.classId.className}</h3>
                        <p className="text-xs font-bold text-secondary uppercase tracking-widest">{asgn.subjectId.subjectName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:flex flex-col items-end">
                        <p className="text-xs font-bold text-gray-400 uppercase">Status</p>
                        <p className="text-xs font-black text-success">Active</p>
                      </div>
                      {expandedClass === asgn._id ? <ChevronUp className="text-primary" /> : <ChevronDown className="text-gray-300" />}
                    </div>
                  </div>
                </Card>
              </button>

              {/* 5. The Expandable Roster Area */}
              {expandedClass === asgn._id && (
                <div className="bg-white border border-gray-100 rounded-3xl p-4 shadow-inner animate-in slide-in-from-top-4 duration-300">
                  <div className="mb-4">
                    <Input 
                      placeholder="Search student name or Admission No." 
                      icon={Search}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {loadingStudents ? (
                    <div className="py-10"><LoadingSpinner size="md" /></div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-gray-400 uppercase px-2 mb-3 tracking-widest">
                        Students in Class ({filteredStudents.length})
                      </p>
                      
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map(student => (
                          <div 
                            key={student._id} 
                            className="flex items-center justify-between p-3 bg-white border border-gray-100 hover:border-primary/20 hover:bg-indigo-50/10 rounded-2xl transition-all group"
                          >
                            {/* Left Side: Initial & Name */}
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center text-[11px] font-black text-gray-400 border border-gray-100 group-hover:bg-primary group-hover:text-white transition-colors">
                                {student.name.charAt(0)}
                              </div>
                              <p className="text-sm font-bold text-gray-800 tracking-tight">
                                {student.name}
                              </p>
                            </div>

                            {/* Right Side: Roll Number Badge */}
                            <div className="flex items-center">
                              <span className="text-[9px] font-black text-primary bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 uppercase tracking-tighter">
                                Adm: {student.UID}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-10 text-center">
                           <p className="text-xs text-secondary font-medium italic">No students found matching your search.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300 mb-4">
            <Users size={32} />
          </div>
          <p className="text-secondary font-medium">No classes assigned to you yet.</p>
        </div>
      )}
    </div>
  );
};

export default MyClasses;
