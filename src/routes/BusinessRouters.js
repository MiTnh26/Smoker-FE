import { Fragment } from "react";
import { Route } from "react-router-dom";
import CustomerLayout from "../layouts/CustomerLayout";
import BarLayout from "../layouts/BarLayout";
import SelectAccountType from "../modules/business/pages/SelectAccountType";
import BarRegister from "../modules/business/pages/BarRegister";
import DJRegister from "../modules/business/pages/DJRegister";
import DancerRegister from "../modules/business/pages/DancerRegister";
import BarProfile from "../modules/bar/pages/BarProfile";
import DJProfile from "../modules/dj/pages/DJProfile";
import DancerProfile from "../modules/dancer/pages/DancerProfile";
import ProtectedRoute from "./ProtectedRoute"; // import ProtectedRoute
import DJLayout from "../layouts/DJLayout";
export default function BusinessRoutes() {
    return (
        <Fragment>
            <>
                {/*  Các route đăng ký */}
                <Route 
                    path="/register/select-account-type" 
                    element={
                        <ProtectedRoute roles={["customer"]}>
                            <CustomerLayout><SelectAccountType /></CustomerLayout>
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/register/bar" 
                    element={
                        <ProtectedRoute roles={["customer"]}>
                            <CustomerLayout><BarRegister /></CustomerLayout>
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/register/dj" 
                    element={
                        <ProtectedRoute roles={["customer"]}>
                            <CustomerLayout><DJRegister /></CustomerLayout>
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/register/dancer" 
                    element={
                        <ProtectedRoute roles={["customer"]}>
                            <CustomerLayout><DancerRegister /></CustomerLayout>
                        </ProtectedRoute>
                    } 
                />

                {/* Business profiles */}
                {/* <Route 
                    path="/business/bar/:businessId" 
                    element={
                        <ProtectedRoute role="customer">
                            <BarLayout><BarProfile /></BarLayout>
                        </ProtectedRoute>
                    } 
                /> */}
                <Route 
                    path="/dj/:businessId" 
                    element={
                        // <ProtectedRoute roles={["dj"]}>
                            <DJLayout><DJProfile /></DJLayout>
                        // </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/dancer/:businessId" 
                    element={
                        <ProtectedRoute roles={["dancer"]}>
                            <DJLayout><DancerProfile /></DJLayout>
                        </ProtectedRoute>
                    } 
                />
            </>
        </Fragment>
    );
}
