import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Markets from './pages/Markets';
import MarketDetail from './pages/MarketDetail';
import BookStall from './pages/BookStall';
import VendorDashboard from './pages/VendorDashboard';
import OrganizerDashboard from './pages/OrganizerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Favorites from './pages/Favorites';      // ← เพิ่ม
import Shops from './pages/Shops';              // ← เพิ่ม
import NearMe from './pages/NearMe';
import OrganizerFees from './pages/OrganizerFees';
import ShopDetail from './pages/ShopDetail';
import PendingApproval from './pages/PendingApproval';
import PendingVendor from './pages/PendingVendor';
import VendorMessages from './pages/VendorMessages';
import CustomerMessages from './pages/CustomerMessages';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/register" element={<Register />} />
        <Route path="/vendor" element={<VendorDashboard />} />
        <Route path="/organizer" element={<OrganizerDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/book/:marketId" element={<BookStall />} />
        <Route path="/nearme" element={<NearMe />} />
        <Route path="/shops/:id" element={<ShopDetail />} />
        <Route path="/organizer/fees" element={<OrganizerFees />} />
        <Route path="/pending" element={<PendingApproval />} />
        <Route path="/pending-vendor" element={<PendingVendor />} />
        <Route path="/vendor/messages" element={<VendorMessages />} />
        <Route path="/messages" element={<CustomerMessages />} />
        <Route path="*" element={
          <>
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/markets" element={<Markets />} />
              <Route path="/markets/:id" element={<MarketDetail />} />
              <Route path="/favorites" element={<Favorites />} />   {/* ← เพิ่ม */}
              <Route path="/shops" element={<Shops />} />           {/* ← เพิ่ม */}
            </Routes>
          </>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;