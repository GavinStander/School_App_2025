import { useState } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { useLocation } from "wouter";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PaymentFormProps {
  fundraiserId: number;
}

export default function PaymentForm({ fundraiserId }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [paymentError, setPaymentError] = useState<string>("");
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      // Stripe.js hasn't loaded yet
      return;
    }
    
    setIsProcessing(true);
    setPaymentStatus("processing");
    
    try {
      // Confirm the payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + "/payment-success",
        },
        redirect: "if_required",
      });
      
      if (error) {
        // Show error and remain on page
        setPaymentError(error.message || "An error occurred during payment processing");
        setPaymentStatus("error");
        
        toast({
          title: "Payment Failed",
          description: error.message || "Your payment could not be processed",
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        // Payment succeeded!
        setPaymentStatus("success");
        
        toast({
          title: "Payment Successful",
          description: "Your ticket purchase was successful!",
        });
        
        // Redirect after a short delay
        setTimeout(() => {
          navigate("/payment-success?fundraiser=" + fundraiserId);
        }, 2000);
      } else {
        // Some other status
        setPaymentStatus("error");
        setPaymentError("Unexpected payment status. Please try again.");
      }
    } catch (err: any) {
      setPaymentStatus("error");
      setPaymentError(err.message || "An unexpected error occurred");
      toast({
        title: "Error",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      });
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