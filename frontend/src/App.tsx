import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { HospitalList } from './pages/hospitals/HospitalList';
import { StaffList } from './pages/staff/StaffList';
import { PatientList } from './pages/patients/PatientList';
import { MedicineList } from './pages/medicines/MedicineList';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/hospitals" element={<HospitalList />} />
            <Route path="/staff" element={<StaffList />} />
            <Route path="/patients" element={<PatientList />} />
            <Route path="/medicines" element={<MedicineList />} />
          </Routes>
        </Layout>
      </AppProvider>
    </BrowserRouter>
  );
}
