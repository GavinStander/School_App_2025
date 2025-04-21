import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard-layout";
import SchoolTable from "@/components/school-table";
import StudentTable from "@/components/student-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, BanknoteIcon, Ticket, School as SchoolIcon, Users, CalendarIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<{ totalSchools: number, totalStudents: number }>({
    queryKey: ["/api/dashboard/stats"],
  });
  
  const { data: salesSummary, isLoading: isLoadingSales } = useQuery({
    queryKey: ["/api/admin/sales-summary"],
    enabled: !!stats // Only fetch this data after the initial stats are loaded
  });
  
  // Defaults with fallbacks to prevent errors
  const dashboardStats = stats || { totalSchools: 0, totalStudents: 0 };
  const salesData = salesSummary?.totalSales || { 
    totalAmount: 0, 
    totalTickets: 0, 
    schoolCount: 0, 
    studentCount: 0 
  };

  // Show loading state if any of the key data is still loading
  if (isLoading) {
    return (
      <DashboardLayout title="Admin Dashboard" role="admin">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Admin Dashboard" role="admin">
      {/* Ticket Sales Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Ticket Sales
            </CardTitle>
            <BanknoteIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(salesData.totalTickets * 100)}</div>
            <p className="text-xs text-muted-foreground">
              Based on {salesData.totalTickets} tickets at R100 each
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Tickets Sold
            </CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salesData.totalTickets}</div>
            <p className="text-xs text-muted-foreground">
              Across all schools
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Schools
            </CardTitle>
            <SchoolIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.totalSchools}</div>
            <p className="text-xs text-muted-foreground">
              Schools in the platform
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Students
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              Total registered students
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* School Sales Summary */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>School Ticket Sales</CardTitle>
          <CardDescription>
            Overview of ticket sales per school
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSales ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : salesSummary?.schoolSales && salesSummary.schoolSales.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3">School</th>
                    <th scope="col" className="px-6 py-3">Tickets Sold</th>
                    <th scope="col" className="px-6 py-3">Total Value</th>
                    <th scope="col" className="px-6 py-3">Active Students</th>
                  </tr>
                </thead>
                <tbody>
                  {salesSummary.schoolSales.map((school, index) => (
                    <tr key={index} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {school.schoolName}
                      </td>
                      <td className="px-6 py-4">
                        {school.totalTickets}
                      </td>
                      <td className="px-6 py-4">
                        {formatCurrency(school.totalTickets * 100)}
                      </td>
                      <td className="px-6 py-4">
                        {school.studentCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-4 text-center text-muted-foreground">
              No school sales data available yet.
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Recent Schools */}
      <div className="mb-8">
        <SchoolTable limit={5} showViewAll={true} viewAllLink="/admin/schools" />
      </div>
      
      {/* Latest Students */}
      <div>
        <StudentTable limit={5} showViewAll={true} viewAllLink="/admin/students" />
      </div>
    </DashboardLayout>
  );
}