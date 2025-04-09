import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import FundraiserCardGrid from "@/components/fundraiser-card-grid";

export default function StudentDashboard() {
  const { data: userInfo, isLoading } = useQuery({
    queryKey: ["/api/user/info"],
  });

  const { data: schoolData, isLoading: isLoadingSchool } = useQuery({
    queryKey: ["/api/student/school"],
    enabled: !!userInfo
  });

  if (isLoading || isLoadingSchool) {
    return (
      <DashboardLayout title="Student Dashboard" role="student">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Student Dashboard" role="student">
      {/* School Information Card */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">My School</h2>
          <div className="flex items-center">
            <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-2xl">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M12 14l9-5-9-5-9 5 9 5z" />
                <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
              </svg>
            </div>
            <div className="ml-6">
              <h3 className="text-xl font-medium text-gray-900">{schoolData?.name}</h3>
              <p className="text-gray-500">{schoolData?.address || 'No address provided'}</p>
              <div className="mt-2">
                <Button variant="link" className="p-0 h-auto text-primary">
                  View School Page
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* School Fundraisers */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">School Fundraisers</h2>
          <Button variant="outline" asChild>
            <a href="/student/fundraisers">View All</a>
          </Button>
        </div>
        
        <FundraiserCardGrid limit={3} showHeader={false} />
      </div>
      
      {/* School Updates */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">School Updates</h2>
        
        <Card>
          <div className="divide-y divide-gray-200">
            <div className="p-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-base font-medium text-gray-900">Welcome to SchoolRaise</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Thank you for joining our platform. We're excited to have you participate in fundraising activities!
                  </p>
                  <div className="mt-2 text-sm text-gray-500">
                    {new Date().toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
