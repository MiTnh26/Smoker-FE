import PropTypes from "prop-types";
import AdminHeader from '../components/layout/AdminHeader';
import Sidebar from '../components/layout/Sidebar';

const AdminLayout = ({ children }) => (
  <div className="flex flex-col min-h-screen bg-background">
    <AdminHeader />
    <div className="flex flex-1 w-full">
      <Sidebar />
      <main className="flex-1 w-full">{children}</main>
    </div>
    {/* No footer on admin pages */}
  </div>
);

AdminLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AdminLayout;
