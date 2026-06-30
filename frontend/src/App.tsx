import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { SidebarProvider } from './context/SidebarContext';
import { InventoryProvider } from './context/InventoryContext';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { HospitalList } from './pages/hospitals/HospitalList';
import { HospitalDetail } from './pages/hospitals/HospitalDetail';
import { StaffList } from './pages/staff/StaffList';
import { PatientList } from './pages/patients/PatientList';
import { PatientDetail } from './pages/patients/PatientDetail';
import { MedicineList } from './pages/medicines/MedicineList';
import { AIInventoryAnalytics } from './pages/inventory/AIInventoryAnalytics';
import { CriticalAlertsPage } from './pages/alerts/CriticalAlertsPage';
import { Availability } from './pages/Availability';
import { Transfers } from './pages/Transfers';

interface GuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

function RoleGuard({ allowedRoles, children }: GuardProps) {
  const { currentUser } = useApp();
  // Default to Admin if context is still loading
  const role = currentUser?.role || 'Admin';

  if (!allowedRoles.includes(role)) {
    const redirectPath = role === 'Admin' ? '/' : '/availability';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AppProvider>
          <InventoryProvider>
            <SidebarProvider>
              <Layout>
                <Routes>
                  <Route
                    path="/"
                    element={
                      <RoleGuard allowedRoles={['Admin', 'Doctor', 'Nurse', 'Receptionist', 'Pharmacist', 'Compounder', 'Lab Technician', 'Cashier']}>
                        <Dashboard />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/hospitals"
                    element={
                      <RoleGuard allowedRoles={['Admin', 'Doctor', 'Nurse', 'Receptionist']}>
                        <HospitalList />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/hospitals/:id"
                    element={
                      <RoleGuard allowedRoles={['Admin', 'Doctor', 'Nurse', 'Receptionist']}>
                        <HospitalDetail />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/staff"
                    element={
                      <RoleGuard allowedRoles={['Admin']}>
                        <StaffList />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/patients"
                    element={
                      <RoleGuard allowedRoles={['Admin', 'Doctor', 'Nurse', 'Receptionist']}>
                        <PatientList />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/patients/:id"
                    element={
                      <RoleGuard allowedRoles={['Admin', 'Doctor', 'Nurse', 'Receptionist']}>
                        <PatientDetail />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/medicines"
                    element={
                      <RoleGuard allowedRoles={['Admin', 'Pharmacist', 'Compounder', 'Lab Technician', 'Doctor', 'Nurse', 'Receptionist', 'Cashier']}>
                        <MedicineList />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/ai-analytics"
                    element={
                      <RoleGuard allowedRoles={['Admin']}>
                        <AIInventoryAnalytics />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/critical-alerts"
                    element={
                      <RoleGuard allowedRoles={['Admin']}>
                        <CriticalAlertsPage />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/availability"
                    element={
                      <RoleGuard allowedRoles={['Doctor', 'Nurse', 'Receptionist', 'Pharmacist', 'Compounder', 'Lab Technician', 'Cashier']}>
                        <Availability />
                      </RoleGuard>
                    }
                  />
                  <Route
                    path="/transfers"
                    element={
                      <RoleGuard allowedRoles={['Admin']}>
                        <Transfers />
                      </RoleGuard>
                    }
                  />
                </Routes>
              </Layout>
            </SidebarProvider>
          </InventoryProvider>
        </AppProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
