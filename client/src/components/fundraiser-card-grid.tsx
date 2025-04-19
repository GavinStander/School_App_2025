import { useQuery } from "@tanstack/react-query";
import { Fundraiser } from "@shared/schema";
import { format } from "date-fns";
import { CalendarIcon, MapPinIcon, InfoIcon, ArrowRightIcon } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import FundraiserDetailsDialog from "./fundraiser-details-dialog";

interface FundraiserCardGridProps {
  limit?: number;
  schoolId?: number;
  showHeader?: boolean;
}

export default function FundraiserCardGrid({
  limit,
  schoolId,
  showHeader = true,
}: FundraiserCardGridProps) {
  const { data: fundraisers, isLoading } = useQuery<Fundraiser[]>({
    queryKey: ["/api/student/fundraisers"],
  });

  // Filtered and limited fundraisers
  const displayFundraisers = fundraisers
    ? limit
      ? fundraisers.slice(0, limit)
      : fundraisers
    : [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        {showHeader && (
          <div>
            <h2 className="text-2xl font-bold">Loading...</h2>
            <p className="text-muted-foreground">Fundraising events</p>
          </div>
        )}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="h-[260px]">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!displayFundraisers.length) {
    return (
      <div className="space-y-6">
        {showHeader && (
          <div>
            <h2 className="text-2xl font-bold">Fundraising Events</h2>
            <p className="text-muted-foreground">
              No fundraising events found
            </p>
          </div>
        )}
        <Card>
          <CardContent className="py-10">
            <div className="text-center text-muted-foreground">
              <p>No fundraising events have been created yet.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showHeader && (
        <div>
          <h2 className="text-2xl font-bold">Fundraising Events</h2>
          <p className="text-muted-foreground">
            Upcoming school fundraisers you can participate in
          </p>
        </div>
      )}
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {displayFundraisers.map((fundraiser) => (
          <Card key={fundraiser.id} className="overflow-hidden transition-all hover:shadow-md">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{fundraiser.name}</CardTitle>
                <Badge variant={fundraiser.isActive ? "default" : "secondary"}>
                  {fundraiser.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <CardDescription>
                <div className="flex items-center mt-1">
                  <CalendarIcon size={14} className="mr-1" />
                  {fundraiser.eventDate ? format(new Date(fundraiser.eventDate), "PPP") : "Date not set"}
                </div>
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pb-2">
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <MapPinIcon size={14} />
                <span>{fundraiser.location}</span>
              </div>
              <div className="mt-4 flex justify-between items-center">
                <p className="text-sm">
                  Join our fundraising event to support our school!
                </p>
                <div className="text-sm font-medium">
                  Ticket: {formatCurrency(10)}
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="pt-2 flex justify-between">
              <FundraiserDetailsDialog
                fundraiserId={fundraiser.id}
                trigger={
                  <Button variant="outline" size="sm">
                    <InfoIcon className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                }
              />
              <Button variant="ghost" size="icon">
                <ArrowRightIcon className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}