import { useState, useEffect } from "react";
import { useLocation } from "wouter";
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
import { ArrowLeft, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import DashboardLayout from "@/components/dashboard-layout";
import { apiRequest } from "@/lib/queryClient";

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

export default function PaystackCheckoutPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [scriptLoaded, setScriptLoaded] = useState<boolean>(false);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "success" | "error">("pending");
  const [amount, setAmount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [customerInfo, setCustomerInfo] = useState<{
    name: string;
    email: string;
    phone?: string;
  } | null>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Load Paystack script
  useEffect(() => {
    const loadPaystackScript = () => {
      if (document.getElementById('paystack-script')) {
        console.log('Paystack script already exists');
        setScriptLoaded(true);
        return;
      }
      
      console.log('Loading Paystack script...');
      const script = document.createElement('script');
      script.id = 'paystack-script';
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      
      script.onload = () => {
        console.log('Paystack script loaded successfully');
        setScriptLoaded(true);
      };
      
      script.onerror = (error) => {
        console.error('Error loading Paystack script:', error);
        toast({
          title: 'Error Loading Payment Gateway',
          description: 'Could not load payment gateway. Please try again later.',
          variant: 'destructive',
        });
        setPaymentStatus('error');
      };
      
      document.head.appendChild(script);
    };
    
    loadPaystackScript();
    
    return () => {
      const script = document.getElementById('paystack-script');
      if (script) {
        // Keep the script for reuse
      }
    };
  }, [toast]);

  // Retrieve payment information from sessionStorage
  useEffect(() => {
    try {
      const amountStr = sessionStorage.getItem("cart_payment_amount");
      const customerInfoStr = sessionStorage.getItem("cart_customer_info");
      const cartItemsStr = sessionStorage.getItem("cart_items");
      
      if (!amountStr || !customerInfoStr) {
        toast({
          title: "Payment Error",
          description: "No payment information found. Please return to your cart.",
          variant: "destructive",
        });
        setPaymentStatus("error");
        setIsLoading(false);
        return;
      }
      
      setAmount(parseFloat(amountStr));
      setCustomerInfo(JSON.parse(customerInfoStr));
      
      if (cartItemsStr) {
        setCartItems(JSON.parse(cartItemsStr));
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

  // Initialize Paystack when both script is loaded and data is available
  useEffect(() => {
    if (scriptLoaded && customerInfo && amount > 0 && !isInitialized && paymentStatus === "pending") {
      initializePaystack();
    }
  }, [scriptLoaded, customerInfo, amount, isInitialized, paymentStatus]);

  // Clear cart and payment info after successful payment
  const handlePaymentSuccess = () => {
    // Clear cart
    localStorage.removeItem("fundraiser-cart");
    
    // Clear payment session
    sessionStorage.removeItem("cart_payment_client_secret");
    sessionStorage.removeItem("cart_payment_amount");
    sessionStorage.removeItem("cart_customer_info");
    sessionStorage.removeItem("cart_items");
    
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
    setIsProcessing(false);
    
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

  // Initialize Paystack payment
  const initializePaystack = () => {
    if (!customerInfo) return;
    setIsInitialized(true);
    
    const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    if (!paystackKey) {
      toast({
        title: "Payment Error",
        description: "Payment gateway configuration is missing. Please contact support.",
        variant: "destructive",
      });
      setPaymentStatus("error");
      return;
    }
    
    if (!window.PaystackPop) {
      console.error("PaystackPop is not available");
      toast({
        title: "Payment Error",
        description: "Could not initialize payment gateway. Please try again later.",
        variant: "destructive",
      });
      setPaymentStatus("error");
      return;
    }
    
    try {
      console.log("Initializing Paystack checkout with:", {
        email: customerInfo.email,
        amount: amount,
        metadata: {
          isCart: true,
          customerName: customerInfo.name,
          cartItems: cartItems
        }
      });
      
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
          console.log("Paystack checkout closed by user");
          // User closed the payment modal without completing
          toast({
            title: "Payment Cancelled",
            description: "You closed the payment window without completing the transaction.",
          });
        },
        callback: async (response: { reference: string }) => {
          console.log("Paystack payment callback received:", response);
          setIsProcessing(true);
          
          try {
            // Verify the payment with our server
            const verificationResponse = await apiRequest("POST", "/api/paystack/verify-cart", {
              reference: response.reference
            });
            
            if (!verificationResponse.ok) {
              const errorData = await verificationResponse.json();
              throw new Error(errorData.message || 'Payment verification failed');
            }
            
            handlePaymentSuccess();
          } catch (error: any) {
            console.error("Payment verification error:", error);
            handlePaymentError(new Error(error.message || 'Payment verification failed'));
          }
        }
      });
      
      console.log("Opening Paystack payment form...");
      paystackHandler.openIframe();
    } catch (error: any) {
      console.error("Error setting up Paystack:", error);
      toast({
        title: "Payment Error",
        description: error.message || "Could not initialize payment. Please try again.",
        variant: "destructive",
      });
      setPaymentStatus("error");
    }
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
    
    // Default state - waiting for PayStack to initialize
    return (
      <Card>
        <CardHeader>
          <CardTitle>Paystack Checkout</CardTitle>
          <CardDescription>
            Please complete your payment using Paystack
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-muted-foreground">Total Amount:</span>
              <span className="font-medium">{formatCurrency(amount)}</span>
            </div>
            <Separator />
          </div>
          
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
            <p className="text-center text-muted-foreground">
              {scriptLoaded ? 
                "Initializing Paystack checkout..." : 
                "Loading Paystack payment gateway..."}
            </p>
            <p className="text-center text-sm text-muted-foreground mt-2">
              The Paystack payment window should appear shortly. 
              If it doesn't, please click the button below.
            </p>
            
            <Button 
              onClick={() => initializePaystack()} 
              disabled={!scriptLoaded || isProcessing}
              className="mt-6"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing
                </>
              ) : (
                "Pay with Paystack"
              )}
            </Button>
          </div>
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
    <DashboardLayout title="Paystack Checkout" role={user?.role || "student"}>
      <div className="max-w-2xl mx-auto">
        {renderContent()}
      </div>
    </DashboardLayout>
  );
}