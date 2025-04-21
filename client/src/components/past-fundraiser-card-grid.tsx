import { useQuery } from "@tanstack/react-query";
import { Fundraiser } from "@shared/schema";
import { format } from "date-fns";
import { CalendarIcon, MapPinIcon, InfoIcon, ArrowRightIcon, HistoryIcon } from "lucide-react";
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
import AddToCartButton from "./add-to-cart-button";

interface PastFundraiserCardGridProps {
  limit?: number;
  schoolId?: number;
  showHeader?: boolean;
}

export default function PastFundraiserCardGrid({
  limit,
  schoolId,
  showHeader = true,
}: PastFundraiserCardGridProps) {
  const { data: pastFundraisers, isLoading } = useQuery<Fundraiser[]>({
    queryKey: ["/api/student/past-fundraisers"],
  });

  // Filtered and limited fundraisers
  const displayFundraisers = pastFundraisers
    ? limit
      ? pastFundraisers.slice(0, limit)
      : pastFundraisers
    : [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        {showHeader && (
          <div>
            <h2 className="text-2xl font-bold">Loading...</h2>
            <p className="text-muted-foreground">Past fundraising events</p>
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
            <h2 className="text-2xl font-bold">Past Events</h2>
            <p className="text-muted-foreground">
              No past fundraising events found
            </p>
          </div>
        )}
        <Card>
          <CardContent className="py-10">
            <div className="text-center text-muted-foreground">
              <p>No past fundraising events available in your school's history.</p>
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
          <h2 className="text-2xl font-bold">Past Events</h2>
          <p className="text-muted-foreground">
            Previous school fundraisers you can still purchase tickets for
          </p>
        </div>
      )}
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {displayFundraisers.map((fundraiser) => (
          <Card key={fundraiser.id} className="overflow-hidden transition-all hover:shadow-md border-muted flex flex-col">
            {/* Image section with past event overlay */}
            <div className="aspect-square relative overflow-hidden w-full">
              <div 
                className="w-full h-full bg-cover bg-center transition-transform hover:scale-105 absolute inset-0 brightness-75"
                style={{ 
                  backgroundImage: fundraiser.image 
                    ? `url(${fundraiser.image})` 
                    : 'url(https://images.unsplash.com/photo-1569863664388-63d677908ac0?q=80&w=1000)' 
                }}
              />
              {/* Overlay indicating past event */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-3">
                <Badge variant="outline" className="self-end bg-black/50 text-white border-white/30 backdrop-blur-sm">
                  Past Event
                </Badge>
              </div>
            </div>
            
            <CardHeader className="pb-2 pt-4">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg line-clamp-1">{fundraiser.name}</CardTitle>
              </div>
              <CardDescription>
                <div className="flex items-center mt-1">
                  <CalendarIcon size={14} className="mr-1 flex-shrink-0" />
                  <span className="line-clamp-1">
                    {fundraiser.eventDate ? format(new Date(fundraiser.eventDate), "PPP") : "Date not set"}
                  </span>
                </div>
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pb-2 flex-grow">
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <MapPinIcon size={14} className="flex-shrink-0" />
                <span className="line-clamp-1">{fundraiser.location}</span>
              </div>
              <div className="mt-4 flex justify-between items-center">
                <p className="text-sm line-clamp-2">
                  {fundraiser.description || "This fundraising event has already taken place."}
                </p>
                <div className="text-sm font-medium ml-2 flex-shrink-0">
                  {formatCurrency(fundraiser.price ? fundraiser.price / 100 : 10)}
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="pt-2 flex flex-col gap-2">
              <FundraiserDetailsDialog
                fundraiserId={fundraiser.id}
                trigger={
                  <Button variant="outline" className="w-full">
                    <InfoIcon className="h-4 w-4 mr-1" />
                    View Details & Buy Tickets
                  </Button>
                }
              />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}