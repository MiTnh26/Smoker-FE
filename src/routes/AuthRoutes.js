import { Fragment } from "react";
import { Route } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";
import { Login, Register, GoogleLoginButton } from "../modules/auth";
import ProfileSetup from "../modules/customer/pages/ProfileSetup";
import SelectAccountType from "../modules/business/pages/SelectAccountType";
import BarRegister from "../modules/business/pages/BarRegister";
import DJRegister from "../modules/business/pages/DJRegister";
import DancerRegister from "../modules/business/pages/DancerRegister";

export default function AuthRoutes() {
  return (
    <Fragment>
    <>
      <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />
      <Route path="/register" element={<AuthLayout><Register /></AuthLayout>} />
      <Route path="/login/google" element={<AuthLayout><GoogleLoginButton /></AuthLayout>} />
      <Route path="/profile-setup" element={<AuthLayout><ProfileSetup /></AuthLayout>} />
        {/*  Các route đăng ký */}
     
    </>
    </Fragment>
  );
}
