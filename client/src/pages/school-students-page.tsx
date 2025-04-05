import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard-layout";
import StudentTable from "@/components/student-table";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function SchoolStudentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Fetch the school information and student data
  const { data: userInfo, isLoading } = useQuery({
    queryKey: ["/api/user/info"],
  });

  const school = userInfo?.school?.school;
  const studentCount = userInfo?.school?.studentCount || 0;

  if (isLoading) {
    return (
      <DashboardLayout title="Students" role="school">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Students" role="school">
      {/* Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h2 className="text-gray-500 text-sm font-medium">Active Fundraisers</h2>
                <p className="text-3xl font-bold text-gray-900">0</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Students List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">All Students</h2>
        </div>
        
        {/* Student table with built-in search */}
        <StudentTable 
          schoolId={school?.id} 
          searchQuery={searchQuery}
        />
      </div>
    </DashboardLayout>
  );
}