import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp, authFetch } from '../context/AppContext';
import { environment } from '@env/environment';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  Building,
  Users,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface AttendanceRecord {
  _id?: string;
  staffId: string;
  hospitalId?: string;
  date: string; // ISO string YYYY-MM-DD
  clockInTime: string;
  status: 'Present' | 'Absent' | 'On Leave';
}

export function Attendance() {
  const { t } = useTranslation();
  const { currentUser, hospitals, staff, loading: appLoading } = useApp();
  const userRole = currentUser?.role || '';

  // Get current user's staff details
  const currentStaff = staff.find((s) => {
    const uId = typeof s.userId === 'object' && s.userId ? (s.userId as any)._id : s.userId;
    const uName = typeof s.userId === 'object' && s.userId ? (s.userId as any).username : s.username;
    return uId === currentUser?.id || uName === currentUser?.username;
  });

  // States
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth() + 1); // 1-indexed

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [todayStatus, setTodayStatus] = useState<{ marked: boolean; clockInTime?: string }>({
    marked: false,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modal Dialog States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedDayNum, setSelectedDayNum] = useState<number | null>(null);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'Present' | 'Absent' | 'On Leave' | 'Unmark' | null>(null);

  // Initialize selected values for Admin or Staff
  useEffect(() => {
    if (userRole && userRole !== 'Admin' && currentStaff) {
      setSelectedStaffId(currentStaff.id || '');
      setSelectedBranchId(currentStaff.assignedHospitalId || '');
    }
  }, [userRole, currentStaff]);

  // Load today's check-in status (only for non-Admins who represent actual staff members)
  const fetchTodayStatus = async () => {
    if (userRole === 'Admin') return;
    try {
      const res = await authFetch(`${environment.mainBackendUrl}/attendance/status/today`);
      if (res.ok) {
        const data = await res.json();
        setTodayStatus(data);
      }
    } catch (err) {
      console.error('Error fetching today status:', err);
    }
  };

  // Load monthly logs for the selected staff member
  const fetchMonthlyAttendance = async () => {
    if (!selectedStaffId) return;
    setLoading(true);
    setError(null);
    try {
      let url = '';
      if (userRole === 'Admin') {
        url = `${environment.mainBackendUrl}/attendance/staff/${selectedStaffId}?year=${currentYear}&month=${currentMonth}`;
      } else {
        url = `${environment.mainBackendUrl}/attendance/my-attendance?year=${currentYear}&month=${currentMonth}`;
      }
      const res = await authFetch(url);
      if (!res.ok) throw new Error('Failed to load attendance records');
      const data = await res.json();
      setRecords(data);
    } catch (err: any) {
      setError(err.message || 'Error loading records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayStatus();
  }, [userRole]);

  useEffect(() => {
    fetchMonthlyAttendance();
  }, [selectedStaffId, currentYear, currentMonth]);

  // Clock In Action
  const handleClockIn = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${environment.mainBackendUrl}/attendance/clock-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: todayDateStr }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to check in');
      }
      await fetchTodayStatus();
      await fetchMonthlyAttendance();
    } catch (err: any) {
      setError(err.message || 'Check-in failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Unmark/Delete Attendance Action
  const handleUnmark = async (dateStr?: string) => {
    setActionLoading(true);
    setError(null);
    try {
      let url = `${environment.mainBackendUrl}/attendance/unmark`;
      const queryParams = new URLSearchParams();
      if (dateStr) queryParams.append('date', dateStr);
      if (userRole === 'Admin') queryParams.append('staffId', selectedStaffId);
      
      const qStr = queryParams.toString();
      if (qStr) url += `?${qStr}`;

      const res = await authFetch(url, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to unmark attendance');
      }
      await fetchTodayStatus();
      await fetchMonthlyAttendance();
    } catch (err: any) {
      setError(err.message || 'Unmark failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Modify past attendance status
  const handleModifyAttendance = async (dateStr: string, status: string) => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${environment.mainBackendUrl}/attendance/modify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateStr,
          status,
          staffId: userRole === 'Admin' ? selectedStaffId : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to update attendance');
      }
      await fetchTodayStatus();
      await fetchMonthlyAttendance();
    } catch (err: any) {
      setError(err.message || 'Failed to update');
    } finally {
      setActionLoading(false);
    }
  };

  // Save changes from Modal Dialog
  const handleSaveStatus = async () => {
    if (!selectedDateStr || !selectedStatus) return;
    if (selectedStatus === 'Unmark') {
      await handleUnmark(selectedDateStr);
    } else {
      await handleModifyAttendance(selectedDateStr, selectedStatus);
    }
    setIsModalOpen(false);
  };

  // Filter staff by hospital ID for Admin view
  const filteredStaff = staff.filter(
    (s) => !selectedBranchId || s.assignedHospitalId === selectedBranchId,
  );

  // If selected branch changed and existing staff isn't in it, clear selection
  useEffect(() => {
    if (userRole === 'Admin' && selectedBranchId) {
      const isStillValid = filteredStaff.some((s) => s.id === selectedStaffId);
      if (!isStillValid) {
        setSelectedStaffId('');
      }
    }
  }, [selectedBranchId]);

  // Calendar rendering helpers
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 = Sun, 6 = Sat

  const monthNames = [
    t('common.months.january', 'January'),
    t('common.months.february', 'February'),
    t('common.months.march', 'March'),
    t('common.months.april', 'April'),
    t('common.months.may', 'May'),
    t('common.months.june', 'June'),
    t('common.months.july', 'July'),
    t('common.months.august', 'August'),
    t('common.months.september', 'September'),
    t('common.months.october', 'October'),
    t('common.months.november', 'November'),
    t('common.months.december', 'December'),
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Find staff info matching selected ID
  const activeStaffMember = staff.find(
    (s) => s.id === selectedStaffId,
  );
  // Get off-days from staff profile (fallback to weekends if empty)
  const unavailableDaysList = activeStaffMember?.unavailableOnDays || ['Saturday', 'Sunday'];

  // Check stats
  const todayDateStr = (() => {
    const today = new Date();
    const y = today.getFullYear().toString();
    const m = (today.getMonth() + 1).toString().padStart(2, '0');
    const d = today.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  })();

  const presentDays = records.filter((r) => r.status === 'Present').length;
  const leaveDays = records.filter((r) => r.status === 'On Leave').length;

  // Calculate absent days (past days not checked-in and not on weekend/unavailable day)
  let absentDays = 0;
  const now = new Date();
  for (let d = 1; d <= daysInMonth; d++) {
    const checkDate = new Date(currentYear, currentMonth - 1, d);
    // Only check past or current days
    if (checkDate > now) continue;

    const yStr = currentYear.toString();
    const mStr = currentMonth.toString().padStart(2, '0');
    const dStr = d.toString().padStart(2, '0');
    const checkDateStr = `${yStr}-${mStr}-${dStr}`;

    const log = records.find((r) => r.date.startsWith(checkDateStr));
    const isAbsentLog = log?.status === 'Absent';
    
    if (isAbsentLog || !log) {
      const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'long' });
      const isUnavailable = unavailableDaysList.includes(dayName);
      if (isAbsentLog || !isUnavailable) {
        absentDays++;
      }
    }
  }

  const attendanceRate = daysInMonth > 0 ? Math.round((presentDays / (presentDays + absentDays || 1)) * 100) : 0;

  const formattedSelectedDate = selectedDayNum
    ? new Date(currentYear, currentMonth - 1, selectedDayNum).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  // Renders loaders
  if (!currentUser || appLoading) {
    return (
      <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <Header 
          title={t('nav.attendance') || 'Attendance Tracker'} 
          subtitle={t('attendance.subtitle', 'Log daily presence and check monthly logs.')} 
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <RefreshCw size={24} className="animate-spin text-primary-500" />
            <span>{t('attendance.loading', 'Syncing attendance records...')}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <Header
        title={t('nav.attendance') || 'Attendance Tracker'}
        subtitle={t('attendance.subtitle', 'Log daily presence and check monthly logs.')}
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="max-w-screen-2xl mx-auto space-y-6 animate-fade-in">
          
          {/* Admin Filters Controls */}
          {userRole === 'Admin' && (
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                {/* Branch Selector */}
                <div className="flex items-center gap-2">
                  <Building size={16} className="text-slate-400 dark:text-slate-500" />
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition"
                  >
                    <option value="">{t('reports.allBranches', 'All Branches')}</option>
                    {hospitals.map((h: any) => (
                      <option key={h.id || h._id} value={h.id || h._id}>{h.name}</option>
                    ))}
                  </select>
                </div>

                {/* Staff/Doctor Selector */}
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-slate-400 dark:text-slate-500" />
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition"
                  >
                    <option value="">{t('attendance.selectStaff', 'Select Doctor / Staff')}</option>
                    {filteredStaff.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name || `${s.firstName} ${s.lastName || ''}`} ({s.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-300">
              <AlertCircle size={18} className="shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {!selectedStaffId ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
              <Users size={48} className="text-slate-350 dark:text-slate-500" />
              <h3 className="font-bold text-slate-800 dark:text-slate-100">
                {t('attendance.noSelectionHeader', 'No Staff Member Selected')}
              </h3>
              <p className="text-sm text-slate-500 max-w-sm">
                {t('attendance.noSelectionBody', 'Please select a clinic branch and employee from the filters above to inspect their monthly attendance.')}
              </p>
            </div>
          ) : (
            <>
              {/* Statistics Row */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {t('attendance.totalDays', 'Total Month Days')}
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-slate-800 dark:text-white font-mono">{daysInMonth}</span>
                    <CalendarIcon size={20} className="text-slate-400 dark:text-slate-500" />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {t('attendance.present', 'Days Present')}
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">{presentDays}</span>
                    <CheckCircle2 size={20} className="text-emerald-500" />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {t('attendance.leaveDaysCount', 'Days on Leave')}
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-amber-500 dark:text-amber-400 font-mono">{leaveDays}</span>
                    <Clock size={20} className="text-amber-500" />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {t('attendance.absent', 'Days Absent')}
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-rose-500 dark:text-rose-400 font-mono">{absentDays}</span>
                    <XCircle size={20} className="text-rose-500" />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {t('attendance.rate', 'Attendance Rate')}
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-primary-600 dark:text-primary-400 font-mono">{attendanceRate}%</span>
                    <UserCheck size={20} className="text-primary-500" />
                  </div>
                </div>
              </div>

              {/* Attendance Workspace layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* One Click Clock-in Card (Staff/Doctor view only) */}
                {userRole !== 'Admin' && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col justify-between space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Clock className="text-primary-500" size={18} />
                        <h3 className="font-bold text-slate-850 dark:text-white">
                          {t('attendance.clockInCard', 'Daily Duty Check-In')}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500">
                        {t('attendance.clockInInfo', 'Click the button below once daily when you report for duty at your assigned clinic branch.')}
                      </p>
                    </div>

                    <div className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl space-y-4 bg-slate-50/50 dark:bg-slate-800/40 w-full">
                      {todayStatus.marked ? (
                        <div className="flex flex-col items-center gap-3 text-center w-full">
                          <CheckCircle2 size={40} className="text-emerald-500 animate-pulse" />
                          <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                            {t('attendance.alreadyMarked', 'Logged for Duty Today')}
                          </span>
                          
                          <div className="w-full bg-slate-100 dark:bg-slate-700/50 p-3 rounded-xl space-y-1.5 text-xs font-mono text-slate-655 dark:text-slate-300">
                            {todayStatus.clockInTime && (
                              <div className="flex justify-between">
                                <span>{t('attendance.clockedTime', 'Checked in at:')}</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{new Date(todayStatus.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            )}
                          </div>

                          <Button
                            variant="danger"
                            onClick={() => {
                              setIsConfirmOpen(true);
                            }}
                            disabled={actionLoading}
                            className="flex justify-center items-center gap-2 rounded-xl text-xs py-1.5 px-3 w-full"
                          >
                            {actionLoading ? (
                              <RefreshCw size={14} className="animate-spin text-white" />
                            ) : (
                              <XCircle size={14} />
                            )}
                            {t('attendance.cancelCheckIn', 'Cancel Check-In')}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3 text-center w-full">
                          <Clock size={36} className="text-slate-400 animate-pulse" />
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            {t('attendance.notClockedToday', 'Not Checked in yet today.')}
                          </span>
                          <Button
                            onClick={handleClockIn}
                            disabled={actionLoading}
                            className="w-full flex justify-center items-center gap-2 rounded-xl text-sm"
                          >
                            {actionLoading ? (
                              <>
                                <RefreshCw size={16} className="animate-spin text-white" />
                                <span>{t('common.saving', 'Saving...')}</span>
                              </>
                            ) : (
                              <>
                                <UserCheck size={16} />
                                {t('attendance.clockInBtn', 'Clock In')}
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Monthly Calendar Tracker */}
                <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden ${userRole === 'Admin' ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
                  {/* Calendar Header */}
                  <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <CalendarIcon className="text-primary-500" size={16} />
                      {t('attendance.monthlyCalendar', 'Monthly Duty Calendar')}
                    </h3>

                    {/* Month Picker Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePrevMonth}
                        className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200 px-2 min-w-[120px] text-center">
                        {monthNames[currentMonth - 1]} {currentYear}
                      </span>
                      <button
                        onClick={handleNextMonth}
                        className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Calendar Grid */}
                  <div className="p-6">
                    {loading ? (
                      <div className="h-64 flex flex-col items-center justify-center text-slate-450 gap-2">
                        <RefreshCw size={24} className="animate-spin text-primary-500" />
                        <span className="text-xs">{t('attendance.loadingLogs', 'Fetching attendance records...')}</span>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Weekday headers */}
                        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
                          <div>{t('common.days.sun', 'Sun')}</div>
                          <div>{t('common.days.mon', 'Mon')}</div>
                          <div>{t('common.days.tue', 'Tue')}</div>
                          <div>{t('common.days.wed', 'Wed')}</div>
                          <div>{t('common.days.thu', 'Thu')}</div>
                          <div>{t('common.days.fri', 'Fri')}</div>
                          <div>{t('common.days.sat', 'Sat')}</div>
                        </div>

                        {/* Month Days Grid */}
                        <div className="grid grid-cols-7 gap-2">
                          {/* Pre-fill empty days from previous month */}
                          {Array.from({ length: firstDayIndex }).map((_, i) => (
                            <div key={`empty-${i}`} className="aspect-square bg-slate-50/30 dark:bg-slate-800/10 rounded-xl" />
                          ))}

                          {/* Render actual days */}
                          {Array.from({ length: daysInMonth }).map((_, i) => {
                            const dayNum = i + 1;
                            
                            // Timezone independent date formulation representing local date
                            const yearStr = currentYear.toString();
                            const monthStr = currentMonth.toString().padStart(2, '0');
                            const dayStr = dayNum.toString().padStart(2, '0');
                            const dateStr = `${yearStr}-${monthStr}-${dayStr}`;

                            const checkDate = new Date(currentYear, currentMonth - 1, dayNum);

                            // Find log for this day
                            const log = records.find((r) => r.date.startsWith(dateStr));
                            const isPresent = log?.status === 'Present';
                            const isOnLeave = log?.status === 'On Leave';
                            const isLoggedAbsent = log?.status === 'Absent';
                            
                            const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'long' });
                            const isUnavailable = unavailableDaysList.includes(dayName);

                            const isFuture = checkDate > now;
                            const isToday = dateStr === todayDateStr;

                            // Color states
                            let dayStyle = 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-350 border border-slate-200 dark:border-slate-700';
                            let statusText = '';

                             if (isPresent) {
                              dayStyle = 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-500 hover:bg-emerald-50/10 dark:hover:bg-emerald-950/10';
                              statusText = t('attendance.presentSmall', 'P');
                            } else if (isOnLeave) {
                              dayStyle = 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 border-2 border-amber-500 hover:bg-amber-50/10 dark:hover:bg-amber-950/10';
                              statusText = t('attendance.leaveSmall', 'L');
                            } else if (isLoggedAbsent) {
                              dayStyle = 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-455 border-2 border-rose-500 hover:bg-rose-50/10 dark:hover:bg-rose-950/10';
                              statusText = t('attendance.absentSmall', 'A');
                            } else if (isFuture) {
                              dayStyle = 'bg-slate-50/50 dark:bg-slate-800/30 text-slate-350 dark:text-slate-655 border border-dashed border-slate-200/60 dark:border-slate-850 cursor-not-allowed';
                            } else if (isUnavailable) {
                              dayStyle = 'bg-slate-100/70 dark:bg-slate-700/30 text-slate-450 dark:text-slate-500 border border-slate-200/60 dark:border-slate-750';
                              statusText = t('attendance.offSmall', 'Off');
                            } else {
                              dayStyle = 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-455 border-2 border-rose-500 hover:bg-rose-50/10 dark:hover:bg-rose-950/10';
                              statusText = t('attendance.absentSmall', 'A');
                            }

                            const handleDayClick = () => {
                              if (isFuture) return; // Disallowed for future days!

                              setSelectedDayNum(dayNum);
                              setSelectedDateStr(dateStr);
                              setSelectedStatus(null);
                              setIsModalOpen(true);
                            };

                            return (
                              <button
                                key={`day-${dayNum}`}
                                onClick={handleDayClick}
                                disabled={isFuture}
                                className={`aspect-square p-2 rounded-xl flex flex-col justify-between relative group transition text-left ${dayStyle} ${isToday ? 'ring-2 ring-primary-500' : ''} ${!isFuture ? 'cursor-pointer hover:opacity-85 active:scale-95' : ''}`}
                              >
                                <span className={`text-xs font-bold font-mono ${isToday ? 'text-primary-600 dark:text-primary-400 font-extrabold' : ''}`}>{dayNum}</span>
                                
                                {statusText && (
                                  <span className="text-[10px] font-bold self-end font-mono">
                                    {statusText}
                                  </span>
                                )}

                                {/* Hover Clock details for Present */}
                                {isPresent && log?.clockInTime && (
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-50 bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap font-mono">
                                    {new Date(log.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </>
          )}

        </div>
      </div>

      {/* Beautiful Modal Dialog for Modify Attendance */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-6 transform transition-all scale-100">
            
            {/* Modal Header */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary-50 dark:bg-primary-950/40 text-primary-500 rounded-2xl shrink-0">
                <CalendarIcon size={24} />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-850 dark:text-white truncate">
                  {t('attendance.modifyTitle', 'Set Attendance Status')}
                </h3>
                <p className="text-xs text-slate-500 font-semibold truncate">
                  {formattedSelectedDate}
                </p>
              </div>
            </div>

            {/* Status Selection 2x2 Grid */}
            <div className="grid grid-cols-2 gap-3.5">
              {[
                { 
                  value: 'Present', 
                  label: t('attendance.present', 'Present'), 
                  color: 'border-slate-200 dark:border-slate-750 text-emerald-600 dark:text-emerald-400 bg-emerald-50/10 dark:bg-emerald-950/5 hover:bg-emerald-50/30 hover:border-emerald-500/35 dark:hover:bg-emerald-950/10',
                  activeColor: 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-500 text-white dark:bg-emerald-600 dark:border-emerald-500 dark:ring-emerald-500 text-white',
                  icon: CheckCircle2 
                },
                { 
                  value: 'On Leave', 
                  label: t('attendance.onLeave', 'On Leave'), 
                  color: 'border-slate-200 dark:border-slate-750 text-amber-600 dark:text-amber-400 bg-amber-50/10 dark:bg-amber-950/5 hover:bg-amber-50/30 hover:border-amber-500/35 dark:hover:bg-amber-950/10',
                  activeColor: 'ring-2 ring-amber-500 border-amber-500 bg-amber-500 text-white dark:bg-amber-600 dark:border-amber-500 dark:ring-amber-500 text-white',
                  icon: Clock 
                },
                { 
                  value: 'Absent', 
                  label: t('attendance.absent', 'Absent'), 
                  color: 'border-slate-200 dark:border-slate-750 text-rose-600 dark:text-rose-455 bg-rose-50/10 dark:bg-rose-950/5 hover:bg-rose-50/30 hover:border-rose-500/35 dark:hover:bg-rose-950/10',
                  activeColor: 'ring-2 ring-rose-500 border-rose-500 bg-rose-500 text-white dark:bg-rose-600 dark:border-rose-500 dark:ring-rose-500 text-white',
                  icon: XCircle 
                },
                { 
                  value: 'Unmark', 
                  label: t('attendance.unmark', 'Unmark Day'), 
                  color: 'border-slate-200 dark:border-slate-750 text-slate-500 dark:text-slate-400 bg-slate-50/10 dark:bg-slate-800/10 hover:bg-slate-100/30 hover:border-slate-300 dark:hover:border-slate-600',
                  activeColor: 'ring-2 ring-slate-500 border-slate-500 bg-slate-700 text-white dark:bg-slate-600 dark:border-slate-500 dark:ring-slate-500 text-white',
                  icon: AlertCircle 
                },
              ].map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedStatus(opt.value as any)}
                    className={`flex flex-col items-center justify-center p-4.5 rounded-2xl border text-center transition-all duration-200 group active:scale-95 space-y-2.5 h-[105px] relative ${
                      isSelected ? opt.activeColor : opt.color
                    }`}
                  >
                    <Icon size={24} className={`transition-transform duration-200 group-hover:scale-110 ${isSelected ? 'text-white' : ''}`} />
                    <span className="text-xs font-bold">{opt.label}</span>
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-white animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Modal Action Buttons */}
            <div className="flex items-center gap-3 justify-end pt-2">
              <Button
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                disabled={actionLoading}
                className="rounded-xl text-sm"
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveStatus}
                disabled={actionLoading || !selectedStatus}
                className="rounded-xl text-sm px-6 flex items-center gap-2"
              >
                {actionLoading && <RefreshCw size={14} className="animate-spin text-white" />}
                {t('common.saveChanges', 'Save Changes')}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Beautiful Confirmation Modal for Cancel Check-In */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 w-full max-w-sm overflow-hidden shadow-2xl p-6 space-y-6 transform transition-all scale-100">
            {/* Modal Body */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-2xl shrink-0">
                <AlertCircle size={28} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-850 dark:text-white">
                  {t('attendance.cancelConfirmHeader', 'Cancel Today\'s Check-In?')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed px-2">
                  {t('attendance.confirmUnmarkToday', 'Are you sure you want to cancel today\'s check-in? This will remove your presence record for today.')}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 justify-center w-full">
              <Button
                variant="ghost"
                onClick={() => setIsConfirmOpen(false)}
                disabled={actionLoading}
                className="rounded-xl text-sm w-full py-2.5"
              >
                {t('attendance.keepCheckIn', 'No, Keep It')}
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  await handleUnmark();
                  setIsConfirmOpen(false);
                }}
                disabled={actionLoading}
                className="rounded-xl text-sm w-full py-2.5 flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 border-rose-600 text-white"
              >
                {actionLoading && <RefreshCw size={14} className="animate-spin text-white" />}
                {t('attendance.yesCancel', 'Yes, Cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
