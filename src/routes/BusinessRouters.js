import { Fragment } from "react";
import { Route, Navigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import DynamicLayout from "../layouts/DynamicLayout";
import SelectAccountType from "../modules/business/pages/SelectAccountType";
import BarRegister from "../modules/business/pages/BarRegister";
import DJRegister from "../modules/business/pages/DJRegister";
import DancerRegister from "../modules/business/pages/DancerRegister";
import BarProfile from "../modules/bar/pages/BarProfile";
import ProtectedRoute from "./ProtectedRoute"; // import ProtectedRoute
import businessApi from "../api/businessApi";

export default function BusinessRoutes() {
    // Redirect component for DJ public profile
    // Resolve BusinessAccountId → EntityAccountId before redirecting
    function DJProfileRedirect() {
        const { businessId } = useParams();
        const [entityAccountId, setEntityAccountId] = useState(null);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            const resolveEntityAccountId = async () => {
                try {
                    // businessId might be BusinessAccountId, need to get EntityAccountId
                    const res = await businessApi.getBusinessById(businessId);
                    if (res?.status === 'success' && res?.data) {
                        const entityAccountId = res.data.EntityAccountId || res.data.entityAccountId;
                        if (entityAccountId) {
                            setEntityAccountId(entityAccountId);
                        } else {
                            // Fallback: assume businessId is already EntityAccountId
                            setEntityAccountId(businessId);
                        }
                    } else {
                        // Fallback: assume businessId is already EntityAccountId
                        setEntityAccountId(businessId);
                    }
                } catch (error) {
                    console.error("[DJProfileRedirect] Error resolving EntityAccountId:", error);
                    // Fallback: assume businessId is already EntityAccountId
                    setEntityAccountId(businessId);
                } finally {
                    setLoading(false);
                }
            };

            if (businessId) {
                resolveEntityAccountId();
            }
        }, [businessId]);

        if (loading) {
            return <div className="min-h-screen bg-background flex items-center justify-center">Đang tải...</div>;
        }

        if (entityAccountId) {
            return <Navigate to={`/profile/${entityAccountId}`} replace />;
        }

        return <Navigate to="/" replace />;
    }

    // Redirect component for Dancer public profile
    // Resolve BusinessAccountId → EntityAccountId before redirecting
    function DancerProfileRedirect() {
        const { businessId } = useParams();
        const [entityAccountId, setEntityAccountId] = useState(null);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            const resolveEntityAccountId = async () => {
                try {
                    // businessId might be BusinessAccountId, need to get EntityAccountId
                    const res = await businessApi.getBusinessById(businessId);
                    if (res?.status === 'success' && res?.data) {
                        const entityAccountId = res.data.EntityAccountId || res.data.entityAccountId;
                        if (entityAccountId) {
                            setEntityAccountId(entityAccountId);
                        } else {
                            // Fallback: assume businessId is already EntityAccountId
                            setEntityAccountId(businessId);
                        }
                    } else {
                        // Fallback: assume businessId is already EntityAccountId
                        setEntityAccountId(businessId);
                    }
                } catch (error) {
                    console.error("[DancerProfileRedirect] Error resolving EntityAccountId:", error);
                    // Fallback: assume businessId is already EntityAccountId
                    setEntityAccountId(businessId);
                } finally {
                    setLoading(false);
                }
            };

            if (businessId) {
                resolveEntityAccountId();
            }
        }, [businessId]);

        if (loading) {
            return <div className="min-h-screen bg-background flex items-center justify-center">Đang tải...</div>;
        }

        if (entityAccountId) {
            return <Navigate to={`/profile/${entityAccountId}`} replace />;
        }

        return <Navigate to="/" replace />;
    }

    return (
        <Fragment>
            <>
                {/*  Các route đăng ký */}
                <Route 
                    path="/register/select-account-type" 
                    element={
                        <ProtectedRoute roles={["customer"]}>
                            <DynamicLayout><SelectAccountType /></DynamicLayout>
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/register/bar" 
                    element={
                        <ProtectedRoute roles={["customer"]}>
                            <DynamicLayout><BarRegister /></DynamicLayout>
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/register/dj" 
                    element={
                        <ProtectedRoute roles={["customer"]}>
                            <DynamicLayout><DJRegister /></DynamicLayout>
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/register/dancer" 
                    element={
                        <ProtectedRoute roles={["customer"]}>
                            <DynamicLayout><DancerRegister /></DynamicLayout>
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
                        <DynamicLayout><DJProfileRedirect /></DynamicLayout>
                    } 
                />
                <Route 
                    path="/dancer/:businessId" 
                    element={
                        <DynamicLayout><DancerProfileRedirect /></DynamicLayout>
                    } 
                />
            </>
        </Fragment>
    );
}
