import React, { useState } from 'react';
import { ClassroomMeeting } from '../types';
import { api } from '../services/api';
import { createGoogleMeetSpace, signInWithGoogleMeet } from '../services/googleAuth';
import {
  Video,
  Radio,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  Clock,
  Plus,
  Trash2,
  PhoneOff,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  X
} from 'lucide-react';

interface ClassroomMeetSectionProps {
  classroomId: string;
  classroomName: string;
  isTeacher: boolean;
  meetings: ClassroomMeeting[];
  onRefreshMeetings: () => void;
}

export const ClassroomMeetSection: React.FC<ClassroomMeetSectionProps> = ({
  classroomId,
  classroomName,
  isTeacher,
  meetings,
  onRefreshMeetings
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [customLink, setCustomLink] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeMeetings = meetings.filter(m => m.status === 'active');
  const upcomingMeetings = meetings.filter(m => m.status === 'scheduled');
  const pastMeetings = meetings.filter(m => m.status === 'ended');

  const copyMeetLink = (meeting: ClassroomMeeting) => {
    navigator.clipboard.writeText(meeting.meetLink);
    setCopiedId(meeting.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      let finalMeetLink = customLink.trim();
      let meetCode: string | undefined = undefined;

      // If instructor didn't provide a custom link, generate Google Meet room space
      if (!finalMeetLink) {
        const space = await createGoogleMeetSpace();
        finalMeetLink = space.meetingUri;
        meetCode = space.meetingCode;
      }

      await api.createMeeting(classroomId, {
        title: title.trim() || `${classroomName} Live Class`,
        description: description.trim(),
        meetLink: finalMeetLink,
        meetingCode: meetCode,
        scheduledAt: isScheduled && scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(),
        status: isScheduled ? 'scheduled' : 'active'
      });

      setTitle('');
      setDescription('');
      setCustomLink('');
      setScheduledAt('');
      setIsScheduled(false);
      setShowCreateModal(false);
      onRefreshMeetings();
    } catch (err: any) {
      console.error('Failed to create meeting:', err);
      setError(err.message || 'Failed to create Google Meet session.');
    } finally {
      setCreating(false);
    }
  };

  const handleEndMeeting = async (meeting: ClassroomMeeting) => {
    if (!window.confirm(`Are you sure you want to end the live Google Meet session "${meeting.title}"?`)) {
      return;
    }
    try {
      await api.updateMeeting(classroomId, meeting.id, { status: 'ended' });
      onRefreshMeetings();
    } catch (err: any) {
      alert(err.message || 'Failed to end meeting');
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!window.confirm('Delete this meeting record?')) return;
    try {
      await api.deleteMeeting(classroomId, meetingId);
      onRefreshMeetings();
    } catch (err: any) {
      alert(err.message || 'Failed to delete meeting');
    }
  };

  return (
    <div className="space-y-4">
      {/* Active Live Call Banner if any meeting is active */}
      {activeMeetings.length > 0 && (
        <div className="rounded-2xl p-5 bg-gradient-to-r from-[#161618] via-[#1A1A1E] to-[#161618] border border-[#5B8CFF]/40 shadow-[0_4px_24px_rgba(91,140,255,0.15)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#5B8CFF]/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-[#F47C7C]/20 border border-[#F47C7C]/40 text-[#F47C7C] text-[10px] font-bold tracking-wide uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F47C7C] animate-ping inline-block" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F47C7C] inline-block -ml-2" />
                  <span>Live on Google Meet</span>
                </span>
                <span className="text-[11px] font-mono text-[#A1A1AA]">
                  Host: {activeMeetings[0].teacherName}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-[#F5F5F5]">
                {activeMeetings[0].title}
              </h2>
              {activeMeetings[0].description && (
                <p className="text-xs text-[#A1A1AA] max-w-xl leading-relaxed">
                  {activeMeetings[0].description}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <a
                href={activeMeetings[0].meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 bg-[#5B8CFF] hover:bg-[#4879EB] text-white font-semibold rounded-xl text-xs transition flex items-center space-x-2 shadow-[0_2px_14px_rgba(91,140,255,0.4)] hover:scale-[1.02] active:scale-[0.98]"
              >
                <Video className="w-4 h-4" />
                <span>{isTeacher ? 'Join My Google Meet' : 'Join Google Meet Live'}</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>

              <button
                onClick={() => copyMeetLink(activeMeetings[0])}
                className="p-2.5 rounded-xl bg-[#111113] hover:bg-[#242428] text-[#A1A1AA] hover:text-[#F5F5F5] border border-[#242428] transition"
                title="Copy Google Meet Link"
              >
                {copiedId === activeMeetings[0].id ? (
                  <Check className="w-4 h-4 text-[#65D6B0]" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>

              {isTeacher && (
                <button
                  onClick={() => handleEndMeeting(activeMeetings[0])}
                  className="px-3 py-2.5 rounded-xl bg-[#F47C7C]/10 hover:bg-[#F47C7C]/20 text-[#F47C7C] border border-[#F47C7C]/30 text-xs font-semibold transition flex items-center space-x-1.5"
                  title="End Live Class"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                  <span>End Call</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Meetings Container */}
      <div className="bento-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#242428]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#5B8CFF]/10 border border-[#5B8CFF]/20 flex items-center justify-center text-[#5B8CFF]">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F5F5F5] flex items-center space-x-2">
                <span>Google Meet Sessions</span>
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-md bg-[#161618] border border-[#242428] text-[#A1A1AA]">
                  {isTeacher ? 'Instructor Host' : 'Student Access'}
                </span>
              </h3>
              <p className="text-[11px] text-[#71717A]">
                {isTeacher
                  ? 'Start or schedule live video lectures via Google Meet for your students.'
                  : 'Join live class lectures and review scheduled meetings created by your instructor.'}
              </p>
            </div>
          </div>

          {/* Only Teachers can create a meeting */}
          {isTeacher ? (
            <button
              onClick={() => {
                setError(null);
                setShowCreateModal(true);
              }}
              className="px-3.5 py-2 bg-[#5B8CFF] hover:bg-[#4879EB] text-white font-semibold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-[0_2px_12px_rgba(91,140,255,0.3)] shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Start Google Meet</span>
            </button>
          ) : (
            <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#111113] border border-[#242428] text-[11px] text-[#71717A]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#65D6B0]" />
              <span>Meetings hosted by Teacher</span>
            </div>
          )}
        </div>

        {/* Meetings List */}
        <div className="pt-4 space-y-3">
          {meetings.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-[#161618] border border-[#242428] flex items-center justify-center mx-auto text-[#71717A]">
                <Radio className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-[#A1A1AA]">No Google Meet sessions scheduled</p>
              <p className="text-[11px] text-[#71717A] max-w-sm mx-auto">
                {isTeacher
                  ? 'Click "Start Google Meet" to launch an instant live class or schedule an upcoming video session.'
                  : 'When your instructor begins a live lecture or schedules a call, the Google Meet join link will appear right here.'}
              </p>
            </div>
          ) : (
            meetings.map(meeting => {
              const isLive = meeting.status === 'active';
              const isSched = meeting.status === 'scheduled';
              const isEnded = meeting.status === 'ended';

              return (
                <div
                  key={meeting.id}
                  className={`p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isLive
                      ? 'bg-[#5B8CFF]/5 border-[#5B8CFF]/40'
                      : isSched
                      ? 'bg-[#161618] border-[#242428] hover:border-[#383840]'
                      : 'bg-[#111113]/60 border-[#242428]/60 opacity-70'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-[#F5F5F5]">{meeting.title}</h4>
                      {isLive && (
                        <span className="px-2 py-0.5 rounded-md bg-[#F47C7C]/20 border border-[#F47C7C]/30 text-[#F47C7C] text-[10px] font-bold uppercase tracking-wider">
                          Live Now
                        </span>
                      )}
                      {isSched && (
                        <span className="px-2 py-0.5 rounded-md bg-[#F2B866]/20 border border-[#F2B866]/30 text-[#F2B866] text-[10px] font-semibold">
                          Scheduled
                        </span>
                      )}
                      {isEnded && (
                        <span className="px-2 py-0.5 rounded-md bg-[#242428] text-[#71717A] text-[10px] font-mono">
                          Completed
                        </span>
                      )}
                    </div>

                    {meeting.description && (
                      <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                        {meeting.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-[#71717A] pt-1">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-[#5B8CFF]" />
                        <span>{new Date(meeting.scheduledAt || meeting.createdAt).toLocaleString()}</span>
                      </span>
                      {meeting.meetingCode && (
                        <span className="text-[#A1A1AA]">
                          Code: <span className="text-[#5B8CFF] font-semibold">{meeting.meetingCode}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                    {!isEnded && (
                      <a
                        href={meeting.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`px-3.5 py-1.5 rounded-xl font-semibold text-xs transition flex items-center space-x-1.5 ${
                          isLive
                            ? 'bg-[#5B8CFF] hover:bg-[#4879EB] text-white shadow-[0_2px_10px_rgba(91,140,255,0.3)]'
                            : 'bg-[#161618] hover:bg-[#242428] text-[#F5F5F5] border border-[#242428]'
                        }`}
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Join Meet</span>
                        <ExternalLink className="w-3 h-3 opacity-75" />
                      </a>
                    )}

                    <button
                      onClick={() => copyMeetLink(meeting)}
                      className="p-1.5 rounded-lg bg-[#111113] hover:bg-[#242428] text-[#A1A1AA] hover:text-[#F5F5F5] border border-[#242428] transition text-xs"
                      title="Copy Link"
                    >
                      {copiedId === meeting.id ? (
                        <Check className="w-3.5 h-3.5 text-[#65D6B0]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {isTeacher && (
                      <>
                        {isLive && (
                          <button
                            onClick={() => handleEndMeeting(meeting)}
                            className="p-1.5 rounded-lg bg-[#F47C7C]/10 hover:bg-[#F47C7C]/20 text-[#F47C7C] border border-[#F47C7C]/20 transition"
                            title="End Call"
                          >
                            <PhoneOff className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteMeeting(meeting.id)}
                          className="p-1.5 rounded-lg hover:bg-[#F47C7C]/10 text-[#71717A] hover:text-[#F47C7C] border border-transparent hover:border-[#F47C7C]/20 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Teacher Create Meeting Modal */}
      {showCreateModal && isTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !creating && setShowCreateModal(false)}
          />

          <div className="relative w-full max-w-lg rounded-2xl bg-[#111113] border border-[#242428] shadow-2xl p-6 z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-[#242428] pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-[#5B8CFF]/10 border border-[#5B8CFF]/20 flex items-center justify-center text-[#5B8CFF]">
                  <Video className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-[#F5F5F5]">Host Google Meet Class</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
                className="text-[#71717A] hover:text-[#F5F5F5] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-[#F47C7C]/10 border border-[#F47C7C]/20 text-[#F47C7C] text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateMeeting} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={`e.g. ${classroomName} - Live Lecture & Q&A`}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#161618] border border-[#242428] text-xs text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:border-[#5B8CFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">
                  Description / Agenda (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Topics to be covered, questions to prepare..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#161618] border border-[#242428] text-xs text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:border-[#5B8CFF]"
                />
              </div>

              {/* Schedule vs Instant toggle */}
              <div className="p-3 rounded-xl bg-[#161618] border border-[#242428] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#F5F5F5] flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#F2B866]" />
                    <span>Schedule for Later</span>
                  </span>
                  <input
                    type="checkbox"
                    id="scheduleToggle"
                    checked={isScheduled}
                    onChange={e => setIsScheduled(e.target.checked)}
                    className="w-4 h-4 rounded border-[#242428] text-[#5B8CFF] focus:ring-0 cursor-pointer"
                  />
                </div>

                {isScheduled && (
                  <div>
                    <label className="block text-[11px] text-[#A1A1AA] mb-1">Date & Time</label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={e => setScheduledAt(e.target.value)}
                      required={isScheduled}
                      className="w-full px-3 py-2 rounded-lg bg-[#111113] border border-[#242428] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#5B8CFF]"
                    />
                  </div>
                )}
              </div>

              {/* Custom meet link override (optional) */}
              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">
                  Google Meet Link (Optional)
                </label>
                <input
                  type="text"
                  value={customLink}
                  onChange={e => setCustomLink(e.target.value)}
                  placeholder="Leave empty to generate automatically via Google Meet API"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#161618] border border-[#242428] text-xs text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:border-[#5B8CFF]"
                />
                <p className="text-[10px] text-[#71717A] mt-1">
                  Leaving this blank will automatically create an official Google Meet room space for you.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  className="px-4 py-2 bg-[#161618] hover:bg-[#242428] text-[#A1A1AA] font-semibold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-[#5B8CFF] hover:bg-[#4879EB] text-white font-semibold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-[0_2px_12px_rgba(91,140,255,0.3)] disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating Space...</span>
                    </>
                  ) : (
                    <>
                      <Video className="w-3.5 h-3.5" />
                      <span>{isScheduled ? 'Schedule Session' : 'Start Live Class'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
