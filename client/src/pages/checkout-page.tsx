import { useState, useEffect } from "react";
import { useLocation, useRoute, Link, useParams } from "wouter";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { useQuery } from "@tanstack/react-query";
import { Fundraiser, School } from "@shared/schema";
import { ChevronLeft, ChevronRight, Ticket, Calendar, Users } from "lucide-react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import CustomerInfoForm from "@/components/customer-info-form";
import PaymentForm from "@/components/payment-form";
import { apiRequest } from "@/lib/queryClient";
import DashboardLayout from "@/components/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";

// Initialize Stripe
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error("Missing Stripe publishable key");
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export default function CheckoutPage() {
  const { fundraiserId } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [step, setStep] = useState<string>("details");
  const [quantity, setQuantity] = useState<number>(1);
  const [clientSecret, setClientSecret] = useState<string>("");
  const [customerInfo, setCustomerInfo] = useState<{
    name: string;
    email: string;
    phone?: string;
  }>({
    name: "",
    email: "",
    phone: "",
  });
  
  // Fetch fundraiser details
  const { data: fundraiser, isLoading: isLoadingFundraiser, error } = useQuery<Fundraiser>({
    queryKey: [`/api/fundraisers/${fundraiserId}`],
    enabled: !!fundraiserId,
  });
  
  // Fetch school info
  const { data: school, isLoading: isLoadingSchool } = useQuery<School>({
    queryKey: [`/api/schools/${fundraiser?.schoolId}`],
    enabled: !!fundraiser?.schoolId,
  });
  
  const isLoading = isLoadingFundraiser || isLoadingSchool;
  
  // Fixed ticket price for now (in dollars)
  const ticketPrice = 10;
  const totalAmount = ticketPrice * quantity;
  
  // Handle quantity changes
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (value > 0 && value <= 10) {
      setQuantity(value);
    }
  };
  
  // Handle customer info form submit
  const handleCustomerInfoSubmit = async (info: typeof customerInfo) => {
    try {
      console.log("Customer info submitted:", info);
      setCustomerInfo(info);
      
      // Store quantity and customer info in sessionStorage for cash payment
      sessionStorage.setItem("ticket_quantity", quantity.toString());
      sessionStorage.setItem("cart_customer_info", JSON.stringify(info));
      
      // Create payment intent
      console.log("Creating payment intent with data:", {
        fundraiserId: parseInt(fundraiserId!),
        quantity,
        customerInfo: info,
      });
      
      const response = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fundraiserId: parseInt(fundraiserId!),
          quantity,
          customerInfo: info,
        }),
        credentials: "include",
      });
      
      console.log("Payment intent response status:", response.status);
      
      if (!response.ok) {
        const text = await response.text();
        console.log("Error response text:", text);
        
        let errorMsg;
        try {
          // Try to parse as JSON
          const errorJson = JSON.parse(text);
          errorMsg = errorJson.message || "An error occurred during payment processing";
        } catch (e) {
          // If not valid JSON, use the raw text
          errorMsg = text || `Server error: ${response.status}`;
        }
        throw new Error(errorMsg);
      }
      
      const data = await response.json();
      console.log("Payment intent response data:", data);
      
      if (!data.clientSecret) {
        throw new Error("No client secret returned from the server");
      }
      
      console.log("Setting client secret and proceeding to payment step");
      setClientSecret(data.clientSecret);
      
      // Proceed to payment step
      setStep("payment");
    } catch (error: any) {
      console.error("Payment intent error:", error);
      toast({
        title: "Payment Setup Error",
        description: error.message || "An error occurred while processing your request",
        variant: "destructive",
      });
    }
  };
  
  // If there's an error or no fundraiser found
  if (error || (!isLoading && !fundraiser)) {
    return (
      <DashboardLayout title="Error" role={user?.role || "student"}>
        <div className="container max-w-4xl mx-auto py-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Could not find the fundraiser you're looking for.</p>
            </CardContent>
            <CardFooter>
              <Button asChild>
                <Link to="/">Go Back Home</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout title={`Checkout - ${fundraiser?.name || "Fundraiser"}`} role={user?.role || "student"}>
      <div className="container max-w-4xl mx-auto py-8">
        <div className="flex flex-col space-y-6">
          <Link to={`/student/fundraisers`}>
            <Button variant="ghost" className="justify-start p-0">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Fundraisers
            </Button>
          </Link>
          
          <h1 className="text-3xl font-bold">{fundraiser?.name || "Fundraiser Checkout"}</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column - Order summary */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoading ? (
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-muted rounded"></div>
                      <div className="h-4 bg-muted rounded"></div>
                      <div className="h-4 bg-muted rounded"></div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-5 w-5 text-muted-foreground" />
                          <span>Event Date</span>
                        </div>
                        <span>{new Date(fundraiser?.eventDate || "").toLocaleDateString()}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <div className="flex items-center">
                          <Users className="mr-2 h-5 w-5 text-muted-foreground" />
                          <span>Organized by</span>
                        </div>
                        <span>{school?.name}</span>
                      </div>
                      
                      <Separator />
                      
                      <div className="flex justify-between">
                        <div className="flex items-center">
                          <Ticket className="mr-2 h-5 w-5 text-muted-foreground" />
                          <span>Tickets</span>
                        </div>
                        <span>{quantity} × ${ticketPrice}</span>
                      </div>
                      
                      <Separator />
                      
                      <div className="flex justify-between font-bold">
                        <span>Total</span>
                        <span>${totalAmount.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Right column - Checkout steps */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Checkout</CardTitle>
                  <CardDescription>Complete your purchase</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs value={step} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="details">Customer Info</TabsTrigger>
                      <TabsTrigger value="payment" disabled={!customerInfo.email}>Payment</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="details" className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="quantity">Number of Tickets</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          max="10"
                          value={quantity}
                          onChange={handleQuantityChange}
                        />
                      </div>
                      
                      <CustomerInfoForm onSubmit={handleCustomerInfoSubmit} />
                    </TabsContent>
                    
                    <TabsContent value="payment" className="py-4">
                      {clientSecret ? (
                        <Elements stripe={stripePromise} options={{ clientSecret }}>
                          <PaymentForm fundraiserId={parseInt(fundraiserId!)} />
                        </Elements>
                      ) : (
                        <div className="flex items-center justify-center h-40">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}