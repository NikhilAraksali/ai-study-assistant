import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  UserPlus,
  LogIn,
  ShieldAlert,
  CheckCircle2,
  BookOpen,
  Lock,
  Mail,
  User as UserIcon
} from 'lucide-react';
import { UserRole } from '../types';

export const AuthView: React.FC = () => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState<UserRole>('student');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isRegister) {
      if (!name.trim()) return setError('Please enter your full name');
      if (!email.trim()) return setError('Please enter your email address');
      if (password.length < 6) return setError('Password must be at least 6 characters');
      if (password !== confirmPassword) return setError('Passwords do not match');

      setLoading(true);
      try {
        await register({ name, email, password, role });
      } catch (err: any) {
        setError(err.message || 'Registration failed');
      } finally {
        setLoading(false);
      }
    } else {
      if (!email.trim() || !password) return setError('Please enter email and password');
      setLoading(true);
      try {
        await login(email, password);
      } catch (err: any) {
        setError(err.message || 'Login failed');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F5F5] flex flex-col justify-center items-center py-10 px-4 sm:px-6 lg:px-8 selection:bg-[#5B8CFF]/30 selection:text-[#F5F5F5]">
      {/* Brand Header */}
      <div className="w-full max-w-md text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#111113] border border-[#242428] shadow-[0_0_24px_rgba(91,140,255,0.15)] mb-3">
          <span className="font-mono font-bold text-xl text-[#5B8CFF]">Σ</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F5F5]">
          ScholarAI
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#71717A]">
          Unified Adaptive Learning & AI Study Workspace
        </p>
      </div>

      {/* Main Bento Auth Card */}
      <div className="w-full max-w-md">
        <div className="bento-card p-6 sm:p-7 space-y-5">
          {/* Bento Mode Switcher */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[#0B0B0C] border border-[#242428]">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setError(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                !isRegister
                  ? 'bg-[#161618] text-[#F5F5F5] border border-[#242428] shadow-sm'
                  : 'text-[#71717A] hover:text-[#A1A1AA]'
              }`}
            >
              <LogIn className="w-3.5 h-3.5 text-[#5B8CFF]" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setError(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                isRegister
                  ? 'bg-[#161618] text-[#F5F5F5] border border-[#242428] shadow-sm'
                  : 'text-[#71717A] hover:text-[#A1A1AA]'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 text-[#8B7CFF]" />
              <span>Create Account</span>
            </button>
          </div>

          {/* Error Alert Box */}
          {error && (
            <div className="p-3.5 rounded-xl bg-[#F47C7C]/15 border border-[#F47C7C]/40 text-xs text-[#F5F5F5] flex flex-col space-y-2">
              <div className="flex items-start space-x-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-[#F47C7C]" />
                <span className="leading-relaxed">{error}</span>
              </div>
              {!isRegister && error.toLowerCase().includes('not exist') && (
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(true);
                    setError(null);
                  }}
                  className="self-start text-[11px] font-semibold text-[#5B8CFF] hover:text-[#7EA5FF] underline underline-offset-2 transition"
                >
                  Click here to create a new account with this email &rarr;
                </button>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isRegister && (
              <>
                {/* Role Switcher */}
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
                    Account Role
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('student')}
                      className={`py-2 px-2 rounded-xl text-xs font-semibold border text-center transition flex items-center justify-center space-x-1.5 ${
                        role === 'student'
                          ? 'bg-[#161618] border-[#5B8CFF] text-[#5B8CFF]'
                          : 'bg-[#0B0B0C] border-[#242428] text-[#71717A] hover:border-[#383840] hover:text-[#A1A1AA]'
                      }`}
                    >
                      <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                      <span>Student</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('teacher')}
                      className={`py-2 px-2 rounded-xl text-xs font-semibold border text-center transition flex items-center justify-center space-x-1.5 ${
                        role === 'teacher'
                          ? 'bg-[#161618] border-[#5B8CFF] text-[#5B8CFF]'
                          : 'bg-[#0B0B0C] border-[#242428] text-[#71717A] hover:border-[#383840] hover:text-[#A1A1AA]'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5 shrink-0" />
                      <span>Teacher</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('admin')}
                      className={`py-2 px-2 rounded-xl text-xs font-semibold border text-center transition flex items-center justify-center space-x-1.5 ${
                        role === 'admin'
                          ? 'bg-[#161618] border-[#5B8CFF] text-[#5B8CFF]'
                          : 'bg-[#0B0B0C] border-[#242428] text-[#71717A] hover:border-[#383840] hover:text-[#A1A1AA]'
                      }`}
                    >
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                      <span>Admin</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Alex Johnson"
                      className="w-full pl-9 pr-3 py-2 bg-[#0B0B0C] border border-[#242428] rounded-xl text-xs sm:text-sm text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:border-[#5B8CFF]/60 transition-colors"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  className="w-full pl-9 pr-3 py-2 bg-[#0B0B0C] border border-[#242428] rounded-xl text-xs sm:text-sm text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:border-[#5B8CFF]/60 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-[#0B0B0C] border border-[#242428] rounded-xl text-xs sm:text-sm text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:border-[#5B8CFF]/60 transition-colors"
                />
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-[#0B0B0C] border border-[#242428] rounded-xl text-xs sm:text-sm text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:border-[#5B8CFF]/60 transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#5B8CFF] hover:bg-[#4D7CF0] text-white font-semibold rounded-xl text-xs sm:text-sm shadow-[0_0_20px_rgba(91,140,255,0.25)] transition-all disabled:opacity-50 flex items-center justify-center space-x-2 mt-2"
            >
              <span>{loading ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Footer info tag */}
        <div className="mt-4 text-center">
          <p className="text-[11px] text-[#71717A] font-mono">
            Powered by Gemini AI • Enterprise Grade Security
          </p>
        </div>
      </div>
    </div>
  );
};

