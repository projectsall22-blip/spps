import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { useAuth } from '../../context/AuthContext'; // Added Import

const MainLayout = ({ role }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Logic: Pull the REAL user data from our Global Auth State
  const { user } = useAuth(); 

  // Safety Check: If for some reason user data isn't loaded yet
  if (!user) return null; 

  return (
    <div className="min-h-screen bg-background">
      {/* 1. The Global Header (Now receives real user name/role) */}
      <Header 
        user={user} 
        onMenuClick={() => setIsMobileMenuOpen(true)} 
      />

      {/* 2. The Sidebar */}
      <Sidebar 
        role={user.role} 
        isMobileOpen={isMobileMenuOpen} 
        onMobileClose={() => setIsMobileMenuOpen(false)} 
      />

      {/* 3. Main Content Area */}
      <main className="md:pl-64 pt-14 md:pt-16 pb-20 md:pb-0 transition-all duration-300">
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
          <Outlet />
        </div>
      </main>

      {/* 4. Mobile Bottom Navigation */}
      <BottomNav role={user.role} />
    </div>
  );
};

export default MainLayout;