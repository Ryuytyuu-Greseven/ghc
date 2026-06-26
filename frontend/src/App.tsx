import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { SidebarProvider } from './context/SidebarContext';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { HospitalList } from './pages/hospitals/HospitalList';
import { HospitalDetail } from './pages/hospitals/HospitalDetail';
import { StaffList } from './pages/staff/StaffList';
import { PatientList } from './pages/patients/PatientList';
import { MedicineList } from './pages/medicines/MedicineList';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AppProvider>
          <SidebarProvider>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/hospitals" element={<HospitalList />} />
                <Route path="/hospitals/:id" element={<HospitalDetail />} />
                <Route path="/staff" element={<StaffList />} />
                <Route path="/patients" element={<PatientList />} />
                <Route path="/medicines" element={<MedicineList />} />
              </Routes>
            </Layout>
          </SidebarProvider>
        </AppProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
