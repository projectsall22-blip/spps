import React, { useState, useEffect } from 'react';
import { Menu, Bell, User, LogOut, ChevronDown, CheckCheck, Clock, Info } from 'lucide-react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';
import { useSettings } from '../../context/SettingsContext';

const Header = ({ user, onMenuClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { settings } = useSettings(); 

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const fetchNotifs = async () => {
    try {
      
      const res = await API.get('/users/notifications');
      
      setNotifications(res.data);
      
    } catch (err) {
      console.error(err.message);
      console.error(err.response?.data);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await API.put('/users/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    
    if (user) {
      fetchNotifs();
      const interval = setInterval(() => {
        fetchNotifs();
      }, 10000);
      return () => {
        clearInterval(interval);
      };
    }
  }, [user, location.pathname]);

  return (
    <header className="fixed top-0 left-0 right-0 h-14 md:h-16 bg-white border-b border-gray-100 z-50 flex items-center px-4 md:px-6">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="p-2 -ml-2 hover:bg-gray-50 rounded-lg md:hidden text-gray-600">
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xl">DV</div>
          <h1 className="font-bold text-gray-800 hidden sm:block tracking-tight">
            {settings.schoolName}
          </h1>
        </div>
      </div>

      <div className="flex-grow"></div>

      <div className="flex items-center gap-2 md:gap-4 relative">
        
        {/* BELL ICON CONTAINER */}
        <div className="relative">
          <button 
            onClick={() => {
              setShowNotifMenu(!showNotifMenu);
              setShowProfileMenu(false);
              fetchNotifs(); // Force refresh on click
            }}
            className={`p-2 rounded-full transition-all relative ${showNotifMenu ? 'bg-indigo-50 text-primary' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Bell size={22} />
            
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-5 h-5 bg-danger text-white text-[11px] font-black rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowNotifMenu(false)}></div>
              
              <div className="fixed inset-x-4 top-16 md:absolute md:right-0 md:left-auto md:inset-x-auto md:mt-3 w-auto md:w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-xs font-black text-gray-800 uppercase tracking-tight">Alerts</h3>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
                      <CheckCheck size={12} /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                  {notifications.length > 0 ? (
                    notifications.map((n) => (
                      <Link
                        key={n._id}
                        to={n.link}
                        onClick={() => {
                          setShowNotifMenu(false);
                        }}
                        className={`flex items-start gap-3 px-4 py-4 hover:bg-gray-50 transition-colors border-b border-gray-50 relative ${!n.isRead ? 'bg-indigo-50/20' : ''}`}
                      >
                        {!n.isRead && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
                        <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${!n.isRead ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
                          <Info size={14} />
                        </div>
                        <div className="flex-grow">
                          <p className={`text-xs leading-snug mb-1 ${!n.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-500'}`}>
                            {n.message}
                          </p>
                          <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400 uppercase">
                            <Clock size={10} /> {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="py-10 text-center opacity-30 flex flex-col items-center">
                      <Bell size={40} className="mb-2" />
                      <p className="text-xs font-bold uppercase">No New Alerts</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* PROFILE SECTION */}
        <div className="relative">
          <button 
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifMenu(false);
            }}
            className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded-full transition-all"
          >
            <div className="w-8 h-8 md:w-9 md:h-9 bg-indigo-50 rounded-full flex items-center justify-center text-primary border border-indigo-100 shadow-sm overflow-hidden">
              {user.profileImage ? (
                <img 
                  src={user.profileImage} 
                  alt="Profile" 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <User size={20} />
              )}
            </div>
            <ChevronDown size={14} className={`text-gray-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
          </button>

          {showProfileMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowProfileMenu(false)}></div>
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-20 py-2 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-2 border-b border-gray-50">
                  <p className="text-xs font-bold text-gray-900">{user.name}</p>
                  <p className="text-[10px] text-secondary uppercase font-bold">{user.role}</p>
                </div>
                <button onClick={() => { setShowProfileMenu(false); navigate(`/${user.role}/profile`); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 text-left">
                  <User size={16} /> My Profile
                </button>
                <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-red-50 text-left">
                  <LogOut size={16} /> Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;