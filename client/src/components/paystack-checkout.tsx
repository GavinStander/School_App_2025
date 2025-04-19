import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// For debugging purposes
console.log("PAYSTACK_PUBLIC_KEY available:", !!import.meta.env.VITE_PAYSTACK_PUBLIC_KEY);

interface PaystackCheckoutProps {
  email: string;
  amount: number; // in naira
  reference?: string;
  metadata?: Record<string, any>;
  onSuccess: (reference: string) => void;
  onError: (error: Error) => void;
  onClose?: () => void;
  isDisabled?: boolean;
  buttonText?: string;
  className?: string;
}

declare global {
  interface Window {
    PaystackPop: any;
  }
}

export default function PaystackCheckout({
  email,
  amount,
  reference,
  metadata,
  onSuccess,
  onError,
  onClose,
  isDisabled = false,
  buttonText = 'Pay with Paystack',
  className,
}: PaystackCheckoutProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [paystackLoaded, setPaystackLoaded] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    console.log('Setting up Paystack script...');
    
    // Check if script is already loaded
    const existingScript = document.getElementById('paystack-script');
    if (existingScript) {
      console.log('Paystack script already exists, removing...');
      document.body.removeChild(existingScript);
    }
    
    // Create and load new script
    const script = document.createElement('script');
    script.id = 'paystack-script';
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    
    script.onload = () => {
      console.log('Paystack script loaded successfully');
      setPaystackLoaded(true);
      // Verify PaystackPop is available
      if (window.PaystackPop) {
        console.log('PaystackPop is available on window');
      } else {
        console.error('PaystackPop not found on window after script load');
      }
    };
    
    script.onerror = (error) => {
      console.error('Error loading Paystack script:', error);
      toast({
        title: 'Error loading Paystack',
        description: 'Please check your internet connection or try again later.',
        variant: 'destructive',
      });
    };
    
    console.log('Appending Paystack script to document body');
    document.body.appendChild(script);
    
    // Set a timeout to check if script loaded properly
    const timeoutId = setTimeout(() => {
      if (!window.PaystackPop) {
        console.warn('PaystackPop not available after 3 seconds, trying alternative approach');
        // Try alternative approach - remove and re-add script
        if (document.getElementById('paystack-script')) {
          document.body.removeChild(document.getElementById('paystack-script')!);
        }
        
        const newScript = document.createElement('script');
        newScript.id = 'paystack-script-retry';
        newScript.src = 'https://js.paystack.co/v1/inline.js';
        newScript.async = false; // Use synchronous loading as a fallback
        newScript.onload = () => {
          console.log('Paystack script loaded successfully on retry');
          setPaystackLoaded(true);
        };
        document.head.appendChild(newScript);
      }
    }, 3000);
    
    return () => {
      clearTimeout(timeoutId);
      // Remove script on cleanup
      const scriptToRemove = document.getElementById('paystack-script');
      if (scriptToRemove) {
        document.body.removeChild(scriptToRemove);
      }
    };
  }, [toast]);
  
  const handlePayment = () => {
    console.log("Paystack initialization starting...");
    console.log("Paystack script loaded:", paystackLoaded);
    console.log("PaystackPop available:", typeof window.PaystackPop !== 'undefined');
    console.log("Paystack API Key available:", !!import.meta.env.VITE_PAYSTACK_PUBLIC_KEY);
    
    if (!paystackLoaded) {
      toast({
        title: 'Paystack not loaded',
        description: 'Please wait for Paystack to load or refresh the page.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!window.PaystackPop) {
      console.error("PaystackPop is not available on window");
      toast({
        title: 'Paystack not initialized',
        description: 'The Paystack library could not be initialized. Please refresh the page and try again.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!import.meta.env.VITE_PAYSTACK_PUBLIC_KEY) {
      console.error("VITE_PAYSTACK_PUBLIC_KEY environment variable is missing");
      toast({
        title: 'Missing API key',
        description: 'Paystack API key is missing. Please contact support.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    
    // Log the payment details for debugging
    console.log("Initializing Paystack payment with:", {
      key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ? "Available (masked)" : "Missing",
      email,
      amount: amount * 100, // convert to kobo (smallest currency unit)
      ref: reference || 'auto-generated',
      metadata: JSON.stringify(metadata || {})
    });
    
    try {
      const paystackOptions = {
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        email,
        amount: amount * 100, // convert to kobo (smallest currency unit)
        ref: reference || '',
        metadata: metadata || {},
        onClose: () => {
          console.log("Paystack payment modal closed by user");
          setIsLoading(false);
          if (onClose) onClose();
        },
        callback: async (response: { reference: string }) => {
          console.log("Paystack callback received:", response);
          try {
            // Check if this is a cart payment by looking at metadata
            const isCartPayment = metadata && metadata.isCart;
            const endpoint = isCartPayment 
              ? '/api/paystack/verify-cart' 
              : '/api/paystack/verify';
            
            console.log(`Verifying payment using endpoint: ${endpoint}`);
            
            // Send verification request to server
            const verificationResponse = await apiRequest('POST', endpoint, {
              reference: response.reference
            });
            
            if (!verificationResponse.ok) {
              const errorData = await verificationResponse.json();
              console.error("Payment verification failed:", errorData);
              throw new Error(errorData.message || 'Payment verification failed');
            }
            
            console.log("Payment verification successful");
            setIsLoading(false);
            onSuccess(response.reference);
          } catch (error: any) {
            console.error("Payment verification error:", error);
            setIsLoading(false);
            onError(new Error(error.message || 'Payment verification failed'));
          }
        },
      };
      
      console.log("Setting up Paystack handler");
      const handler = window.PaystackPop.setup(paystackOptions);
      
      console.log("Opening Paystack payment iframe");
      handler.openIframe();
    } catch (error: any) {
      console.error("Paystack initialization error:", error);
      setIsLoading(false);
      onError(new Error(error.message || 'Failed to initialize Paystack checkout'));
    }
  };
  
  return (
    <Button
      onClick={handlePayment}
      disabled={isDisabled || isLoading || !paystackLoaded}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing
        </>
      ) : (
        buttonText
      )}
    </Button>
  );
}