import { useState } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { useLocation } from "wouter";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";

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
          // Add the user ID in payment metadata if user is logged in
          payment_method_data: {
            metadata: {
              fundraiserId: fundraiserId.toString(),
              // Include user ID if user is logged in
              ...(user ? { userId: user.id.toString() } : {}),
            }
          }
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
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {paymentStatus === "error" && (
        <Alert variant="destructive">
          <AlertTitle>Payment Error</AlertTitle>
          <AlertDescription>{paymentError}</AlertDescription>
        </Alert>
      )}
      
      <PaymentElement />
      
      <div className="pt-4">
        <Button 
          type="submit" 
          className="w-full" 
          disabled={!stripe || !elements || isProcessing}
        >
          {isProcessing ? "Processing..." : "Complete Purchase"}
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
  );
}