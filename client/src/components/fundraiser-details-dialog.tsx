import { useState } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Fundraiser, School } from "@shared/schema";
import { CalendarIcon, MapPinIcon, SchoolIcon, InfoIcon, TicketIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

interface FundraiserDetailsDialogProps {
  fundraiserId: number;
  trigger?: React.ReactNode;
}

export default function FundraiserDetailsDialog({
  fundraiserId,
  trigger,
}: FundraiserDetailsDialogProps) {
  const [open, setOpen] = useState(false);

  // Get fundraiser details
  const { data: fundraiser, isLoading: isLoadingFundraiser } = useQuery<Fundraiser>({
    queryKey: [`/api/fundraisers/${fundraiserId}`],
    enabled: open,
  });
  
  // Get school data when we have the fundraiser
  const { data: school, isLoading: isLoadingSchool } = useQuery<School>({
    queryKey: [`/api/schools/${fundraiser?.schoolId}`],
    enabled: !!fundraiser?.schoolId && open,
  });
  
  const isLoading = isLoadingFundraiser || isLoadingSchool;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">View Details</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isLoading ? (
              <Skeleton className="h-8 w-3/4" />
            ) : (
              fundraiser?.name
            )}
          </DialogTitle>
          <DialogDescription>
            Fundraiser details and information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <>
              <div className="grid gap-4">
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Date</p>
                    <p className="text-sm text-muted-foreground">
                      {fundraiser?.eventDate ? format(new Date(fundraiser.eventDate), "PPP") : "Date not set"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <MapPinIcon className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">
                      {fundraiser?.location}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <SchoolIcon className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Organized by</p>
                    <p className="text-sm text-muted-foreground">
                      {school?.name || "Loading school..."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <InfoIcon className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <Badge 
                      variant={fundraiser?.isActive ? "default" : "secondary"}
                      className="mt-1"
                    >
                      {fundraiser?.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <TicketIcon className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Ticket Price</p>
                    <p className="text-sm text-muted-foreground font-medium">
                      {formatCurrency(10)}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">
                  {/* If we add a description field in the future */}
                  This is a fundraising event organized by {school?.name}. 
                  {fundraiser?.eventDate ? 
                    ` Join us on ${format(new Date(fundraiser.eventDate), "PPP")} at ${fundraiser?.location} to support our cause.` : 
                    " Event details coming soon."}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="mt-4 flex justify-between">
          <Button
            variant="default"
            className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
            onClick={() => {
              // Add to cart first
              // Get existing cart from local storage
              const existingCartJson = localStorage.getItem('fundraiser-cart');
              let cart = existingCartJson ? JSON.parse(existingCartJson) : [];
              
              // Add new item
              cart.push({
                id: Date.now(), // Generate a unique ID
                fundraiserId: fundraiserId,
                name: fundraiser?.name || 'Fundraiser',
                eventDate: fundraiser?.eventDate,
                location: fundraiser?.location || 'Unknown',
                quantity: 1,
                price: 10 // Fixed price at $10 per ticket
              });
              
              // Save updated cart back to local storage
              localStorage.setItem('fundraiser-cart', JSON.stringify(cart));
              
              // Close dialog
              setOpen(false);
              
              // Navigate to cart page
              window.location.href = "/cart";
            }}
          >
            Buy Tickets
          </Button>
          <Button onClick={() => setOpen(false)} variant="outline">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}