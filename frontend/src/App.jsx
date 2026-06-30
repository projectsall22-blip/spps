import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { usePushNotifications } from './hooks/usePushNotifications';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';
import UserAnnouncements from './pages/shared/UserAnnouncements';

// --- AUTH PAGES ---
import LandingPage from './pages/auth/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import StudentRegistration from './pages/auth/StudentRegistration';

// --- STUDENT PAGES ---
import StudentDashboard from './pages/student/Dashboard';
import StudentTimetable from './pages/student/Timetable';
import StudentAttendance from './pages/student/Attendance';
import StudentHomework from './pages/student/Homework';
import StudentMarks from './pages/student/Marks';
import StudentFees from './pages/student/Fees';
import StudentProfile from './pages/student/Profile';

// --- TEACHER PAGES ---
import TeacherDashboard from './pages/teacher/Dashboard';
import MyClasses from './pages/teacher/MyClasses';
import AttendanceMarking from './pages/teacher/Attendance';
import TeacherHomework from './pages/teacher/Homework';
import MarksEntry from './pages/teacher/MarksEntry';
import TeacherProfile from './pages/teacher/Profile';
import TeacherTimetable from './pages/teacher/TeacherTimetable';

// --- ADMIN PAGES ---
import AdminDashboard from './pages/admin/Dashboard';
import StudentDirectory from './pages/admin/StudentDirectory';
import TeacherManagement from './pages/admin/TeacherManagement';
import ClassManagement from './pages/admin/ClassManagement';
import SubjectManagement from './pages/admin/SubjectManagement';
import TeacherAssignments from './pages/admin/TeacherAssignments';
import ExamManagement from './pages/admin/ExamManagement';
import AnnouncementManagement from './pages/admin/Announcements';
import AdvancedStudentOps from './pages/admin/AdvancedStudentOps';
import RankList from './pages/admin/RankList';
import AdminAttendance from './pages/admin/AdminAttendance';
import AdminSettings from './pages/admin/Settings';
import AdminProfile from './pages/admin/AdminProfile';
import AnnualTransition from './pages/admin/AnnualTransition';
import IDCardGenerator from './pages/admin/IDCardGenerator';
import DatesheetBuilder from './pages/admin/DatesheetBuilder';
import DatesheetView from './pages/shared/DatesheetView';
import ResultGeneration from './pages/admin/ResultGeneration';
import FeeManagement from './pages/admin/FeeManagement';
import BusManagement from './pages/admin/BusManagement';
import TeacherFeeStatus from './pages/teacher/FeeStatus';
import TransferCertificate from './pages/admin/TransferCertificate';
import AdminTimetable from './pages/admin/Timetable';
import HolidayCalendar from './pages/admin/HolidayCalendar';
import HolidayCalendarView from './pages/shared/HolidayCalendarView';
import SyllabusManagement from './pages/admin/SyllabusManagement';
import SyllabusView from './pages/shared/SyllabusView';

function App() {
  const { isAuthenticated, user, loading } = useAuth();

  // Register push notifications after login
  usePushNotifications(isAuthenticated);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Routes>
      {/* ================= PUBLIC ROUTES ================= */}
      <Route path="/" element={
        isAuthenticated ? <Navigate to={`/${user.role}/dashboard`} /> : <LandingPage />
      } />
      
      <Route path="/login/:role" element={
        isAuthenticated ? <Navigate to={`/${user.role}/dashboard`} /> : <LoginPage />
      } />

      <Route path="/register" element={
        isAuthenticated ? <Navigate to={`/${user.role}/dashboard`} /> : <StudentRegistration />
      } />


      {/* ================= ADMIN ROUTES ================= */}
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <MainLayout role="admin" />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="students" element={<StudentDirectory />} />
        <Route path="students/advanced" element={<AdvancedStudentOps />} />
        <Route path="teachers" element={<TeacherManagement />} />
        <Route path="classes" element={<ClassManagement />} />
        <Route path="subjects" element={<SubjectManagement />} />
        <Route path="timetable" element={<AdminTimetable />} />
        <Route path="assignments" element={<TeacherAssignments />} />
        <Route path="exams" element={<ExamManagement />} />
        <Route path="datesheet" element={<DatesheetBuilder />} />
        <Route path="attendance" element={<AdminAttendance />} />
        <Route path="profile" element={<AdminProfile />} />  
        <Route path="marks" element={<RankList />} />
        <Route path="results" element={<ResultGeneration />} />
        <Route path="fees" element={<FeeManagement />} />
        <Route path="bus" element={<BusManagement />} />
        <Route path="announcements" element={<AnnouncementManagement />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="transition" element={<AnnualTransition />} />
        <Route path="id-cards" element={<IDCardGenerator />} />
        <Route path="transfer-certificate" element={<TransferCertificate />} />
        <Route path="holidays" element={<HolidayCalendar />} />
        <Route path="syllabus" element={<SyllabusManagement />} />
      </Route>

      {/* ================= TEACHER ROUTES ================= */}
      <Route 
        path="/teacher" 
        element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <MainLayout role="teacher" />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<TeacherDashboard />} />
        <Route path="classes" element={<MyClasses />} />
        <Route path="attendance" element={<AttendanceMarking />} />
        <Route path="homework" element={<TeacherHomework />} />
        <Route path="marks" element={<MarksEntry />} />
        <Route path="ranks" element={<RankList role="teacher" />} />
        <Route path="datesheet" element={<DatesheetView role="teacher" />} />
        <Route path="announcements" element={<UserAnnouncements />} />
        <Route path="holidays" element={<HolidayCalendarView />} />
        <Route path="syllabus" element={<SyllabusView />} />
        <Route path="profile" element={<TeacherProfile />} />
        <Route path="timetable" element={<TeacherTimetable />} />
        <Route path="fees" element={<TeacherFeeStatus />} />
      </Route>


      {/* ================= STUDENT ROUTES ================= */}
      <Route 
        path="/student" 
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <MainLayout role="student" />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="timetable" element={<StudentTimetable />} />
        <Route path="attendance" element={<StudentAttendance />} />
        <Route path="homework" element={<StudentHomework />} />
        <Route path="marks" element={<StudentMarks />} />
        <Route path="fees" element={<StudentFees />} />
        <Route path="datesheet" element={<DatesheetView role="student" />} />
        <Route path="announcements" element={<UserAnnouncements />} />
        <Route path="holidays" element={<HolidayCalendarView />} />
        <Route path="syllabus" element={<SyllabusView />} />
        <Route path="profile" element={<StudentProfile />} />
      </Route>


      {/* ================= CATCH-ALL ================= */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;