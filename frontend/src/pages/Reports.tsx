import { useState, useEffect } from 'react';
import { 
  FileText, 
  Activity, 
  BedDouble, 
  Users, 
  AlertOctagon, 
  Calendar, 
  Download, 
  Building,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Package
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';
import { authFetch } from '../context/AppContext';
import { environment } from '@env/environment';
import { useTranslation } from 'react-i18next';

type TabType = 'clinical' | 'occupancy' | 'staffing' | 'inventory';

export function Reports() {
  const { t } = useTranslation();
  const { currentUser, hospitals } = useApp();
  const userRole = currentUser?.role || 'Admin';

  // State
  const [activeTab, setActiveTab] = useState<TabType>('occupancy');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination for Bed Occupancy
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(5);

  // Report Data States
  const [clinicalData, setClinicalData] = useState<any>(null);
  const [occupancyData, setOccupancyData] = useState<any>(null);
  const [staffingData, setStaffingData] = useState<any>(null);
  const [inventoryData, setInventoryData] = useState<any>(null);

  // Set default tab based on role permissions
  useEffect(() => {
    if (userRole === 'Pharmacist') {
      setActiveTab('inventory');
    } else if (userRole === 'Nurse' || userRole === 'Receptionist') {
      setActiveTab('occupancy');
    } else if (userRole === 'Doctor') {
      setActiveTab('clinical');
    } else {
      setActiveTab('occupancy');
    }
  }, [userRole]);

  // Reset page to 1 when tab or branch changes
  useEffect(() => {
    setPage(1);
  }, [activeTab, selectedBranch]);

  // Determine allowed tabs
  const isAllowed = (tab: TabType): boolean => {
    if (userRole === 'Admin') return true;
    if (tab === 'clinical') return userRole === 'Doctor';
    if (tab === 'occupancy') return ['Doctor', 'Nurse', 'Receptionist'].includes(userRole);
    if (tab === 'staffing') return false; // Admin only
    if (tab === 'inventory') return userRole === 'Pharmacist';
    return false;
  };

  const fetchReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'clinical') {
        const params = new URLSearchParams();
        if (selectedBranch) params.append('branchId', selectedBranch);
        if (fromDate) params.append('fromDate', fromDate);
        if (toDate) params.append('toDate', toDate);
        const res = await authFetch(
          `${environment.mainBackendUrl}/reports/clinical?${params.toString()}`
        );
        if (!res.ok) throw new Error('Failed to load clinical report data');
        setClinicalData(await res.json());
      } else if (activeTab === 'occupancy') {
        const params = new URLSearchParams();
        if (selectedBranch) params.append('branchId', selectedBranch);
        params.append('page', page.toString());
        params.append('pageSize', pageSize.toString());
        const res = await authFetch(
          `${environment.mainBackendUrl}/reports/occupancy?${params.toString()}`
        );
        if (!res.ok) throw new Error('Failed to load bed occupancy report data');
        setOccupancyData(await res.json());
      } else if (activeTab === 'staffing') {
        const params = new URLSearchParams();
        if (selectedBranch) params.append('branchId', selectedBranch);
        const res = await authFetch(
          `${environment.mainBackendUrl}/reports/staffing?${params.toString()}`
        );
        if (!res.ok) throw new Error('Failed to load staffing report data');
        setStaffingData(await res.json());
      } else if (activeTab === 'inventory') {
        const params = new URLSearchParams();
        if (selectedBranch) params.append('branchId', selectedBranch);
        const res = await authFetch(
          `${environment.mainBackendUrl}/reports/inventory?${params.toString()}`
        );
        if (!res.ok) throw new Error('Failed to load inventory report data');
        setInventoryData(await res.json());
      }
    } catch (err: any) {
      setError(err.message || t('reports.error', 'An unexpected error occurred'));
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    let htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="text/html; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Report</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          th { font-weight: bold; background-color: #f2f2f2; border: 0.5pt solid #cccccc; text-align: left; padding: 5px; }
          td { border: 0.5pt solid #cccccc; padding: 5px; text-align: left; }
          .summary-header { font-weight: bold; background-color: #e6e6e6; }
        </style>
      </head>
      <body>
    `;
    const fileName = `report_${activeTab}_${selectedBranch || 'all'}.xls`;

    if (activeTab === 'occupancy' && occupancyData) {
      htmlContent += `
        <table>
          <thead>
            <tr>
              <th>Branch Name</th>
              <th>Facility Type</th>
              <th>Total Beds</th>
              <th>Occupied Beds</th>
              <th>Available Beds</th>
              <th>Occupancy Rate (%)</th>
            </tr>
          </thead>
          <tbody>
      `;
      occupancyData.details.forEach((b: any) => {
        htmlContent += `
          <tr>
            <td>${b.name}</td>
            <td>${b.type}</td>
            <td>${b.totalBeds}</td>
            <td>${b.occupiedBeds}</td>
            <td>${b.availableBeds}</td>
            <td>${b.occupancyRate}%</td>
          </tr>
        `;
      });
      htmlContent += `
          <tr class="summary-header">
            <td colspan="2"><b>Summary</b></td>
            <td colspan="4"></td>
          </tr>
          <tr>
            <td colspan="2">Total Beds</td>
            <td><b>${occupancyData.totalBeds}</b></td>
            <td colspan="3"></td>
          </tr>
          <tr>
            <td colspan="2">Occupied Beds</td>
            <td><b>${occupancyData.occupiedBeds}</b></td>
            <td colspan="3"></td>
          </tr>
          <tr>
            <td colspan="2">Available Beds</td>
            <td><b>${occupancyData.availableBeds}</b></td>
            <td colspan="3"></td>
          </tr>
          <tr>
            <td colspan="2">Average Occupancy Rate</td>
            <td><b>${occupancyData.averageOccupancyRate}%</b></td>
            <td colspan="3"></td>
          </tr>
        </tbody>
        </table>
      `;
    } 
    else if (activeTab === 'clinical' && clinicalData) {
      htmlContent += `
        <table>
          <thead>
            <tr>
              <th colspan="2">Clinical Diagnostics Report</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>Total Consultations</b></td>
              <td><b>${clinicalData.totalVisits}</b></td>
            </tr>
            <tr><td colspan="2"></td></tr>
            <tr>
              <th>Top Diagnostic Problems</th>
              <th>Cases</th>
            </tr>
      `;
      clinicalData.topDiagnoses.forEach((d: any) => {
        htmlContent += `
          <tr>
            <td>${d.name}</td>
            <td>${d.count}</td>
          </tr>
        `;
      });
      htmlContent += `
            <tr><td colspan="2"></td></tr>
            <tr>
              <th>Highly Prescribed Medicines</th>
              <th>Quantity Prescribed</th>
            </tr>
      `;
      clinicalData.topMedicines.forEach((m: any) => {
        htmlContent += `
          <tr>
            <td>${m.name}</td>
            <td>${m.count}</td>
          </tr>
        `;
      });
      htmlContent += '</tbody></table>';
    } 
    else if (activeTab === 'staffing' && staffingData) {
      htmlContent += `
        <table>
          <thead>
            <tr>
              <th colspan="2">Staffing Distribution Report</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>Total Staff count</b></td>
              <td><b>${staffingData.totalStaff}</b></td>
            </tr>
            <tr><td colspan="2"></td></tr>
            <tr>
              <th>Department</th>
              <th>Staff Count</th>
            </tr>
      `;
      staffingData.departmentsDistribution.forEach((d: any) => {
        htmlContent += `
          <tr>
            <td>${d.department}</td>
            <td>${d.count}</td>
          </tr>
        `;
      });
      htmlContent += `
            <tr><td colspan="2"></td></tr>
            <tr>
              <th>User Role</th>
              <th>Staff Count</th>
            </tr>
      `;
      staffingData.rolesDistribution.forEach((r: any) => {
        htmlContent += `
          <tr>
            <td>${r.role}</td>
            <td>${r.count}</td>
          </tr>
        `;
      });
      if (staffingData.branchDistribution && staffingData.branchDistribution.length > 0) {
        htmlContent += `
              <tr><td colspan="2"></td></tr>
              <tr class="summary-header">
                <th colspan="2">Staff Assignment by Branch</th>
              </tr>
              <tr>
                <th>Branch</th>
                <th>Staff Count</th>
              </tr>
        `;
        staffingData.branchDistribution.forEach((b: any) => {
          htmlContent += `
            <tr>
              <td>${b.branchName}</td>
              <td>${b.count}</td>
            </tr>
          `;
        });
      }
      htmlContent += '</tbody></table>';
    } 
    else if (activeTab === 'inventory' && inventoryData) {
      htmlContent += `
        <table>
          <thead>
            <tr>
              <th colspan="4">Batches Expiring in Next 90 Days</th>
            </tr>
            <tr>
              <th>Medicine Name</th>
              <th>Batch No</th>
              <th>Available Qty</th>
              <th>Expiry Date</th>
            </tr>
          </thead>
          <tbody>
      `;
      inventoryData.expiringSoon.forEach((item: any) => {
        const dateStr = new Date(item.expiryDate).toLocaleDateString();
        htmlContent += `
          <tr>
            <td>${item.itemName}</td>
            <td>${item.batchNo}</td>
            <td>${item.availableQty}</td>
            <td>${dateStr}</td>
          </tr>
        `;
      });
      htmlContent += `
            <tr><td colspan="4"></td></tr>
            <tr class="summary-header">
              <th colspan="4">Stock by Category</th>
            </tr>
            <tr>
              <th colspan="2">Category</th>
              <th>Total Quantity</th>
              <th>Unique Items</th>
            </tr>
      `;
      inventoryData.categoryBreakdown.forEach((cat: any) => {
        htmlContent += `
          <tr>
            <td colspan="2">${cat.category}</td>
            <td>${cat.totalQty}</td>
            <td>${cat.itemCount}</td>
          </tr>
        `;
      });
      if (inventoryData.medicineAvailability) {
        htmlContent += `
              <tr><td colspan="4"></td></tr>
              <tr class="summary-header">
                <th colspan="4">Medicine Stock Availability</th>
              </tr>
              <tr>
                <th colspan="2">Medicine Name</th>
                <th>Category</th>
                <th>Available Quantity</th>
              </tr>
        `;
        inventoryData.medicineAvailability.forEach((item: any) => {
          htmlContent += `
            <tr>
              <td colspan="2">${item.name}</td>
              <td>${item.category}</td>
              <td>${item.totalQty}</td>
            </tr>
          `;
        });
      }
      htmlContent += '</tbody></table>';
    }

    htmlContent += '</body></html>';

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    fetchReportData();
  }, [activeTab, selectedBranch, fromDate, toDate, page]);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <Header 
        title={t('nav.reports') || 'Analytics & Reports'} 
        subtitle={t('reports.subtitle', 'Access system breakdowns, clinical statistics, bed availability, and stock checks.')} 
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="max-w-screen-2xl mx-auto space-y-6 animate-fade-in">
          
          {/* Top Bar Filters */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Branch Selector */}
              <div className="flex items-center gap-2">
                <Building size={16} className="text-slate-400 dark:text-slate-500" />
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition"
                >
                  <option value="">{t('reports.allBranches', 'All Branches')}</option>
                  {hospitals.map((h: any) => (
                    <option key={h._id} value={h._id}>{h.name}</option>
                  ))}
                </select>
              </div>

              {/* Date Filters (Only shown for Clinical Tab) */}
              {activeTab === 'clinical' && (
                <div className="flex items-center gap-2 pt-1 sm:pt-0">
                  <Calendar size={16} className="text-slate-400 dark:text-slate-500" />
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition"
                  />
                  <span className="text-slate-400 dark:text-slate-500 text-xs">{t('reports.to', 'to')}</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={fetchReportData} variant="secondary" size="sm">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {t('common.refresh', 'Refresh')}
              </Button>
              <Button onClick={handleExportExcel} variant="primary" size="sm">
                <Download size={14} /> {t('reports.exportReport', 'Export Excel')}
              </Button>
            </div>
          </div>

          {/* Role-Based Navigation Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-700 gap-1 overflow-x-auto select-none">
            {isAllowed('occupancy') && (
              <button
                onClick={() => setActiveTab('occupancy')}
                className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-sm transition-all whitespace-nowrap ${
                  activeTab === 'occupancy'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50/20'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <BedDouble size={16} /> {t('reports.tabOccupancy', 'Bed Occupancy Capacity')}
              </button>
            )}
            {isAllowed('clinical') && (
              <button
                onClick={() => setActiveTab('clinical')}
                className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-sm transition-all whitespace-nowrap ${
                  activeTab === 'clinical'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50/20'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <Activity size={16} /> {t('reports.tabClinical', 'Clinical Diagnostics')}
              </button>
            )}
            {isAllowed('staffing') && (
              <button
                onClick={() => setActiveTab('staffing')}
                className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-sm transition-all whitespace-nowrap ${
                  activeTab === 'staffing'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50/20'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <Users size={16} /> {t('reports.tabStaffing', 'Staffing Distribution')}
              </button>
            )}
            {isAllowed('inventory') && (
              <button
                onClick={() => setActiveTab('inventory')}
                className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-sm transition-all whitespace-nowrap ${
                  activeTab === 'inventory'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50/20'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <AlertOctagon size={16} /> {t('reports.tabInventory', 'Inventory Status & Expiry')}
              </button>
            )}
          </div>

          {/* Loader or Error Alert */}
          {loading && (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm">
              <RefreshCw size={32} className="animate-spin text-primary-500 mb-2" />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{t('reports.loading', 'Compiling Report Analytics...')}</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-2xl shadow-sm text-red-700 dark:text-red-400">
              <AlertTriangle className="shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Tabs Content */}
          {!loading && !error && (
            <>
              {/* Tab 1: Occupancy */}
              {activeTab === 'occupancy' && occupancyData && (
                <div className="space-y-6">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('reports.totalBeds', 'Total Beds')}</p>
                      <h3 className="text-3xl font-extrabold text-slate-850 dark:text-slate-100 mt-2">{occupancyData.totalBeds}</h3>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('reports.occupiedBeds', 'Occupied Beds')}</p>
                      <h3 className="text-3xl font-extrabold text-slate-850 dark:text-slate-100 mt-2">{occupancyData.occupiedBeds}</h3>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('reports.availableBeds', 'Available Beds')}</p>
                      <h3 className="text-3xl font-extrabold text-slate-850 dark:text-slate-100 mt-2">{occupancyData.availableBeds}</h3>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('reports.averageOccupancy', 'Average Occupancy')}</p>
                      <h3 className="text-3xl font-extrabold text-slate-850 dark:text-slate-100 mt-2">{occupancyData.averageOccupancyRate}%</h3>
                      <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div 
                          className="bg-primary-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${occupancyData.averageOccupancyRate}%` }} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Branch Breakdown Table */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('reports.branchBreakdown', 'Branch Capacity breakdown')}</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">{t('reports.colBranchName', 'Branch Name')}</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">{t('reports.colType', 'Branch Type')}</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">{t('reports.colTotalBeds', 'Total Beds')}</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">{t('reports.colOccupiedBeds', 'Occupied Beds')}</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">{t('reports.colAvailableBeds', 'Available Beds')}</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">{t('reports.colOccupancyRate', 'Occupancy Rate')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {occupancyData.details.map((b: any) => (
                            <tr key={b.hospitalId} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition">
                              <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-200">{b.name}</td>
                              <td className="px-5 py-3.5"><Badge variant="info">{b.type}</Badge></td>
                              <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300 font-mono">{b.totalBeds}</td>
                              <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300 font-mono">{b.occupiedBeds}</td>
                              <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300 font-mono">{b.availableBeds}</td>
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-800 dark:text-slate-250 font-mono">{b.occupancyRate}%</span>
                                  <div className="w-16 bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full ${b.occupancyRate > 85 ? 'bg-red-500' : 'bg-primary-500'}`} 
                                      style={{ width: `${b.occupancyRate}%` }} 
                                    />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Pagination Controls */}
                    {occupancyData.pagination && (
                      <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-4">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {t('common.showing')} <span className="font-semibold text-slate-700 dark:text-slate-200">{((page - 1) * pageSize) + 1}</span> {t('common.to')}{' '}
                          <span className="font-semibold text-slate-700 dark:text-slate-200">{Math.min(page * pageSize, occupancyData.pagination.total)}</span>{' '}
                          {t('common.of')} <span className="font-semibold text-slate-700 dark:text-slate-200">{occupancyData.pagination.total}</span> {t('common.records')}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            variant="secondary"
                            size="sm"
                          >
                            {t('common.previousPage')}
                          </Button>
                          <Button
                            onClick={() => setPage(p => Math.min(occupancyData.pagination.totalPages, p + 1))}
                            disabled={page === occupancyData.pagination.totalPages}
                            variant="secondary"
                            size="sm"
                          >
                            {t('common.nextPage')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Clinical Diagnostics */}
              {activeTab === 'clinical' && clinicalData && (
                <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Visited Card */}
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between relative overflow-hidden">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('reports.totalConsultations', 'Total Consultations')}</p>
                      <h3 className="text-4xl font-extrabold text-slate-850 dark:text-slate-100 mt-2">{clinicalData.totalVisits}</h3>
                      <p className="text-xs text-slate-500 mt-2">{t('reports.visitsRange', 'Visits matching selected date range.')}</p>
                    </div>
                    <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center gap-2 text-primary-600 dark:text-primary-400 font-semibold text-sm">
                      <TrendingUp size={16} /> {t('reports.livePatient', 'Live Patient Engagement')}
                    </div>
                  </div>

                  {/* Top Diagnoses Card */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden p-6 space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-700 pb-3 flex items-center gap-2">
                      <FileText size={16} className="text-primary-500" /> {t('reports.topDiagnoses', 'Top Diagnostic Problems')}
                    </h4>
                    {clinicalData.topDiagnoses.length === 0 ? (
                      <p className="text-sm text-slate-400 italic">{t('reports.noDiagnoses', 'No diagnostic records found for selected filters.')}</p>
                    ) : (
                      <div className="space-y-3.5">
                        {clinicalData.topDiagnoses.map((diag: any, idx: number) => (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-350">
                              <span>{diag.name}</span>
                              <span>{diag.count} {t('reports.cases', 'cases')}</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                              <div className="bg-primary-500 h-full rounded-full" style={{ width: `${Math.min(100, (diag.count / (clinicalData.totalVisits || 1)) * 100)}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Top Prescribed Medicines Card */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden p-6 space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-700 pb-3 flex items-center gap-2">
                      <Activity size={16} className="text-primary-500" /> {t('reports.highlyPrescribed', 'Highly Prescribed Medicines')}
                    </h4>
                    {clinicalData.topMedicines.length === 0 ? (
                      <p className="text-sm text-slate-400 italic">{t('reports.noMedicines', 'No medicine prescriptions found.')}</p>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                        {clinicalData.topMedicines.map((med: any, idx: number) => (
                          <div key={idx} className="py-2.5 flex items-center justify-between text-sm">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{med.name}</span>
                            <Badge variant="purple">{med.count} {t('reports.units', 'units')}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Medicines by Branch breakdown — full width */}
                {clinicalData.topMedicinesByBranch && clinicalData.topMedicinesByBranch.length > 0 && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-2">
                      <Building className="text-primary-500" size={16} />
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {t('reports.medsByBranch', 'Prescribed Medicines by Branch')}
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">{t('reports.colMedName', 'Medicine Name')}</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">{t('reports.colBranch', 'Branch')}</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">{t('reports.colQty', 'Qty Prescribed')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {clinicalData.topMedicinesByBranch.map((row: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition">
                              <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-200">{row.medicineName}</td>
                              <td className="px-5 py-3.5"><Badge variant="info">{row.branchName}</Badge></td>
                              <td className="px-5 py-3.5 font-mono text-slate-700 dark:text-slate-300">{row.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                </div>
              )}

              {/* Tab 3: Staffing Distribution */}
              {activeTab === 'staffing' && staffingData && (
                <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Summary Metric */}
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('reports.totalStaff', 'Total Onboarded Staff')}</p>
                      <h3 className="text-4xl font-extrabold text-slate-850 dark:text-slate-100 mt-2">{staffingData.totalStaff}</h3>
                    </div>
                    <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center gap-2 text-primary-600 dark:text-primary-400 font-semibold text-sm">
                      <Users size={16} /> {t('reports.clinicalAdminBase', 'Clinical & Administration Base')}
                    </div>
                  </div>

                  {/* Departments Distribution */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-700 pb-3">
                      {t('reports.staffDept', 'Staff count by Department')}
                    </h4>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700/65">
                      {staffingData.departmentsDistribution.map((dept: any, idx: number) => (
                        <div key={idx} className="py-2.5 flex items-center justify-between text-sm">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{dept.department}</span>
                          <span className="font-mono text-slate-800 dark:text-slate-200">{dept.count} {t('reports.members', 'members')}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Roles Distribution */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-700 pb-3">
                      {t('reports.staffRole', 'Staff count by User Role')}
                    </h4>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700/65">
                      {staffingData.rolesDistribution.map((r: any, idx: number) => (
                        <div key={idx} className="py-2.5 flex items-center justify-between text-sm">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{r.role}</span>
                          <span className="font-mono text-slate-850 dark:text-slate-200">{r.count} {t('reports.members', 'members')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Branch Distribution — full width below */}
                {staffingData.branchDistribution && staffingData.branchDistribution.length > 0 && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-2">
                      <Building className="text-primary-500" size={16} />
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {t('reports.staffBranch', 'Staff Assignment by Branch')}
                      </h3>
                    </div>
                    <div className="p-6 space-y-3">
                      {(() => {
                        const maxCount = Math.max(...staffingData.branchDistribution.map((b: any) => b.count), 1);
                        return staffingData.branchDistribution.map((branch: any, idx: number) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-xs">{branch.branchName}</span>
                              <span className="font-mono text-slate-500 dark:text-slate-400 ml-4 shrink-0">{branch.count} {t('reports.members', 'members')}</span>
                            </div>
                            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary-500 rounded-full transition-all duration-500"
                                style={{ width: `${(branch.count / maxCount) * 100}%` }}
                              />
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
                </div>
              )}

              {/* Tab 4: Inventory */}
              {activeTab === 'inventory' && inventoryData && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Expiry alerts list */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                      <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-2">
                        <AlertOctagon className="text-amber-500" size={16} />
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('reports.expiringSoon', 'Batches Expiring in Next 90 Days')}</h3>
                      </div>
                      <div className="overflow-x-auto">
                        {inventoryData.expiringSoon.length === 0 ? (
                          <p className="text-sm text-slate-400 italic p-6">{t('reports.noExpiry', 'No batches expiring in the next 90 days.')}</p>
                        ) : (
                          <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                              <tr>
                                <th className="px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">{t('reports.colMedName', 'Medicine Name')}</th>
                                <th className="px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">{t('reports.colBatchNo', 'Batch No')}</th>
                                <th className="px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">{t('reports.colQty', 'Qty')}</th>
                                <th className="px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">{t('reports.colExpiryDate', 'Expiry Date')}</th>
                                <th className="px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">{t('reports.colBranch', 'Branch')}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                              {inventoryData.expiringSoon.map((item: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition">
                                  <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-200">{item.itemName}</td>
                                  <td className="px-5 py-3.5 text-slate-500 font-mono">{item.batchNo}</td>
                                  <td className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300 font-mono">{item.availableQty}</td>
                                  <td className="px-5 py-3.5">
                                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                                      {new Date(item.expiryDate).toLocaleDateString(undefined, {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                      })}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3.5">
                                    <Badge variant="info">{item.branchName || 'Central Store'}</Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>

                    {/* Category Stock Summary */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-700 pb-3 flex items-center gap-2">
                        <FileText size={16} className="text-primary-500" /> {t('reports.stockCategory', 'Stock by Category')}
                      </h4>
                      {inventoryData.categoryBreakdown.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">{t('reports.noStock', 'No inventory stock entries found.')}</p>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                          {inventoryData.categoryBreakdown.map((cat: any, idx: number) => (
                            <div key={idx} className="py-3 flex items-center justify-between text-sm">
                              <div>
                                <span className="font-semibold text-slate-850 dark:text-slate-200">{cat.category}</span>
                                <p className="text-xs text-slate-400 mt-0.5">{cat.itemCount} {t('reports.uniqueItems', 'unique items')}</p>
                              </div>
                              <Badge variant="purple">{cat.totalQty} {t('reports.units', 'units')}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Medicine Stock Availability */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-2">
                      <Package className="text-primary-500" size={16} />
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {t('reports.medicineAvailabilityTitle', 'Medicine Stock Availability')}
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      {!inventoryData.medicineAvailability || inventoryData.medicineAvailability.length === 0 ? (
                        <p className="text-sm text-slate-400 italic p-6">{t('reports.noStock', 'No inventory stock entries found.')}</p>
                      ) : (
                        <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">{t('reports.colMedName', 'Medicine Name')}</th>
                              <th className="px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">{t('reports.colType', 'Category')}</th>
                              <th className="px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">{t('reports.colQty', 'Available Quantity')}</th>
                              <th className="px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">{t('reports.colBranchesCount', 'Branches with Stock')}</th>
                              <th className="px-5 py-3 font-semibold text-slate-500 dark:text-slate-400">{t('reports.colBatchesCount', 'Batches')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {inventoryData.medicineAvailability.map((item: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition">
                                <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-200">{item.name}</td>
                                <td className="px-5 py-3.5"><Badge variant="info">{item.category}</Badge></td>
                                <td className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300 font-mono">{item.totalQty}</td>
                                <td className="px-5 py-3.5 text-slate-500 font-mono">{item.branchesCount}</td>
                                <td className="px-5 py-3.5 text-slate-500 font-mono">{item.batchesCount}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
