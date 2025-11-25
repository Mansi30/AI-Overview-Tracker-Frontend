import React, { useState, useEffect } from 'react';
import { LogOut, BarChart3, Settings, Shield, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const DashboardHeader = () => {
  const { user, logout } = useAuth();
  const [userRole, setUserRole] = useState('user');

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) return;
      
      try {
        // Find user document by email to get role
        const usersCollection = collection(db, 'users');
        const usersSnapshot = await getDocs(usersCollection);
        
        for (const userDoc of usersSnapshot.docs) {
          const userData = userDoc.data();
          if (userData.email === user.email) {
            setUserRole(userData.role || 'user');
            break;
          }
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };

    fetchUserRole();
  }, [user]);

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      await logout();
    }
  };

  return (
    <header className="bg-gradient-to-r from-primary-700 to-primary-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white bg-opacity-20 rounded-lg">
            <BarChart3 size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Overview Tracker</h1>
            <p className="text-primary-100 text-sm">Research Analytics Dashboard</p>
          </div>
        </div>

        {/* User & Actions */}
        <div className="flex items-center gap-6">
          {/* User Info */}
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end mb-1">
              {userRole === 'admin' ? (
                <>
                  <Shield size={16} className="text-yellow-300" />
                  <span className="text-xs px-2 py-1 bg-yellow-500 bg-opacity-30 rounded font-semibold">
                    ADMIN
                  </span>
                </>
              ) : (
                <>
                  <User size={16} className="text-blue-300" />
                  <span className="text-xs px-2 py-1 bg-blue-500 bg-opacity-30 rounded font-semibold">
                    USER
                  </span>
                </>
              )}
            </div>
            <p className="font-medium text-white">{user?.email}</p>
          </div>

          {/* Settings Button */}
          <button className="p-2 hover:bg-white hover:bg-opacity-10 rounded-lg transition-all">
            <Settings size={20} />
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-medium transition-all"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};