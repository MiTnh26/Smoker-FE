import { Fragment } from "react";
import { Route } from "react-router-dom";
import CustomerLayout from "../layouts/CustomerLayout";
import SelectAccountType from "../modules/business/pages/SelectAccountType";
import BarRegister from "../modules/business/pages/BarRegister";
import DJRegister from "../modules/business/pages/DJRegister";
import DancerRegister from "../modules/business/pages/DancerRegister";

export default function BusinessRoutes() {
    return (
        <Fragment>
            <>
                {/*  Các route đăng ký */}
                <Route path="/register/select-account-type" element={<CustomerLayout><SelectAccountType /></CustomerLayout>} />
                <Route path="/register/bar" element={<CustomerLayout><BarRegister /></CustomerLayout>} />
                <Route path="/register/dj" element={<CustomerLayout><DJRegister /></CustomerLayout>} />
                <Route path="/register/dancer" element={<CustomerLayout><DancerRegister /></CustomerLayout>} />
            </>
        </Fragment>
    );
}
