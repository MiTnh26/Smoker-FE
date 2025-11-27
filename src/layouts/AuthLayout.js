// AuthLayout.js
import { useLocation } from "react-router-dom";
import AuthHeader from "../components/layout/Auth/AuthHeader";

const AuthLayout = ({ children }) => {
  const { pathname } = useLocation();
  const hideHeaderPaths = ["/profile-setup"];
  const showHeader = !hideHeaderPaths.includes(pathname);

  return (
    <div className="auth-layout">
      {showHeader && <AuthHeader />}
      <main>{children}</main>
    </div>
  );
};

export default AuthLayout;
