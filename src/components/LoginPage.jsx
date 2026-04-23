import React, { useState } from 'react';
import { LogIn, AlertCircle, Loader, KeyRound } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebaseConfig';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setResetSuccess(false);

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSuccess(true);
      setResetEmail('');
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-block p-3 bg-primary-500 rounded-lg mb-4">
            <LogIn size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            {showForgotPassword ? 'Reset Password' : 'Dashboard Login'}
          </h1>
          <p className="text-primary-100">
            {showForgotPassword 
              ? 'Enter your email to receive a password reset link' 
              : 'AI Overview Tracker Research Platform'}
          </p>
          
          {/* Login Type Info */}
          {!showForgotPassword && (
            <div className="mt-6 text-primary-100 text-sm">
              <p>Login as <span className="text-white font-semibold">User</span> or <span className="text-yellow-300 font-semibold">Admin</span></p>
            </div>
          )}
        </div>

        {/* Login/Reset Form */}
        {!showForgotPassword ? (
          <form 
            onSubmit={handleSubmit}
            className="bg-white rounded-lg shadow-2xl p-8 animate-slide-up"
          >
            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded flex gap-3">
                <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-700 font-medium">Login Failed</p>
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Email */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="your@email.com"
                disabled={isLoading}
                required
              />
            </div>

            {/* Password */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="••••••••"
                disabled={isLoading}
                required
              />
            </div>

            {/* Forgot Password Link */}
            <div className="mb-8 text-right">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Forgot your password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  Sign In
                </>
              )}
            </button>
          </form>
        ) : (
          <form 
            onSubmit={handlePasswordReset}
            className="bg-white rounded-lg shadow-2xl p-8 animate-slide-up"
          >
            {/* Success Message */}
            {resetSuccess && (
              <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded flex gap-3">
                <AlertCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-green-700 font-medium">Email Sent!</p>
                  <p className="text-green-600 text-sm">Check your inbox for the password reset link</p>
                </div>
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded flex gap-3">
                <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-700 font-medium">Error</p>
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Email */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="your@email.com"
                disabled={isLoading}
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 mb-4"
            >
              {isLoading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <KeyRound size={20} />
                  Send Reset Link
                </>
              )}
            </button>

            {/* Back to Login */}
            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(false);
                setError('');
                setResetSuccess(false);
              }}
              className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-all duration-200"
            >
              Back to Login
            </button>
          </form>
        )}

        {/* Footer */}
        <p className="text-center text-primary-100 text-sm mt-8">
          🔒 Secure access • Firebase authentication
        </p>
        <p className="text-center text-primary-200 text-xs mt-2">
          For admin access or support, contact your administrator
        </p>
      </div>
    </div>
  );
};