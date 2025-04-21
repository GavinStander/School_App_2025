import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard-layout";
import StudentTable from "@/components/student-table";
import EditSchoolForm from "@/components/edit-school-form";
import CreateNotificationForm from "@/components/create-notification-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Loader2, Search, MessageCircle, Ticket, BanknoteIcon, Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function SchoolDashboard() {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: userInfo, isLoading } = useQuery({
    queryKey: ["/api/user/info"],
  });
  
  const { data: salesSummary, isLoading: isLoadingSales } = useQuery({
    queryKey: ["/api/school/sales-summary"],
    enabled: !!userInfo
  });

  const school = userInfo?.school?.school;
  const studentCount = userInfo?.school?.studentCount || 0;
  const sales = salesSummary || { totalAmount: 0, totalTickets: 0, studentCount: 0 };

  if (isLoading) {
    return (
      <DashboardLayout title="School Dashboard" role="school">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="School Dashboard" role="school">
      {/* Ticket Sales Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Ticket Sales
            </CardTitle>
            <BanknoteIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(sales.totalTickets * 100)}</div>
            <p className="text-xs text-muted-foreground">
              Based on {sales.totalTickets} tickets at R100 each
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
            <div className="text-2xl font-bold">{sales.totalTickets}</div>
            <p className="text-xs text-muted-foreground">
              Across all school students
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
            <div className="text-2xl font-bold">{sales.studentCount}</div>
            <p className="text-xs text-muted-foreground">
              Students with ticket sales
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* School Information */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">School Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">School Name</h3>
              <p className="text-base text-gray-900">{school?.name}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Admin Name</h3>
              <p className="text-base text-gray-900">{school?.adminName}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Email</h3>
              <p className="text-base text-gray-900">{userInfo?.email}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Address</h3>
              <p className="text-base text-gray-900">{school?.address || 'No address provided'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Registered On</h3>
              <p className="text-base text-gray-900">
                {school?.createdAt ? format(new Date(school.createdAt), 'MMM dd, yyyy') : 'N/A'}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
            </div>
          </div>
          <div className="mt-6">
            <Button 
              variant="outline" 
              className="text-primary"
              onClick={() => setIsEditDialogOpen(true)}
            >
              Edit Information
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit School Form Dialog */}
      {school && (
        <EditSchoolForm 
          school={school}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}
      
      {/* Registered Students */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Registered Students</h2>
          <div className="flex items-center space-x-2">
            <CreateNotificationForm 
              triggerLabel={
                <div className="flex items-center space-x-2">
                  <MessageCircle className="h-4 w-4" />
                  <span>Notify Students</span>
                </div>
              }
            />
          </div>
        </div>
        
        <StudentTable 
          schoolId={school?.id} 
          searchQuery={searchQuery}
        />
      </div>
    </DashboardLayout>
  );
}
