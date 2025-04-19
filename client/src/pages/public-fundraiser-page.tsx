import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Fundraiser, School } from "@shared/schema";
import { ShoppingCart, CalendarIcon, MapPinIcon, SchoolIcon, InfoIcon, TicketIcon, Share2Icon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PublicFundraiserPage() {
  const [_, params] = useRoute("/fundraiser/:id");
  const fundraiserId = params?.id ? parseInt(params.id) : 0;
  const [email, setEmail] = useState("");
  
  // Get referral ID from query string if it exists
  const [referralId, setReferralId] = useState<number | null>(null);
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
      setReferralId(parseInt(ref));
    }
  }, []);
  
  // Get fundraiser details
  const { data: fundraiser, isLoading: isLoadingFundraiser } = useQuery<Fundraiser>({
    queryKey: [`/api/fundraisers/${fundraiserId}`],
  });
  
  // Get school data when we have the fundraiser
  const { data: school, isLoading: isLoadingSchool } = useQuery<School>({
    queryKey: [`/api/schools/${fundraiser?.schoolId}`],
    enabled: !!fundraiser?.schoolId,
  });
  
  const isLoading = isLoadingFundraiser || isLoadingSchool;
  
  const addToCart = () => {
    // Get existing cart from local storage
    const existingCartJson = localStorage.getItem('fundraiser-cart');
    let cart = existingCartJson ? JSON.parse(existingCartJson) : [];
    
    // Add new item with student reference if available
    cart.push({
      id: Date.now(), // Generate a unique ID
      fundraiserId: fundraiserId,
      name: fundraiser?.name || 'Fundraiser',
      eventDate: fundraiser?.eventDate,
      location: fundraiser?.location || 'Unknown',
      quantity: 1,
      price: 10, // Fixed price at $10 per ticket
      studentId: referralId, // Include the referring student's ID
      referral: 'external', // Mark as external referral
      customerEmail: email || undefined // Include email if provided
    });
    
    // Save updated cart back to local storage
    localStorage.setItem('fundraiser-cart', JSON.stringify(cart));
    
    // Navigate to cart page
    window.location.href = "/cart";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b">
          <div className="container py-4">
            <h1 className="text-2xl font-bold">School Fundraiser</h1>
          </div>
        </header>
        
        <main className="flex-1 container py-8">
          <div className="max-w-3xl mx-auto">
            <Skeleton className="h-10 w-3/4 mb-4" />
            <Skeleton className="h-6 w-1/2 mb-6" />
            <Skeleton className="h-72 w-full rounded-lg mb-6" />
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  if (!fundraiser) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b">
          <div className="container py-4">
            <h1 className="text-2xl font-bold">School Fundraiser</h1>
          </div>
        </header>
        
        <main className="flex-1 container py-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-2">Fundraiser Not Found</h1>
            <p className="text-muted-foreground">The fundraiser you're looking for doesn't exist or has been removed.</p>
            <Button className="mt-6" onClick={() => window.location.href = "/"}>
              Return Home
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="container py-4">
          <h1 className="text-2xl font-bold">School Fundraiser</h1>
        </div>
      </header>
      
      <main className="flex-1 container py-8">
        <div className="max-w-3xl mx-auto">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-2xl">{fundraiser.name}</CardTitle>
              <CardDescription>
                {fundraiser.eventDate ? format(new Date(fundraiser.eventDate), "PPP") : "Date TBD"} at {fundraiser.location}
              </CardDescription>
              <Badge variant={fundraiser.isActive ? "default" : "secondary"} className="mt-2">
                {fundraiser.isActive ? "Active" : "Inactive"}
              </Badge>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Date</p>
                    <p className="text-sm text-muted-foreground">
                      {fundraiser.eventDate ? format(new Date(fundraiser.eventDate), "PPP") : "Date not set"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <MapPinIcon className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">
                      {fundraiser.location}
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
                  This is a fundraising event organized by {school?.name}. 
                  {fundraiser.eventDate ? 
                    ` Join us on ${format(new Date(fundraiser.eventDate), "PPP")} at ${fundraiser.location} to support our cause.` : 
                    " Event details coming soon."}
                </p>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              {fundraiser.isActive && (
                <>
                  <div className="w-full">
                    <Label htmlFor="email" className="mb-2 block">Your Email (for ticket confirmation)</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="email@example.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mb-4"
                    />
                  </div>
                  <Button 
                    className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
                    onClick={addToCart}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add to Cart
                  </Button>
                </>
              )}
              
              {!fundraiser.isActive && (
                <div className="w-full p-4 rounded-md bg-muted text-center">
                  <p className="font-medium">This fundraiser is not currently active</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ticket purchasing for this event is unavailable at this time.
                  </p>
                </div>
              )}
              
              {referralId && (
                <div className="text-center text-sm text-muted-foreground mt-2">
                  You are supporting a student with this purchase
                </div>
              )}
            </CardFooter>
          </Card>
        </div>
      </main>
      
      <footer className="border-t py-6">
        <div className="container text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} School Fundraiser Platform
        </div>
      </footer>
    </div>
  );
}