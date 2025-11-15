import AdminHeader from '../components/layout/AdminHeader';
import Sidebar from '../components/layout/Sidebar';
import Footer from '../components/layout/Footer';

const AdminLayout = ({ children }) => (
  <div className="admin-layout">
    <AdminHeader />
    <Sidebar />
    <main>{children}</main>
    <Footer />
  </div>
);

export default AdminLayout;
