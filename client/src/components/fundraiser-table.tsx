import { useQuery } from "@tanstack/react-query";
import { Fundraiser } from "@shared/schema";
import { format } from "date-fns";
import { CalendarIcon, MapPinIcon } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface FundraiserTableProps {
  limit?: number;
  schoolId?: number;
  showHeader?: boolean;
}

export default function FundraiserTable({ 
  limit, 
  schoolId, 
  showHeader = true 
}: FundraiserTableProps) {
  const { data: fundraisers, isLoading } = useQuery<Fundraiser[]>({
    queryKey: ["/api/school/fundraisers"],
  });

  // Filtered and limited fundraisers
  const displayFundraisers = fundraisers 
    ? (limit ? fundraisers.slice(0, limit) : fundraisers)
    : [];

  if (isLoading) {
    return (
      <Card>
        {showHeader && (
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
            <CardDescription>Fundraising events</CardDescription>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!displayFundraisers.length) {
    return (
      <Card>
        {showHeader && (
          <CardHeader>
            <CardTitle>Fundraising Events</CardTitle>
            <CardDescription>No fundraising events found</CardDescription>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p>No fundraising events have been created yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <CardTitle>Fundraising Events</CardTitle>
          <CardDescription>List of all fundraising events</CardDescription>
        </CardHeader>
      )}
      <CardContent>
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
            {displayFundraisers.map((fundraiser) => (
              <TableRow key={fundraiser.id}>
                <TableCell className="font-medium">{fundraiser.eventName}</TableCell>
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
      </CardContent>
    </Card>
  );
}