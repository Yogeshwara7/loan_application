import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './components/AdminLayout';
import { UserLayout } from './components/UserLayout';
// Eagerly loaded — primary admin workflow pages.
import { Dashboard } from './pages/Dashboard';
import { Applications } from './pages/Applications';
import { ApplicationDetails } from './pages/ApplicationDetails';
import { NewApplication } from './pages/NewApplication';
// Applicant portal placeholder pages.
import { UserHome } from './pages/user/UserHome';
import { ApplyLoan } from './pages/user/ApplyLoan';
import { MyApplications } from './pages/user/MyApplications';
import { MyApplicationDetails } from './pages/user/MyApplicationDetails';
import { Reapply } from './pages/user/Reapply';
import { Help } from './pages/user/Help';

// Lazily loaded — non-critical admin pages (code-split, fetched on first visit).
const Analytics = lazy(() => import('./pages/Analytics'));
const Admin = lazy(() => import('./pages/Admin'));
const MyProfile = lazy(() => import('./pages/MyProfile'));

export function App() {
  return (
    <Routes>
      {/* Admin portal — existing experience, now namespaced under /admin. */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="applications" element={<Applications />} />
        <Route path="applications/:id" element={<ApplicationDetails />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="new-application" element={<NewApplication />} />
        <Route path="error-logs" element={<Admin />} />
        <Route path="my-profile" element={<MyProfile />} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Route>

      {/* Applicant portal — new placeholder portal under /user. */}
      <Route path="/user" element={<UserLayout />}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<UserHome />} />
        <Route path="apply-loan" element={<ApplyLoan />} />
        <Route path="my-applications" element={<MyApplications />} />
        <Route path="my-applications/:id" element={<MyApplicationDetails />} />
        <Route path="reapply/:id" element={<Reapply />} />
        <Route path="help" element={<Help />} />
        <Route path="*" element={<Navigate to="/user/home" replace />} />
      </Route>

      {/* Default landing: the Admin portal preserves the existing entry point. */}
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
}

export default App;
