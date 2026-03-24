import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/lib/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Overview from "@/pages/Overview";
import Leads from "@/pages/Leads";
import Pipeline from "@/pages/Pipeline";
import Inbox from "@/pages/Inbox";
import Instances from "@/pages/Instances";
import Clients from "@/pages/Clients";
import FollowUps from "@/pages/FollowUps";
import Converted from "@/pages/Converted";
import Bot from "@/pages/Bot";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";
import Checkout from "@/pages/Checkout";
import Plans from "@/pages/Plans";
import Secretario from "@/pages/Secretario";
import Pagamentos from "@/pages/Pagamentos";
import LeadDashboard from "@/pages/LeadDashboard";
import Onboarding from "@/pages/Onboarding";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

          <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route path="/overview" element={<Overview />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/leads/:id" element={<LeadDashboard />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/instances" element={<Instances />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/follow-ups" element={<FollowUps />} />
            <Route path="/converted" element={<Converted />} />
            <Route path="/bot" element={<Bot />} />
            <Route path="/pagamentos" element={<Pagamentos />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/secretario" element={<Secretario />} />
          </Route>

          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
