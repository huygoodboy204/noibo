import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import SignIn from "./pages/AuthPages/SignIn";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import Calendar from "./pages/Calendar";
import BasicTables from "./pages/Tables/BasicTables";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import ProtectedRoute from "./components/auth/ProtectedRoute";

// New Page Imports
import DashboardPage from "./pages/Dashboard/DashboardPage";
import NotificationsPage from "./pages/Notifications/NotificationsPage";
import CandidatesPage from "./pages/Tables/CandidatesPage";
import ClientsPage from "./pages/Tables/ClientsPage";
import HrContactsPage from "./pages/Tables/HrContactsPage";
import JobsPage from "./pages/Tables/JobsPage";
import ProcessesPage from "./pages/Tables/ProcessesPage";
import SalesPage from "./pages/Tables/SalesPage";
import UsersPage from "./pages/Tables/UsersPage";
import AddCandidatePage from "./pages/Tables/AddCandidatePage";
import AddClientPage from "./pages/Tables/AddClientPage";
import AdminJobsPage from "./pages/Tables/AdminJobsPage";
import AddJobPage from "./pages/Tables/AddJobPage";
import AddHrContactPage from './pages/Tables/AddHrContactPage';
import AddUserPage from "./pages/Tables/users/new";

export default function App() {
  const AppRoutes = () => {
    const location = useLocation();
    return (
      <Routes>
        {/* Protected Dashboard Layout - Level 1 Auth Check (isAuthenticated) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index path="/" element={<DashboardPage key={location.state?.timestamp || 'dashboard'} />} />
            <Route path="/dashboard" element={<DashboardPage key={location.state?.timestamp || 'dashboard'} />} />
            <Route path="/notifications" element={<NotificationsPage key={location.state?.timestamp || 'notifications'} />} />

            {/* Table Pages - Level 2 Role Check */}
            <Route element={<ProtectedRoute allowedRoles={['Admin', 'Manager', 'HR', 'BD', 'Headhunter']} />}>
              <Route 
                path="/tables/candidates" 
                element={<CandidatesPage key={location.state?.timestamp || '/tables/candidates'} />} 
              />
              {/* AddCandidatePage might need specific roles if different from viewing candidates */}
              {/* For now, assume same roles can access add page, or refine later based on RLS for INSERT */}
              <Route 
                path="/tables/candidates/new" 
                element={<AddCandidatePage />} 
              /> 
              <Route 
                path="/tables/clients" 
                element={<ClientsPage key={location.state?.timestamp || '/tables/clients'} />} 
              />
              <Route 
                path="/tables/clients/new" 
                element={<AddClientPage key={location.state?.timestamp || '/tables/clients/new'} />} 
              />
              <Route 
                path="/tables/hr-contacts" 
                element={<HrContactsPage key={location.state?.timestamp || '/tables/hr-contacts'} />} 
              />
              <Route 
                path="/tables/jobs" 
                element={<JobsPage key={location.state?.timestamp || '/tables/jobs'} />} 
              />
              <Route 
                path="/tables/admin-jobs" 
                element={<AdminJobsPage key={location.state?.timestamp || '/tables/admin-jobs'} />} 
              />
              <Route 
                path="/tables/processes" 
                element={<ProcessesPage key={location.state?.timestamp || '/tables/processes'} />} 
              />
              <Route 
                path="/tables/sales" 
                element={<SalesPage key={location.state?.timestamp || '/tables/sales'} /> } 
              />
              <Route 
                path="/tables/users" // Users page might have more restrictive view roles (e.g., Admin/Manager/HR only based on your RLS)
                                      // For now, keeping it with the general table roles for consistency in this step
                element={<UsersPage key={location.state?.timestamp || '/tables/users'} />} 
              />
              <Route path="/tables/users/new" element={<AddUserPage />} />
              <Route path="/tables/add-hr-contact" element={<AddHrContactPage />} />
            </Route>

            {/* Others Page - Kept for now, review if needed */}
            <Route path="/profile" element={<UserProfiles />} />
            <Route path="/calendar" element={<Calendar key={location.state?.timestamp || 'calendar'} />} />
            <Route path="/blank" element={<Blank />} />

            {/* Forms - Kept for now, review if needed */}
            <Route path="/form-elements" element={<FormElements />} />

            {/* Tables - Old basic table route, can be removed or repurposed */}
            <Route path="/basic-tables" element={<BasicTables />} />

            {/* Ui Elements - Kept for now, review if needed */}
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/avatars" element={<Avatars />} />
            <Route path="/badge" element={<Badges />} />
            <Route path="/buttons" element={<Buttons />} />
            <Route path="/images" element={<Images />} />
            <Route path="/videos" element={<Videos />} />

            {/* Charts - Kept for now, review if needed */}
            <Route path="/line-chart" element={<LineChart />} />
            <Route path="/bar-chart" element={<BarChart />} />

            {/* New Jobs Routes */}
            <Route path="/jobs/admin" element={<AdminJobsPage key={location.state?.timestamp || 'admin-jobs'} />} />
            <Route path="/jobs" element={<JobsPage key={location.state?.timestamp || 'jobs'} />} />
            <Route path="/jobs/add" element={<AddJobPage key={location.state?.timestamp || 'add-job'} />} />
            <Route path="/clients" element={<ClientsPage key={location.state?.timestamp || 'clients'} />} />
            <Route path="/hr-contacts" element={<HrContactsPage key={location.state?.timestamp || 'hr-contacts'} />} />
            <Route path="/candidates" element={<CandidatesPage key={location.state?.timestamp || 'candidates'} />} />
            <Route path="/candidates/add" element={<AddCandidatePage key={location.state?.timestamp || 'add-candidate'} />} />
            <Route path="/processes" element={<ProcessesPage key={location.state?.timestamp || 'processes'} />} />
            <Route path="/sales" element={<SalesPage key={location.state?.timestamp || 'sales'} />} />
            <Route path="/users" element={<UsersPage key={location.state?.timestamp || 'users'} />} />
          </Route>
        </Route>

        {/* Auth Layout - These are public */}
        <Route path="/signin" element={<SignIn />} />

        {/* Fallback Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  };

  return (
    <Router>
      <ScrollToTop />
      <AppRoutes />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </Router>
  );
}
