import { Route, Routes } from "react-router";
import EffortEstimator from "../Dashboard/Dashboard";
import Login from "../Login/Login";

const AgileModelRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<EffortEstimator />} />
      <Route path="/login" element={<Login />} />
    </Routes>
  );
};

export default AgileModelRoutes;
