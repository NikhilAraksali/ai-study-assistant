import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, PlatformMetrics, Classroom, Topic, Assignment } from '../types';
import { EmptyState } from '../components/EmptyState';
import {
  ShieldAlert,
  Users,
  BookOpen,
  FileText,
  Clock,
  Bot,
  Search,
  UserX,
  UserCheck,
  Trash2,
  AlertTriangle,
  Database,
  CheckCircle2,
  RefreshCw,
  Server,
  Layers,
  HardDrive
} from 'lucide-react';

export const AdminDashboardView: React.FC = () => {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mongoInputUri, setMongoInputUri] = useState('');
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectMsg, setReconnectMsg] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'content' | 'database'>('overview');
  const [userSearch, setUserSearch] = useState('');

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [mRes, uRes, cRes, dbRes] = await Promise.all([
        api.getAdminMetrics().catch(() => ({ metrics: null })),
        api.getAdminUsers().catch(() => ({ users: [] })),
        api.getAdminContentList().catch(() => ({ classrooms: [], topics: [], assignments: [] })),
        api.getDatabaseStatus().catch(() => ({ status: null }))
      ]);

      if (mRes.metrics) setMetrics(mRes.metrics);
      setUsers(uRes.users || []);
      setClassrooms(cRes.classrooms || []);
      setTopics(cRes.topics || []);
      setAssignments(cRes.assignments || []);
      if (dbRes.status) setDbStatus(dbRes.status);
    } catch (err: any) {
      console.error('Failed loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReconnectDb = async (e: React.FormEvent) => {
    e.preventDefault();
    setReconnecting(true);
    setReconnectMsg(null);
    try {
      const res = await api.reconnectDatabase(mongoInputUri.trim() || undefined);
      setDbStatus(res.status);
      setReconnectMsg(res.result?.message || 'Database status refreshed.');
      if (res.status?.connectedToMongo) {
        handleVerifyRemote();
      }
    } catch (err: any) {
      setReconnectMsg(err?.message || 'Connection failed');
    } finally {
      setReconnecting(false);
    }
  };

  const handleVerifyRemote = async () => {
    setVerifying(true);
    try {
      const res = await api.verifyDatabase();
      setVerificationResult(res.verification);
      if (res.status) setDbStatus(res.status);
    } catch (err: any) {
      setVerificationResult({ connected: false, error: err.message });
    } finally {
      setVerifying(false);
    }
  };

  const handleForceSync = async () => {
    setSyncing(true);
    try {
      const res = await api.syncDatabaseNow();
      setVerificationResult(res.verification);
      if (res.status) setDbStatus(res.status);
      setReconnectMsg('All collections pushed to MongoDB Atlas successfully!');
    } catch (err: any) {
      alert('Sync failed: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleToggleUser = async (targetUserId: string) => {
    try {
      await api.toggleDisableUser(targetUserId);
      loadAdminData();
    } catch (err: any) {
      alert('Action failed: ' + err.message);
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: 'student' | 'teacher' | 'admin') => {
    try {
      await api.updateUserRole(targetUserId, newRole);
      loadAdminData();
    } catch (err: any) {
      alert('Role change failed: ' + err.message);
    }
  };

  const handleDeleteContent = async (type: 'classroom' | 'topic' | 'assignment', id: string) => {
    if (!confirm(`Are you sure you want to remove this ${type}?`)) return;
    try {
      await api.deleteContent(type, id);
      loadAdminData();
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
    }
  };

  const filteredUsers = users.filter(
    u =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.role.toLowerCase().includes(userSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#F47C7C] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#71717A] font-mono">Loading Administration Area...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Admin Header Tile */}
      <div className="bento-card p-6 flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#161618] border border-[#242428] flex items-center justify-center text-[#F47C7C]">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="inline-flex items-center space-x-1 text-[10px] uppercase font-mono font-bold text-[#F47C7C] bg-[#F47C7C]/10 border border-[#F47C7C]/20 px-2 py-0.5 rounded mb-1">
              <span>Restricted Administration Console</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#F5F5F5]">
              Platform Control Center
            </h1>
          </div>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex border-b border-[#242428] text-xs sm:text-sm font-semibold space-x-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-2.5 transition font-mono ${
            activeTab === 'overview'
              ? 'border-b-2 border-[#5B8CFF] text-[#5B8CFF]'
              : 'text-[#71717A] hover:text-[#F5F5F5]'
          }`}
        >
          Platform Metrics Overview
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-2.5 transition font-mono ${
            activeTab === 'users'
              ? 'border-b-2 border-[#5B8CFF] text-[#5B8CFF]'
              : 'text-[#71717A] hover:text-[#F5F5F5]'
          }`}
        >
          User Accounts ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('content')}
          className={`pb-2.5 transition font-mono ${
            activeTab === 'content'
              ? 'border-b-2 border-[#5B8CFF] text-[#5B8CFF]'
              : 'text-[#71717A] hover:text-[#F5F5F5]'
          }`}
        >
          Content & Classrooms
        </button>
        <button
          onClick={() => setActiveTab('database')}
          className={`pb-2.5 transition font-mono flex items-center space-x-1.5 ${
            activeTab === 'database'
              ? 'border-b-2 border-[#5B8CFF] text-[#5B8CFF]'
              : 'text-[#71717A] hover:text-[#F5F5F5]'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>MongoDB Cloud Database</span>
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bento-card p-5 space-y-1">
            <div className="text-[11px] font-mono text-[#71717A]">Total Students</div>
            <div className="text-2xl font-bold font-mono text-[#F5F5F5]">{metrics.totalStudents}</div>
          </div>
          <div className="bento-card p-5 space-y-1">
            <div className="text-[11px] font-mono text-[#71717A]">Total Teachers</div>
            <div className="text-2xl font-bold font-mono text-[#F5F5F5]">{metrics.totalTeachers}</div>
          </div>
          <div className="bento-card p-5 space-y-1">
            <div className="text-[11px] font-mono text-[#71717A]">Active Classrooms</div>
            <div className="text-2xl font-bold font-mono text-[#F5F5F5]">{metrics.totalClassrooms}</div>
          </div>
          <div className="bento-card p-5 space-y-1">
            <div className="text-[11px] font-mono text-[#71717A]">Total AI Requests</div>
            <div className="text-2xl font-bold font-mono text-[#5B8CFF]">{metrics.totalAiRequests}</div>
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 bg-[#111113] border border-[#242428] p-2.5 rounded-xl max-w-md">
            <Search className="w-4 h-4 text-[#71717A]" />
            <input
              type="text"
              placeholder="Search user by name, email, or role..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              className="bg-transparent border-none text-xs text-[#F5F5F5] placeholder-[#71717A] focus:outline-none w-full"
            />
          </div>

          <div className="bento-card overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#161618] text-[#71717A] border-b border-[#242428] font-mono">
                  <th className="p-3.5 font-semibold uppercase tracking-wider">User</th>
                  <th className="p-3.5 font-semibold uppercase tracking-wider">Role</th>
                  <th className="p-3.5 font-semibold uppercase tracking-wider">Status</th>
                  <th className="p-3.5 font-semibold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#242428] text-[#F5F5F5]">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-[#161618] transition">
                    <td className="p-3.5">
                      <div className="font-semibold text-[#F5F5F5]">{u.name}</div>
                      <div className="text-[#71717A] font-mono text-[11px]">{u.email}</div>
                    </td>
                    <td className="p-3.5">
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u.id, e.target.value as any)}
                        className="uppercase font-mono font-semibold text-[10px] px-2 py-1 rounded-md bg-[#111113] text-[#5B8CFF] border border-[#242428] focus:outline-none focus:border-[#5B8CFF] cursor-pointer"
                      >
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border ${
                          u.isDisabled
                            ? 'bg-[#F47C7C]/10 text-[#F47C7C] border-[#F47C7C]/30'
                            : 'bg-[#65D6B0]/10 text-[#65D6B0] border-[#65D6B0]/30'
                        }`}
                      >
                        {u.isDisabled ? 'Disabled' : 'Active'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleUser(u.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                            u.isDisabled
                              ? 'bg-[#5B8CFF] text-white hover:bg-[#4879EB]'
                              : 'bg-[#F47C7C]/10 text-[#F47C7C] hover:bg-[#F47C7C]/20 border border-[#F47C7C]/20'
                          }`}
                        >
                          {u.isDisabled ? 'Enable' : 'Disable'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENT TAB */}
      {activeTab === 'content' && (
        <div className="space-y-4">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#71717A]">
            Classrooms ({classrooms.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {classrooms.map(c => (
              <div key={c.id} className="bento-card p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#F5F5F5] text-xs sm:text-sm">{c.name}</div>
                  <div className="text-xs text-[#71717A] mt-0.5 font-mono">
                    Teacher: {c.teacherName} | Code: <span className="font-mono font-bold text-[#5B8CFF]">{c.code}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteContent('classroom', c.id)}
                  className="p-2 rounded-xl bg-[#161618] text-[#F47C7C] hover:bg-[#F47C7C]/20 border border-[#242428] transition"
                  title="Delete Classroom"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DATABASE & MONGODB TAB */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          {/* Status Banner */}
          <div className={`bento-card p-6 border ${
            dbStatus?.connectedToMongo
              ? 'border-[#65D6B0]/40 bg-[#65D6B0]/5'
              : 'border-[#242428] bg-[#161618]/60'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                  dbStatus?.connectedToMongo
                    ? 'bg-[#65D6B0]/10 border-[#65D6B0]/30 text-[#65D6B0]'
                    : 'bg-[#5B8CFF]/10 border-[#5B8CFF]/30 text-[#5B8CFF]'
                }`}>
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider border ${
                      dbStatus?.connectedToMongo
                        ? 'bg-[#65D6B0]/20 border-[#65D6B0]/40 text-[#65D6B0]'
                        : 'bg-[#F2B866]/20 border-[#F2B866]/40 text-[#F2B866]'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        dbStatus?.connectedToMongo ? 'bg-[#65D6B0]' : 'bg-[#F2B866]'
                      }`} />
                      <span>{dbStatus?.connectedToMongo ? 'MongoDB Atlas Connected' : 'Local Fallback Storage'}</span>
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#F5F5F5] mt-1">
                    {dbStatus?.databaseType || 'Storage Engine'}
                  </h3>
                  <p className="text-xs text-[#A1A1AA]">
                    Database: <span className="font-mono text-[#F5F5F5] font-semibold">{dbStatus?.databaseName || 'scholar_ai_db'}</span>
                    {dbStatus?.maskedUri && (
                      <span className="ml-2 text-[#71717A] font-mono">({dbStatus.maskedUri})</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={loadAdminData}
                  className="px-3.5 py-2 rounded-xl bg-[#111113] hover:bg-[#242428] text-[#F5F5F5] border border-[#242428] text-xs font-semibold transition flex items-center space-x-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Status</span>
                </button>
              </div>
            </div>
          </div>

          {/* Collections Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#71717A] flex items-center space-x-2">
              <Layers className="w-3.5 h-3.5 text-[#5B8CFF]" />
              <span>MongoDB Collections & Record Counts</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {dbStatus?.collectionsCount && Object.entries(dbStatus.collectionsCount).map(([colName, count]) => (
                <div key={colName} className="bento-card p-4 space-y-1">
                  <div className="text-[11px] font-mono text-[#71717A] uppercase">{colName}</div>
                  <div className="text-xl font-bold font-mono text-[#F5F5F5]">{count as number}</div>
                  <div className="text-[10px] text-[#5B8CFF] font-mono">collection: {colName}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Configuration & Connect Tool */}
          <div className="bento-card p-6 space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-[#242428]">
              <Server className="w-4 h-4 text-[#5B8CFF]" />
              <div>
                <h4 className="text-xs font-bold text-[#F5F5F5]">Connect / Switch MongoDB Database</h4>
                <p className="text-[11px] text-[#71717A]">
                  Enter your MongoDB Atlas connection string (or set <code className="text-[#5B8CFF] bg-[#161618] px-1 py-0.5 rounded">MONGODB_URI</code> in environment variables).
                </p>
              </div>
            </div>

            {reconnectMsg && (
              <div className="p-3 rounded-xl bg-[#161618] border border-[#242428] text-xs text-[#F5F5F5] flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-[#65D6B0] shrink-0" />
                <span>{reconnectMsg}</span>
              </div>
            )}

            <form onSubmit={handleReconnectDb} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">
                  MongoDB Connection URI
                </label>
                <input
                  type="password"
                  value={mongoInputUri}
                  onChange={e => setMongoInputUri(e.target.value)}
                  placeholder="mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/scholar_ai_db?retryWrites=true&w=majority"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#161618] border border-[#242428] text-xs font-mono text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:border-[#5B8CFF]"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] text-[#71717A]">
                  Credentials are encrypted and processed securely on the backend.
                </p>
                <button
                  type="submit"
                  disabled={reconnecting}
                  className="px-4 py-2 bg-[#5B8CFF] hover:bg-[#4879EB] text-white font-semibold rounded-xl text-xs transition flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {reconnecting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <HardDrive className="w-3.5 h-3.5" />
                      <span>Connect & Save URI</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Real-time Diagnostics & Remote Verification */}
          <div className="bento-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#242428]">
              <div>
                <h4 className="text-xs font-bold text-[#F5F5F5] flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#65D6B0]" />
                  <span>Remote MongoDB Live Verification & Sync</span>
                </h4>
                <p className="text-[11px] text-[#71717A]">
                  Directly ping your remote Atlas cluster, verify read/write access, and view raw records stored in cloud collections.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleVerifyRemote}
                  disabled={verifying}
                  className="px-3 py-1.5 rounded-xl bg-[#161618] hover:bg-[#242428] text-[#5B8CFF] border border-[#5B8CFF]/30 text-xs font-semibold transition flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {verifying ? (
                    <div className="w-3 h-3 border-2 border-[#5B8CFF] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  <span>Ping & Check Remote</span>
                </button>
                <button
                  type="button"
                  onClick={handleForceSync}
                  disabled={syncing}
                  className="px-3 py-1.5 rounded-xl bg-[#65D6B0]/10 hover:bg-[#65D6B0]/20 text-[#65D6B0] border border-[#65D6B0]/30 text-xs font-semibold transition flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {syncing ? (
                    <div className="w-3 h-3 border-2 border-[#65D6B0] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Layers className="w-3 h-3" />
                  )}
                  <span>Force Push All to MongoDB</span>
                </button>
              </div>
            </div>

            {verificationResult && (
              <div className={`p-4 rounded-xl border ${
                verificationResult.connected
                  ? 'bg-[#65D6B0]/5 border-[#65D6B0]/30 text-[#F5F5F5]'
                  : 'bg-[#F47C7C]/5 border-[#F47C7C]/30 text-[#F5F5F5]'
              } space-y-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${verificationResult.connected ? 'bg-[#65D6B0]' : 'bg-[#F47C7C]'}`} />
                    <span className="text-xs font-bold font-mono">
                      {verificationResult.connected ? 'Atlas Cluster Ping OK' : 'Atlas Ping Failed'}
                    </span>
                    {verificationResult.latencyMs !== undefined && (
                      <span className="text-[11px] text-[#A1A1AA] font-mono">
                        ({verificationResult.latencyMs}ms latency)
                      </span>
                    )}
                  </div>
                  {verificationResult.verifiedAt && (
                    <span className="text-[10px] text-[#71717A] font-mono">
                      Verified: {new Date(verificationResult.verifiedAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>

                {verificationResult.error && (
                  <div className="text-xs text-[#F47C7C] font-mono bg-[#161618] p-2.5 rounded-lg border border-[#F47C7C]/20">
                    Error: {verificationResult.error}
                  </div>
                )}

                {verificationResult.connected && verificationResult.recentMongoUsers && (
                  <div className="space-y-2 pt-2 border-t border-[#242428]/60">
                    <div className="text-[11px] font-mono text-[#A1A1AA] flex items-center justify-between">
                      <span>Live users fetched directly from remote MongoDB <code className="text-[#5B8CFF]">users</code> collection:</span>
                      <span className="text-[#65D6B0] font-bold">Total: {verificationResult.remoteCounts?.users || 0}</span>
                    </div>
                    <div className="bg-[#0B0B0C] rounded-lg border border-[#242428] divide-y divide-[#242428]">
                      {verificationResult.recentMongoUsers.map((u: any) => (
                        <div key={u.id} className="p-2.5 flex items-center justify-between text-xs font-mono">
                          <div>
                            <span className="text-[#F5F5F5] font-semibold">{u.name}</span>
                            <span className="text-[#71717A] ml-2">({u.email})</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 rounded bg-[#161618] border border-[#242428] text-[10px] text-[#5B8CFF] uppercase font-bold">
                              {u.role}
                            </span>
                            <span className="text-[10px] text-[#71717A]">
                              ID: {u.id?.slice(0, 10)}...
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
