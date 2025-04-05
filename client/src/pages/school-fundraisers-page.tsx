import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard-layout";
import FundraiserTable from "@/components/fundraiser-table";
import CreateFundraiserForm from "@/components/create-fundraiser-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, MapPinIcon, UsersIcon } from "lucide-react";

export default function SchoolFundraisersPage() {
  const { user } = useAuth();
  
  // Fetch user info including school details
  const { data: userInfo } = useQuery({
    queryKey: ["/api/user/info"],
  });

  return (
    <DashboardLayout title="Fundraising Events" role="school">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Fundraising Events</h1>
            <p className="text-muted-foreground">
              Create and manage fundraising events for your school
            </p>
          </div>
          <CreateFundraiserForm />
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                School Name
              </CardTitle>
              <UsersIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {userInfo?.school?.school?.name || "Loading..."}
              </div>
              <p className="text-xs text-muted-foreground">
                {userInfo?.school?.studentCount || 0} registered students
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                School Address
              </CardTitle>
              <MapPinIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {userInfo?.school?.school?.address || "No address provided"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Administrator
              </CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {userInfo?.school?.school?.adminName || "Loading..."}
              </div>
              <p className="text-xs text-muted-foreground">
                School administrator
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Fundraisers Table */}
        <FundraiserTable />
      </div>
    </DashboardLayout>
  );
}