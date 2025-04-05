import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import DashboardSidebar from "./dashboard-sidebar";
import DashboardHeader from "./dashboard-header";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  role: "admin" | "school" | "student";
}

export default function DashboardLayout({ children, title, role }: DashboardLayoutProps) {
  const { user, logoutMutation } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <DashboardSidebar
        role={role}
        user={user}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="md:ml-64 flex flex-col min-h-screen">
        {/* Header */}
        <DashboardHeader
          user={user}
          onMenuClick={() => setSidebarOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-grow p-4 sm:p-6 lg:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">{title}</h1>
          {children}
        </main>
      </div>
    </div>
  );
}
