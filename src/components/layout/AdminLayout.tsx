
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import SecurityDashboard from "@/components/security/SecurityDashboard";
import AuthSecurityMonitor from "@/components/security/AuthSecurityMonitor";

const AdminLayout = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
      {/* Security monitoring components */}
      <AuthSecurityMonitor />
    </div>
  );
};

export default AdminLayout;
