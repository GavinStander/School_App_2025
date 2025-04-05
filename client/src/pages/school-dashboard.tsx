import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard-layout";
import StudentTable from "@/components/student-table";
import EditSchoolForm from "@/components/edit-school-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

export default function SchoolDashboard() {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { data: userInfo, isLoading } = useQuery({
    queryKey: ["/api/user/info"],
  });

  const school = userInfo?.school?.school;
  const studentCount = userInfo?.school?.studentCount || 0;

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
      {/* School Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full bg-indigo-100 p-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="ml-4">
                <h2 className="text-gray-500 text-sm font-medium">Total Students</h2>
                <p className="text-3xl font-bold text-gray-900">{studentCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full bg-green-100 p-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 11V9a2 2 0 00-2-2m2 4v4a2 2 0 104 0v-1m-4-3H9m2 0h4m6 1a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h2 className="text-gray-500 text-sm font-medium">Active Fundraisers</h2>
                <p className="text-3xl font-bold text-gray-900">0</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-full bg-amber-100 p-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h2 className="text-gray-500 text-sm font-medium">Total Raised</h2>
                <p className="text-3xl font-bold text-gray-900">$0</p>
              </div>
            </div>
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
          <div className="flex items-center">
            <input 
              type="text" 
              placeholder="Search students..." 
              className="w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm mr-2"
            />
            <Button variant="outline" size="sm">
              Filter
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Button>
          </div>
        </div>
        
        <StudentTable schoolId={school?.id} />
      </div>
    </DashboardLayout>
  );
}
