import { Link, useLocation } from "wouter";
import { User, UserRole } from "@shared/schema";
import { cn } from "@/lib/utils";

interface DashboardSidebarProps {
  role: "admin" | "school" | "student";
  user: User | null;
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export default function DashboardSidebar({
  role,
  user,
  open,
  onClose,
  onLogout,
}: DashboardSidebarProps) {
  const [location] = useLocation();

  const adminMenuItems = [
    { label: "Dashboard", icon: "tachometer-alt", path: "/" },
    { label: "Schools", icon: "school", path: "/admin/schools" },
    { label: "Students", icon: "user-graduate", path: "/admin/students" },
    { label: "Fundraisers", icon: "hand-holding-usd", path: "/admin/fundraisers" },
    { label: "Settings", icon: "cog", path: "/admin/settings" },
  ];

  const schoolMenuItems = [
    { label: "Dashboard", icon: "tachometer-alt", path: "/school" },
    { label: "Students", icon: "user-graduate", path: "/school/students" },
    { label: "Fundraisers", icon: "hand-holding-usd", path: "/school/fundraisers" },
    { label: "School Profile", icon: "id-card", path: "/school/profile" },
  ];

  const studentMenuItems = [
    { label: "Dashboard", icon: "tachometer-alt", path: "/student" },
    { label: "My Fundraisers", icon: "hand-holding-usd", path: "/student/fundraisers" },
    { label: "My School", icon: "school", path: "/student/school" },
    { label: "My Profile", icon: "user", path: "/student/profile" },
  ];

  const menuItems = role === "admin" 
    ? adminMenuItems 
    : role === "school" 
      ? schoolMenuItems 
      : studentMenuItems;

  const menuTitle = role === "admin" 
    ? "Management" 
    : role === "school" 
      ? "School Management" 
      : "Student Portal";

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 w-64 bg-gray-900 text-white transition-all duration-300 transform z-20",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between px-4 py-5 border-b border-gray-800">
          <h1 className="text-xl font-bold">SchoolRaise</h1>
          <button className="md:hidden text-gray-300 hover:text-white" onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="px-4 py-5 border-b border-gray-800">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="font-medium">{user?.username || 'User'}</p>
              <p className="text-sm text-gray-400">{user?.role}</p>
            </div>
          </div>
        </div>
        
        <div className="py-4">
          <p className="px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">{menuTitle}</p>
          {menuItems.map((item) => (
            <Link 
              key={item.path}
              href={item.path}
              className={cn(
                "block px-4 py-2 text-gray-400 hover:bg-gray-800 hover:text-white transition",
                location === item.path && "text-gray-200 bg-gray-800"
              )}
            >
              <i className={`fas fa-${item.icon} w-5 mr-2`}></i> {item.label}
            </Link>
          ))}
        </div>
        
        <div className="px-4 py-4 mt-auto border-t border-gray-800">
          <button 
            onClick={onLogout}
            className="block px-4 py-2 text-gray-400 hover:bg-gray-800 hover:text-white transition w-full text-left"
          >
            <i className="fas fa-sign-out-alt w-5 mr-2"></i> Logout
          </button>
        </div>
      </div>
    </>
  );
}
