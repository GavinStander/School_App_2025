import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Fundraiser } from "@shared/schema";
import { format } from "date-fns";
import { CalendarIcon, MapPinIcon, SchoolIcon, UsersIcon } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
            <CardDescription>All fundraising events at your school</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : fundraisers && fundraisers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fundraisers.map((fundraiser) => (
                    <TableRow key={fundraiser.id}>
                      <TableCell className="font-medium">{fundraiser.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <MapPinIcon size={14} className="mr-1" />
                          {fundraiser.location}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <CalendarIcon size={14} className="mr-1" />
                          {format(new Date(fundraiser.eventDate), "PPP")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={fundraiser.isActive ? "default" : "secondary"}>
                          {fundraiser.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <p>No fundraising events have been created by your school yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}