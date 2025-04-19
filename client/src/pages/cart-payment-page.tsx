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

// Add PaystackPop type to global Window interface
declare global {
  interface Window {
    PaystackPop: {
      setup: (options: {
        key: string;
        email: string;
        amount: number;
        ref?: string;
        metadata?: Record<string, any>;
        onClose?: () => void;
        callback?: (response: { reference: string }) => void;
      }) => {
        openIframe: () => void;
      };
    };
  }
}

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
                {(() => {
                  // Check if Paystack public key is available
                  const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
                  if (!paystackKey) {
                    return (
                      <div className="p-4 border border-red-300 bg-red-50 rounded-md mb-4">
                        <p className="text-red-600">Paystack API key is missing. Please check your environment variables.</p>
                      </div>
                    );
                  }
                  
                  // Log important information for debugging
                  console.log("Paystack checkout info:", {
                    email: customerInfo.email,
                    amount: amount,
                    publicKey: paystackKey ? "Available" : "Missing"
                  });
                  
                  // Parse cart items for metadata
                  let cartItems = [];
                  try {
                    cartItems = JSON.parse(sessionStorage.getItem("cart_items") || "[]");
                    console.log("Cart items for Paystack:", cartItems);
                  } catch (error) {
                    console.error("Error parsing cart items:", error);
                  }
                  
                  // Direct implementation without the component
                  const handleDirectPaystackPayment = () => {
                    // Make sure script is loaded
                    if (typeof window.PaystackPop === 'undefined') {
                      console.log("Loading Paystack script directly...");
                      const script = document.createElement('script');
                      script.src = 'https://js.paystack.co/v2/inline.js';
                      script.onload = () => {
                        console.log("Paystack script loaded, now initializing payment...");
                        initializePaystack();
                      };
                      document.head.appendChild(script);
                    } else {
                      initializePaystack();
                    }
                  };
                  
                  // Function to initialize Paystack after script is loaded
                  const initializePaystack = () => {
                    if (typeof window.PaystackPop === 'undefined') {
                      console.error("PaystackPop still undefined after script load");
                      toast({
                        title: "Paystack Error",
                        description: "Could not initialize Paystack. Please try again later.",
                        variant: "destructive"
                      });
                      return;
                    }
                    
                    console.log("Initializing Paystack payment...");
                    try {
                      const paystackHandler = window.PaystackPop.setup({
                        key: paystackKey,
                        email: customerInfo.email,
                        amount: amount * 100, // Convert to kobo
                        metadata: {
                          isCart: true,
                          customerName: customerInfo.name,
                          customerPhone: customerInfo.phone || "",
                          cartItems: cartItems
                        },
                        onClose: () => {
                          console.log("Paystack popup closed");
                        },
                        callback: async (response: { reference: string }) => {
                          console.log("Paystack payment successful:", response);
                          
                          try {
                            // Verify the payment with our server
                            const verificationResponse = await fetch('/api/paystack/verify-cart', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                reference: response.reference
                              }),
                            });
                            
                            if (!verificationResponse.ok) {
                              const errorData = await verificationResponse.json();
                              throw new Error(errorData.message || 'Payment verification failed');
                            }
                            
                            handlePaymentSuccess();
                          } catch (error) {
                            console.error("Payment verification error:", error);
                            handlePaymentError(error instanceof Error ? error : new Error('Payment verification failed'));
                          }
                        }
                      });
                      
                      paystackHandler.openIframe();
                    } catch (error) {
                      console.error("Error setting up Paystack:", error);
                      toast({
                        title: "Paystack Error",
                        description: error instanceof Error ? error.message : "Failed to initialize Paystack checkout",
                        variant: "destructive"
                      });
                    }
                  };
                  
                  return (
                    <Button 
                      onClick={handleDirectPaystackPayment}
                      className="w-full"
                    >
                      Pay Now with Paystack
                    </Button>
                  );
                })()}
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