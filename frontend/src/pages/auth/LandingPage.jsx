import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, GraduationCap, ShieldCheck, ChevronRight } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import logo from "../../assets/school_logo.png";


const LandingPage = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();

  // 1. Role Configurations - Defined here for clean, reusable code
  const roles = [
    {
      title: "Student & Parent",
      description: "Check your attendance, homework, and academic performance.",
      icon: Users,
      path: "/login/student",
      color: "bg-primary",      // Indigo
      lightBg: "bg-indigo-50",
      textColor: "text-primary"
    },
    {
      title: "Teacher Portal",
      description: "Manage your classes, mark attendance, and enter student marks.",
      icon: GraduationCap,
      path: "/login/teacher",
      color: "bg-success",      // Green
      lightBg: "bg-green-50",
      textColor: "text-success"
    },
    {
      title: "Administration",
      description: "Manage school operations, staff, students, and generate reports.",
      icon: ShieldCheck,
      path: "/login/admin",
      color: "bg-purple-600",   // Dark Purple
      lightBg: "bg-purple-50",
      textColor: "text-purple-600"
    }
  ];

  return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        
        {/* 2. Hero Header Section */}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          
<div className="max-w-3xl mx-auto space-y-4">

  {/* LINE 1: LOGO — Centered, Large, with golden glow ring matching the logo's orange border */}
  <div className="flex justify-center">
    <div className="relative">
      {/* Outer glow ring — matches the orange/gold color of the school seal */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 blur-md opacity-30 scale-110" />
      <img 
        src={logo}
        alt="Sardar Patel Public School Logo" 
        className="relative w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 object-contain drop-shadow-xl rounded-full"
      />
    </div>
  </div>

  {/* LINE 2: SCHOOL NAME — Bold, centered, below logo */}
  <div className="text-center space-y-1">
    <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight leading-tight">
      {settings.schoolName || "Sardar Patel Public School"}
    </h1>

    {/* LINE 3: HINDI SLOGAN */}
    <h2 className="text-base sm:text-lg md:text-xl font-semibold text-orange-600 tracking-wide">
      {settings.schoolSlogan || "शिक्षार्थ आइए, सेवार्थ जाइए"}
    </h2>
  </div>

  {/* VISUAL SEPARATOR */}
  <div className="flex items-center justify-center gap-3 py-2">
    <div className="h-px w-16 bg-gradient-to-r from-transparent to-gray-300" />
    <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
    <div className="h-px w-16 bg-gradient-to-l from-transparent to-gray-300" />
  </div>

  {/* LINE 4: WELCOME MESSAGE */}
  <div className="max-w-md mx-auto text-center">
    <p className="text-gray-600 font-medium text-sm md:text-base leading-relaxed">
      Welcome to our School Management System.<br />
      Please select your role to continue.
    </p>
  </div>

</div>
  </div>


      {/* 3. Role Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
        {roles.map((role, index) => (
          <button
            key={index}
            onClick={() => navigate(role.path)}
            className="group relative bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 text-left overflow-hidden"
          >
            {/* Background Decoration (Visual Polish) */}
            <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full transition-transform group-hover:scale-150 duration-500 opacity-10 ${
              role.title === "Student & Parent" ? "bg-indigo-500" :
              role.title === "Teacher Portal" ? "bg-green-500" : "bg-purple-500"
            }`} />

            {/* Icon Container */}
            <div className={`relative w-16 h-16 ${role.color} rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-inherit`}>
              <role.icon size={32} />
            </div>

            {/* Text Content */}
            <div className="relative">
              <h2 className="text-xl font-bold text-gray-900 mb-2">{role.title}</h2>
              <p className="text-secondary text-sm leading-relaxed mb-6">
                {role.description}
              </p>

              
              <div className={`flex items-center gap-2 font-bold text-sm ${role.textColor}`}>
                {role.title === "Student & Parent" && "Access Portal"}
                {role.title === "Teacher Portal" && "Staff Login"}
                {role.title === "Administration" && "Admin Dashboard"}
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* 4. Simple Footer */}
      <footer className="mt-16 text-center space-y-2">
        <p className="text-xs font-black text-gray-900 uppercase tracking-widest">
          Academic Session {settings.currentAcademicYear}
        </p>
        <p className="text-[11px] text-gray-400 font-medium tracking-wide mt-4">
          Designed &amp; Developed by{' '}
          <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">
            Avatri Tech
          </span>
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
