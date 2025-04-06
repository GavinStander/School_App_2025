import { useState } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import StudentTable from "@/components/student-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function AdminStudentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: students } = useQuery<any[]>({
    queryKey: ["/api/admin/students"],
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
      toast({
        title: "Success",
        description: "Student data refreshed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh student data",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <DashboardLayout title="Student Management" role="admin">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Student Management</h1>
        <p className="text-gray-600">View and manage all students in the system.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between mb-6">
        <div className="relative w-full md:w-96">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Search students by name or email..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <StudentTable searchQuery={searchQuery} />
      </div>
    </DashboardLayout>
  );
}