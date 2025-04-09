import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Calendar, MapPin, Users } from "lucide-react";
import { Fundraiser, School } from "@shared/schema";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function PaymentSuccessPage() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split("?")[1]);
  const fundraiserId = searchParams.get("fundraiser");
  
  // Fetch fundraiser details if ID is available
  const { data: fundraiser } = useQuery<Fundraiser>({
    queryKey: [`/api/fundraisers/${fundraiserId}`],
    enabled: !!fundraiserId,
  });
  
  // Fetch school info if fundraiser is available
  const { data: school } = useQuery<School>({
    queryKey: [`/api/schools/${fundraiser?.schoolId}`],
    enabled: !!fundraiser?.schoolId,
  });
  
  // Generate a random confirmation number
  const confirmationCode = `SCH${Math.floor(100000 + Math.random() * 900000)}`;
  
  return (
    <div className="container max-w-2xl mx-auto py-12">
      <Card className="border-green-200">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl md:text-3xl">Payment Successful!</CardTitle>
          <CardDescription>
            Your tickets have been reserved successfully
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-muted p-4 text-center">
            <p className="text-sm text-muted-foreground">Confirmation Code</p>
            <p className="text-xl font-mono font-semibold mt-1">{confirmationCode}</p>
          </div>
          
          {fundraiser && (
            <>
              <Separator />
              
              <div className="space-y-3">
                <h3 className="font-semibold">Event Details</h3>
                
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{fundraiser.name}</span>
                  </div>
                  
                  <div className="flex items-center text-sm">
                    <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>
                      {new Date(fundraiser.eventDate).toLocaleDateString(undefined, {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  
                  <div className="flex items-center text-sm">
                    <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{fundraiser.location}</span>
                  </div>
                  
                  {school && (
                    <div className="flex items-center text-sm">
                      <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>Organized by {school.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
          
          <div className="rounded-lg bg-muted p-4 text-sm">
            <p className="text-center text-muted-foreground">
              An email with your tickets and confirmation details has been sent to your email address.
            </p>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-2">
          <Button asChild className="w-full">
            <Link to="/student/dashboard">Back to Dashboard</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/student/fundraisers">View More Fundraisers</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}