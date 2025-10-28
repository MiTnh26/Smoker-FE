// AuthLayout.js
import AuthHeader from '../components/layout/Auth/AuthHeader';

const AuthLayout = ({ children }) => (
  <div className="auth-layout">
    <AuthHeader />
    <main>{children}</main>
  </div>
);

export default AuthLayout;
