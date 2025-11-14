import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { WhatsAppProvider } from "@/contexts/WhatsAppContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";
import AppLayout from "./components/app/AppLayout";
import DashboardHome from "./pages/dashboard/Home";
import ShipmentsPage from "./pages/dashboard/Shipments";
import ShipmentDetails from "./pages/dashboard/ShipmentDetails";
import CustomersPage from "./pages/dashboard/Customers";
import CustomerDetails from "./pages/dashboard/CustomerDetails";
import InsightsPage from "./pages/dashboard/Insights";
import TemplatesPage from "./pages/dashboard/Templates";
import SettingsPage from "./pages/dashboard/Settings";
import ProfilePage from "./pages/dashboard/Profile";
import BillingPage from "./pages/dashboard/Billing";
import BillingSuccess from "./pages/dashboard/billing/Success";
import CreditsSuccess from "./pages/dashboard/billing/CreditsSuccess";
import WhatsAppSettings from "./pages/dashboard/settings/WhatsApp";
import BlingIntegration from './pages/dashboard/settings/integrations/Bling';
import BlingOrders from './pages/dashboard/settings/integrations/BlingOrders';
import ManualPage from './pages/dashboard/Manual';
import { HighlightsProvider } from "@/contexts/HighlightsContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <WhatsAppProvider>
            <HighlightsProvider>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<AppLayout />}>
              <Route index element={<DashboardHome />} />
              <Route path="shipments" element={<ShipmentsPage />} />
              <Route path="shipments/:id" element={<ShipmentDetails />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="customers/:id" element={<CustomerDetails />} />
              <Route path="insights" element={<InsightsPage />} />
              <Route path="templates" element={<TemplatesPage />} />
              <Route path="billing" element={<BillingPage />} />
              <Route path="billing/success" element={<BillingSuccess />} />
              <Route path="billing/credits-success" element={<CreditsSuccess />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="settings/integrations/whatsapp" element={<WhatsAppSettings />} />
              <Route path="settings/integrations/bling" element={<BlingIntegration />} />
              <Route path="settings/integrations/bling/orders" element={<BlingOrders />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="manual" element={<ManualPage />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
            </HighlightsProvider>
          </WhatsAppProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
