import { User } from "@shared/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import NotificationButton from "./notification-button";
import { Menu } from "lucide-react";
import { Button } from "./ui/button";

interface DashboardHeaderProps {
  user: User | null;
  onMenuClick: () => void;
}

export default function DashboardHeader({ user, onMenuClick }: DashboardHeaderProps) {
  return (
    <header className="bg-white shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center space-x-4">
          <NotificationButton />
          
          <div className="flex items-center">
            <span className="mr-2 text-sm hidden sm:inline-block">{user?.username || 'User'}</span>
            <Avatar>
              <AvatarFallback className="bg-primary text-white">
                {user?.username?.substring(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
