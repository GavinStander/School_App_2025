import { useState } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { useLocation } from "wouter";
import { CheckCircle2, DollarSign } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";

interface PaymentFormProps {
  fundraiserId: number;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export default function PaymentForm({ fundraiserId, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [paymentError, setPaymentError] = useState<string>("");
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      // Stripe.js hasn't loaded yet
      toast({
        title: "Payment System Error",
        description: "The payment system is still initializing. Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    setPaymentStatus("processing");
    setPaymentError("");
    
    try {
      console.log("Confirming payment with Stripe...");
      
      // Confirm the payment
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          // Make sure to include the fundraiser ID in the redirect URL
          return_url: `${window.location.origin}/payment-success?fundraiser=${fundraiserId}`,
        },
        redirect: "if_required",
      });
      
      console.log("Payment confirmation result:", result);
      
      if (result.error) {
        // Show error and remain on page
        const errorMessage = result.error.message || "An error occurred during payment processing";
        setPaymentError(errorMessage);
        setPaymentStatus("error");
        
        toast({
          title: "Payment Failed",
          description: errorMessage,
          variant: "destructive",
        });
        
        // Call onError callback if provided
        if (onError) {
          onError(new Error(errorMessage));
        }
      } else if (result.paymentIntent && result.paymentIntent.status === "succeeded") {
        // Payment succeeded!
        setPaymentStatus("success");
        
        toast({
          title: "Payment Successful",
          description: "Your ticket purchase was successful!",
        });
        
        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess();
        } else {
          // Redirect after a short delay if no callback provided
          setTimeout(() => {
            navigate(`/payment-success?fundraiser=${fundraiserId}`);
          }, 2000);
        }
      } else if (result.paymentIntent) {
        // Handle other payment statuses
        switch (result.paymentIntent.status) {
          case "processing":
            setPaymentStatus("processing");
            toast({
              title: "Payment Processing",
              description: "Your payment is being processed. We'll update you when it's complete.",
            });
            break;
            
          case "requires_action":
            // The user needs to take additional action, such as 3D Secure authentication
            toast({
              title: "Additional Authentication Required",
              description: "Please complete the additional authentication steps.",
            });
            break;
            
          default:
            const errorMessage = `Payment status: ${result.paymentIntent.status}. Please try again.`;
            setPaymentStatus("error");
            setPaymentError(errorMessage);
            toast({
              title: "Payment Not Completed",
              description: "Your payment could not be completed. Please try again.",
              variant: "destructive",
            });
            
            // Call onError callback if provided
            if (onError) {
              onError(new Error(errorMessage));
            }
        }
      } else {
        // No result info
        const errorMessage = "Unexpected payment response. Please try again.";
        setPaymentStatus("error");
        setPaymentError(errorMessage);
        toast({
          title: "Payment Error",
          description: "An unexpected error occurred. Please try again later.",
          variant: "destructive",
        });
        
        // Call onError callback if provided
        if (onError) {
          onError(new Error(errorMessage));
        }
      }
    } catch (err: any) {
      console.error("Payment processing error:", err);
      const errorMessage = err.message || "An unexpected error occurred";
      setPaymentStatus("error");
      setPaymentError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Call onError callback if provided
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
    } finally {
      setIsProcessing(false);
    }
  };
  
  if (paymentStatus === "success") {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-6">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <h3 className="text-xl font-semibold">Payment Successful!</h3>
        <p className="text-center text-muted-foreground">
          Thank you for your purchase. Your tickets have been reserved.
        </p>
        <p className="text-sm text-muted-foreground">
          Redirecting to confirmation page...
        </p>
      </div>
    );
  }
  
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash">("card");
  const [processingCash, setProcessingCash] = useState(false);
  
  const handleCashPayment = async () => {
    setProcessingCash(true);
    setPaymentError("");
    try {
      // Get cart info from session storage (for cart payments)
      const cartItemsStr = sessionStorage.getItem("cart_items");
      const customerInfoStr = sessionStorage.getItem("cart_customer_info");
      
      let endpoint, requestData;
      
      // Determine if it's a single fundraiser or cart checkout
      if (fundraiserId > 0) {
        // Single fundraiser checkout
        const quantity = Number(sessionStorage.getItem("ticket_quantity") || "1");
        const customerInfo = customerInfoStr ? JSON.parse(customerInfoStr) : null;
        
        endpoint = "/api/cash-payment";
        requestData = {
          fundraiserId,
          quantity,
          customerInfo: customerInfo || {
            name: user?.username || "Guest",
            email: user?.email || "guest@example.com"
          }
        };
      } else {
        // Cart checkout
        const cartItems = cartItemsStr ? JSON.parse(cartItemsStr) : [];
        const customerInfo = customerInfoStr ? JSON.parse(customerInfoStr) : null;
        
        endpoint = "/api/cart/cash-payment";
        requestData = {
          items: cartItems,
          customerInfo: customerInfo || {
            name: user?.username || "Guest",
            email: user?.email || "guest@example.com"
          }
        };
      }
      
      // Make the API request to process cash payment
      const response = await apiRequest("POST", endpoint, requestData);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to process cash payment");
      }
      
      const result = await response.json();
      
      // Success handling
      setPaymentStatus("success");
      
      // Clear session storage
      if (fundraiserId === 0) { // For cart payments
        localStorage.removeItem("fundraiser-cart");
        sessionStorage.removeItem("cart_payment_client_secret");
        sessionStorage.removeItem("cart_payment_amount");
        sessionStorage.removeItem("cart_customer_info");
        sessionStorage.removeItem("cart_items");
      }
      
      toast({
        title: "Cash Payment Recorded",
        description: "Your order has been processed as a cash payment.",
      });
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      } else {
        // Redirect after a short delay if no callback provided
        setTimeout(() => {
          navigate(fundraiserId > 0 
            ? `/payment-success?fundraiser=${fundraiserId}` 
            : "/payment-success");
        }, 2000);
      }
    } catch (err: any) {
      console.error("Cash payment error:", err);
      const errorMessage = err.message || "An unexpected error occurred";
      
      setPaymentStatus("error");
      setPaymentError(errorMessage);
      
      toast({
        title: "Cash Payment Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Call onError callback if provided
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
    } finally {
      setProcessingCash(false);
    }
  };
  
  return (
    <div className="space-y-6">
      {paymentStatus === "error" && (
        <Alert variant="destructive">
          <AlertTitle>Payment Error</AlertTitle>
          <AlertDescription>{paymentError}</AlertDescription>
        </Alert>
      )}
      
      <Tabs defaultValue="card" onValueChange={(v) => setPaymentMethod(v as "card" | "cash")} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="card">Credit Card</TabsTrigger>
          <TabsTrigger value="cash">Cash Payment</TabsTrigger>
        </TabsList>
        
        <TabsContent value="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            <PaymentElement />
            
            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={!stripe || !elements || isProcessing}
              >
                {isProcessing ? "Processing..." : "Complete Credit Card Purchase"}
              </Button>
            </div>
            
            <div className="mt-4 text-center text-sm text-muted-foreground">
              <p>
                This is a test payment. You can use the test card number: 
                <span className="font-mono bg-muted px-1 mx-1">4242 4242 4242 4242</span>
              </p>
              <p>Use any future date for expiry and any 3 digits for CVC.</p>
            </div>
          </form>
        </TabsContent>
        
        <TabsContent value="cash">
          <div className="space-y-6 py-4">
            <div className="rounded-lg bg-muted p-6 text-center">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-medium mb-2">Cash Payment Option</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Select this option to record a cash payment. This should be used when the customer will pay in cash directly.
              </p>
              
              <Button 
                onClick={handleCashPayment}
                className="w-full bg-primary"
                disabled={processingCash}
              >
                {processingCash ? "Processing..." : "Record Cash Payment"}
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Note: Cash payment records are tracked internally and linked to the student who recorded the sale.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}