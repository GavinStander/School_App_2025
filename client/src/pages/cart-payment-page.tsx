import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import DashboardLayout from "@/components/dashboard-layout";

// Custom payment components
import PaymentForm from "@/components/payment-form";
import PaystackCheckout from "@/components/paystack-checkout";

// Make sure to call loadStripe outside of a component's render to avoid
// recreating the Stripe object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error("Missing Stripe public key");
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export default function CartPaymentPage() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  
  const [clientSecret, setClientSecret] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "success" | "error">("pending");
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "paystack">("stripe");
  const [customerInfo, setCustomerInfo] = useState<{
    name: string;
    email: string;
    phone?: string;
  } | null>(null);
  
  // Retrieve payment information from sessionStorage
  useEffect(() => {
    try {
      // Check URL query parameter for payment method
      const urlSearchParams = new URLSearchParams(window.location.search);
      const methodParam = urlSearchParams.get("method");
      
      // Set payment method based on URL parameter or default to stripe
      if (methodParam === "paystack") {
        setPaymentMethod("paystack");
      } else {
        setPaymentMethod("stripe");
      }
      
      // Get payment information from sessionStorage
      const secret = sessionStorage.getItem("cart_payment_client_secret");
      const amountStr = sessionStorage.getItem("cart_payment_amount");
      const customerInfoStr = sessionStorage.getItem("cart_customer_info");
      
      if (!amountStr) {
        toast({
          title: "Payment Error",
          description: "No payment information found. Please return to your cart.",
          variant: "destructive",
        });
        setPaymentStatus("error");
        setIsLoading(false);
        return;
      }
      
      // For stripe, we need the client secret
      if (methodParam === "stripe" && !secret) {
        toast({
          title: "Payment Error",
          description: "No payment information found. Please return to your cart.",
          variant: "destructive",
        });
        setPaymentStatus("error");
        setIsLoading(false);
        return;
      }
      
      if (secret) {
        setClientSecret(secret);
      }
      
      if (amountStr) {
        setAmount(parseFloat(amountStr));
      }
      
      if (customerInfoStr) {
        setCustomerInfo(JSON.parse(customerInfoStr));
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error("Error retrieving payment info:", error);
      toast({
        title: "Payment Setup Error",
        description: "Could not retrieve payment information. Please try again.",
        variant: "destructive",
      });
      setPaymentStatus("error");
      setIsLoading(false);
    }
  }, [toast]);
  
  // Clear cart and payment info after successful payment
  const handlePaymentSuccess = () => {
    // Clear cart
    localStorage.removeItem("fundraiser-cart");
    
    // Clear payment session
    sessionStorage.removeItem("cart_payment_client_secret");
    sessionStorage.removeItem("cart_payment_amount");
    sessionStorage.removeItem("cart_customer_info");
    
    setPaymentStatus("success");
    
    toast({
      title: "Payment Successful",
      description: "Your order has been processed successfully.",
    });
  };
  
  // Handle payment error
  const handlePaymentError = (error: Error) => {
    console.error("Payment error:", error);
    setPaymentStatus("error");
    
    toast({
      title: "Payment Failed",
      description: error.message || "There was an error processing your payment.",
      variant: "destructive",
    });
  };
  
  // Return to cart
  const handleReturnToCart = () => {
    window.location.href = "/cart";
  };
  
  // Content based on payment status
  const renderContent = () => {
    if (isLoading) {
      return (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
            <p className="text-center text-muted-foreground">Loading payment information...</p>
          </CardContent>
        </Card>
      );
    }
    
    if (paymentStatus === "success") {
      return (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-center text-2xl">Payment Successful!</CardTitle>
            <CardDescription className="text-center">
              Thank you for your purchase. Your order has been processed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-md">
                <p className="text-center text-lg font-semibold">
                  Total Amount: {formatCurrency(amount)}
                </p>
              </div>
              
              {customerInfo && (
                <div>
                  <h3 className="font-medium mb-2">Order Details:</h3>
                  <p><span className="font-semibold">Name:</span> {customerInfo.name}</p>
                  <p><span className="font-semibold">Email:</span> {customerInfo.email}</p>
                  {customerInfo.phone && (
                    <p><span className="font-semibold">Phone:</span> {customerInfo.phone}</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-center pt-4">
            <Button asChild>
              <Link to="/student/fundraisers">Return to Fundraisers</Link>
            </Button>
          </CardFooter>
        </Card>
      );
    }
    
    if (paymentStatus === "error") {
      return (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <AlertCircle className="h-16 w-16 text-red-500" />
            </div>
            <CardTitle className="text-center text-2xl">Payment Failed</CardTitle>
            <CardDescription className="text-center">
              There was an error processing your payment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center mb-6">
              Please try again or contact support if the problem persists.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center pt-4">
            <Button onClick={handleReturnToCart}>Return to Cart</Button>
          </CardFooter>
        </Card>
      );
    }
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>Complete Your Payment</CardTitle>
          <CardDescription>
            Please enter your payment details to complete your purchase
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-muted-foreground">Total Amount:</span>
              <span className="font-medium">{formatCurrency(amount)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-muted-foreground">Payment Method:</span>
              <span className="font-medium capitalize">{paymentMethod}</span>
            </div>
            <Separator />
          </div>
          
          {paymentMethod === "stripe" && clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentForm 
                fundraiserId={0} // Not used for cart payment
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            </Elements>
          ) : paymentMethod === "paystack" && customerInfo ? (
            <div className="space-y-6">
              <div className="text-center">
                <p className="mb-4">Click the button below to complete your payment with Paystack</p>
                <PaystackCheckout
                  email={customerInfo.email}
                  amount={amount}
                  metadata={{
                    isCart: true,
                    customerName: customerInfo.name,
                    customerPhone: customerInfo.phone || "",
                    cartItems: JSON.parse(sessionStorage.getItem("cart_items") || "[]")
                  }}
                  onSuccess={(reference) => {
                    console.log("Paystack payment successful", reference);
                    handlePaymentSuccess();
                  }}
                  onError={handlePaymentError}
                  buttonText="Pay Now with Paystack"
                  className="w-full"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={handleReturnToCart} className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Cart
          </Button>
        </CardFooter>
      </Card>
    );
  };
  
  return (
    <DashboardLayout title="Payment" role={user?.role || "student"}>
      <div className="max-w-2xl mx-auto">
        {renderContent()}
      </div>
    </DashboardLayout>
  );
}