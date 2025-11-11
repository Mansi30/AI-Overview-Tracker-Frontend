import React from 'react';
import { LogOut, BarChart3, Settings } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const DashboardHeader = () => {
  const { user, logout } = useAuth();

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
            <p className="text-sm text-primary-100">Admin User</p>
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