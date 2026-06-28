import { useState, useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useApp, authFetch } from '../context/AppContext';
import { Users, AlertTriangle, ArrowRight, CheckCircle2, Building, UserCheck, Loader2, Calendar, ClipboardList } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

interface CoverageRequest {
  _id: string;
  staffId: {
    _id: string;
    name: string;
    department: string;
    role: string;
    assignedHospitalId: string;
    unavailableOnDays: string[];
    userId?: {
      username: string;
    };
  };
  startDate: string;
  endDate: string;
  dates: string[];
  vacantHospitalId: {
    _id: string;
    name: string;
    city: string;
    state: string;
  };
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed';
  replacementStaffId?: {
    _id: string;
    name: string;
    userId?: {
      username: string;
    };
  };
  originalReplacementHospitalId?: string;
  createdAt: string;
}

export function Transfers() {
  const { t } = useTranslation();
  const { staff, hospitals } = useApp();
  const [requests, setRequests] = useState<CoverageRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [alternativeStaffId, setAlternativeStaffId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'Pending' | 'Approved' | 'History'>('Pending');

  const fetchRequests = async () => {
    try {
      const res = await authFetch('http://localhost:3000/staff/coverage-requests');
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error('Failed to load coverage requests', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const selectedRequest = requests.find(r => r._id === selectedRequestId);

  // Filter alternatives: Same department, same role, not currently unavailable, and not the vacant staff
  const alternatives = selectedRequest
    ? staff.filter(
        s =>
          s.id !== (selectedRequest.staffId._id ?? selectedRequest.staffId) &&
          s.role === selectedRequest.staffId.role &&
          s.department === selectedRequest.staffId.department &&
          (!s.unavailableOnDays || s.unavailableOnDays.length === 0)
      )
    : [];

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !alternativeStaffId) return;

    setIsSubmitting(true);
    setSuccessMsg(null);

    try {
      const res = await authFetch(`http://localhost:3000/staff/coverage-requests/${selectedRequest._id}/transfer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replacementStaffId: alternativeStaffId }),
      });

      if (!res.ok) throw new Error(t('transfers.transferFailed'));

      const replacement = staff.find(s => s.id === alternativeStaffId);
      setSuccessMsg(
        t('transfers.successMsg', { replacement: replacement?.name || t('transfers.replacement'), hospital: selectedRequest.vacantHospitalId.name })
      );
      setAlternativeStaffId('');
      setSelectedRequestId(null);
      
      // Reload requests & refresh page state
      await fetchRequests();
      setTimeout(() => {
        setSuccessMsg(null);
        window.location.reload(); // Reload context state
      }, 3000);
    } catch (err) {
      console.error('Failed to assign coverage', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRequests = requests.filter(r => {
    if (activeTab === 'Pending') return r.status === 'Pending';
    if (activeTab === 'Approved') return r.status === 'Approved';
    return r.status === 'Completed' || r.status === 'Rejected';
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title={t('transfers.title')} subtitle={t('transfers.loadingRequests')} />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      <Header
        title={t('transfers.title')}
        subtitle={t('transfers.subtitle')}
      />

      <div className="flex bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-2 gap-4">
        {(['Pending', 'Approved', 'History'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setSelectedRequestId(null);
              setAlternativeStaffId('');
            }}
            className={clsx(
              'px-4 py-2 text-sm font-semibold border-b-2 transition duration-150',
              activeTab === tab
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            {t(`transfers.tabs.${tab}`)} ({requests.filter(r => {
              if (tab === 'Pending') return r.status === 'Pending';
              if (tab === 'Approved') return r.status === 'Approved';
              return r.status === 'Completed' || r.status === 'Rejected';
            }).length})
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">

          {successMsg && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-95/20 border border-emerald-200 dark:border-emerald-900/30 rounded-xl flex items-start gap-3 text-emerald-800 dark:text-emerald-300 animate-fadeIn">
              <CheckCircle2 className="shrink-0 mt-0.5" size={18} />
              <p className="text-sm font-medium">{successMsg} {t('transfers.refreshing')}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Panel: List of Requests */}
            <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 rounded-t-xl">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  {t('transfers.requestList')}
                </h3>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[600px]">
                {filteredRequests.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                    <ClipboardList className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm italic">{t('transfers.noRequests')}</p>
                  </div>
                ) : (
                  filteredRequests.map(req => {
                    const originalHospitalName = req.vacantHospitalId?.name || t('common.unknown');
                    return (
                      <button
                        key={req._id}
                        type="button"
                        onClick={() => {
                          setSelectedRequestId(req._id);
                          setAlternativeStaffId('');
                        }}
                        className={clsx(
                          'w-full p-4 rounded-xl border text-left transition duration-150 flex flex-col gap-2',
                          selectedRequestId === req._id
                            ? 'border-primary-500 bg-primary-500/5 dark:bg-primary-500/10'
                            : 'border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                        )}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                            {req.staffId?.name || t('staff.staffMember')}
                          </span>
                          <Badge variant={req.status === 'Pending' ? 'warning' : req.status === 'Approved' ? 'success' : 'info'} className="text-[10px] py-0.5">
                            {t(`departments.${req.staffId?.department}`) || req.staffId?.department}
                          </Badge>
                        </div>
                        
                        <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                          <div className="flex items-center gap-1">
                            <Building size={12} />
                            <span>{t('transfers.vacantBranch')}: {originalHospitalName}</span>
                          </div>
                          <div className="flex items-center gap-1 text-red-500/80 font-medium">
                            <Calendar size={12} />
                            <span>{t('transfers.dates')}: {req.startDate} to {req.endDate}</span>
                          </div>
                          {req.replacementStaffId && (
                            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                              <UserCheck size={12} />
                              <span>{t('transfers.cover')}: {req.replacementStaffId.name}</span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Panel: Alternative Assignment Action */}
            <div className="lg:col-span-2 space-y-6">
              {selectedRequest && selectedRequest.vacantHospitalId ? (
                <form onSubmit={handleTransfer} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-6">
                  
                  {/* Vacancy Summary Card */}
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('transfers.vacantPositionDetails')}</h4>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-base">
                          {selectedRequest.staffId.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {t('transfers.department')}: <span className="font-semibold text-slate-700 dark:text-slate-300">{t(`departments.${selectedRequest.staffId.department}`) || selectedRequest.staffId.department}</span>
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {t('transfers.role')}: <span className="font-semibold text-slate-700 dark:text-slate-300">{t(`roles.${selectedRequest.staffId.role}`) || selectedRequest.staffId.role}</span>
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 text-slate-400">
                        <ArrowRight size={20} />
                      </div>

                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-base">
                          {selectedRequest.vacantHospitalId.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {selectedRequest.vacantHospitalId.city}, {selectedRequest.vacantHospitalId.state}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Transfer Action depending on status */}
                  {selectedRequest.status === 'Pending' ? (
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                        {t('transfers.selectAlternative')}
                      </h3>

                      {alternatives.length === 0 ? (
                        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl flex items-start gap-3 text-amber-800 dark:text-amber-300">
                          <AlertTriangle className="shrink-0 mt-0.5" size={18} />
                          <div className="text-sm">
                            <p className="font-semibold">{t('transfers.noAlternatives')}</p>
                            <p className="mt-0.5">{t('transfers.noAlternativesDesc', { role: t(`roles.${selectedRequest.staffId.role}`) || selectedRequest.staffId.role, department: t(`departments.${selectedRequest.staffId.department}`) || selectedRequest.staffId.department })}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              {t('transfers.chooseReplacement')}
                            </label>
                            <select
                              required
                              value={alternativeStaffId}
                              onChange={(e) => setAlternativeStaffId(e.target.value)}
                              className="w-full p-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                            >
                              <option value="">{t('transfers.chooseReplacementPlaceholder')}</option>
                              {alternatives.map(alt => {
                                const altHospital = hospitals.find(h => h.id === alt.assignedHospitalId);
                                return (
                                  <option key={alt.id} value={alt.id}>
                                    {alt.name} ({t('transfers.currentBranch')}: {altHospital?.name || t('hospitals.detail.unassigned')})
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          {alternativeStaffId && (
                            <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 flex items-center gap-3">
                              <UserCheck className="text-emerald-500 shrink-0" size={20} />
                              <div>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                  {t('transfers.confirmCoverageAssign')}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                  {t('transfers.confirmCoverageDesc', { hospital: selectedRequest.vacantHospitalId.name, start: selectedRequest.startDate, end: selectedRequest.endDate })}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Submit Button */}
                      <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700/60">
                        <Button
                          type="submit"
                          disabled={!alternativeStaffId || isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="animate-spin" size={16} /> {t('transfers.assigning')}
                            </>
                          ) : (
                            <>
                              <UserCheck size={16} /> {t('transfers.assignCoverage')}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 dark:bg-slate-900/10 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 space-y-3">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('transfers.coverageLogSummary')}</h4>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {t('transfers.status')}: <Badge variant={selectedRequest.status === 'Approved' ? 'success' : 'info'}>{selectedRequest.status}</Badge>
                      </p>
                      {selectedRequest.replacementStaffId && (
                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                          {t('transfers.assignedCoverageStaff')}: <span className="font-bold text-slate-800 dark:text-slate-100">{selectedRequest.replacementStaffId.name}</span>
                        </p>
                      )}
                    </div>
                  )}

                </form>
              ) : (
                <div className="h-full min-h-[350px] flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 border-dashed p-8 text-center text-slate-400 dark:text-slate-500">
                  <Building className="h-12 w-12 mb-3 opacity-30" />
                  <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">{t('transfers.noRequestSelected')}</h4>
                  <p className="text-sm mt-1 max-w-sm">{t('transfers.selectFromListDesc')}</p>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
