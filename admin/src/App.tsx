import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './components/AuthContext';
import Login from './pages/Login';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import UserDetail from './pages/UserDetail';
import Tickets from './pages/Tickets';
import TicketDetails from './pages/TicketDetails';
import Disputes from './pages/Disputes';
import DisputeDetails from './pages/DisputeDetails';
import Analytics from './pages/Analytics';
import CommissionSettings from './pages/CommissionSettings';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPPORT']} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/users" element={<Users />} />
                <Route path="/users/:id" element={<UserDetail />} />
                <Route path="/tickets" element={<Tickets />} />
                <Route path="/tickets/:id" element={<TicketDetails />} />
                <Route path="/disputes" element={<Disputes />} />
                <Route path="/disputes/:id" element={<DisputeDetails />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/settings/commission" element={<CommissionSettings />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                {/* Add other protected routes here */}
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          <Toaster position="top-right" richColors />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
