import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Properties from './pages/Properties';
import PropertyDetail from './pages/PropertyDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import AuthCallback from './pages/AuthCallback';
import BuyerDashboard from './pages/BuyerDashboard';
import SellerDashboard from './pages/SellerDashboard';
import AgencyDashboard from './pages/AgencyDashboard';
import SubscriptionPlans from './pages/SubscriptionPlans';
import Payment from './pages/Payment';
import Receipt from './pages/Receipt';
import DocumentSignPage from './pages/DocumentSignPage';
import CheckoutPlan from './pages/CheckoutPlan';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/properties/:id" element={<PropertyDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route
            path="/dashboard/buyer"
            element={
              <ProtectedRoute requiredRole="BUYER">
                <BuyerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/seller"
            element={
              <ProtectedRoute requiredRole="SELLER">
                <SellerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/agency"
            element={
              <ProtectedRoute requiredRole="SELLER">
                <AgencyDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/subscription" element={<SubscriptionPlans />} />
          <Route
            path="/checkout/:propertyId/plan"
            element={
              <ProtectedRoute requiredRole="BUYER">
                <CheckoutPlan />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment/:propertyId"
            element={
              <ProtectedRoute requiredRole="BUYER">
                <Payment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/receipt/:id"
            element={
              <ProtectedRoute>
                <Receipt />
              </ProtectedRoute>
            }
          />
          <Route
            path="/documents/:documentId"
            element={
              <ProtectedRoute>
                <DocumentSignPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
