import { Route, Routes } from "react-router";
import EffortEstimator from "../Dashboard/Dashboard";

const AgileModelRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<EffortEstimator />} />
            <Route path="/dashboard" element={<EffortEstimator />} />
        </Routes>
    );
}

export default AgileModelRoutes;