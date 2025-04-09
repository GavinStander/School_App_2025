import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Fundraiser } from "@shared/schema";
import { SchoolIcon, UsersIcon } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import FundraiserCardGrid from "@/components/fundraiser-card-grid";

export default function StudentFundraisersPage() {
  const { user } = useAuth();
  
  // Fetch user info including student and school details
  const { data: userInfo } = useQuery({
    queryKey: ["/api/user/info"],
  });

  // Fetch school's fundraisers
  const { data: fundraisers, isLoading } = useQuery<Fundraiser[]>({
    queryKey: ["/api/student/fundraisers"],
  });

  return (
    <DashboardLayout title="My Fundraisers" role="student">
      <div className="mb-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">School Fundraisers</h1>
          <p className="text-muted-foreground">
            View all fundraising events from your school
          </p>
        </div>

        {/* School Info */}
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Your School
              </CardTitle>
              <SchoolIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {userInfo?.student?.school?.name || "Loading..."}
              </div>
              <p className="text-xs text-muted-foreground">
                {userInfo?.student?.school?.address || "No address provided"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                School Administrator
              </CardTitle>
              <UsersIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {userInfo?.student?.school?.adminName || "Loading..."}
              </div>
              <p className="text-xs text-muted-foreground">
                School administrator
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Fundraisers */}
        <div className="pt-4">
          <FundraiserCardGrid showHeader={false} />
        </div>
      </div>
    </DashboardLayout>
  );
}