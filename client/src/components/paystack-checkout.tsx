import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
    // Load Paystack script
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => {
      setPaystackLoaded(true);
    };
    script.onerror = () => {
      toast({
        title: 'Error loading Paystack',
        description: 'Please check your internet connection or try again later.',
        variant: 'destructive',
      });
    };
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, [toast]);
  
  const handlePayment = () => {
    if (!paystackLoaded) {
      toast({
        title: 'Paystack not loaded',
        description: 'Please wait for Paystack to load or refresh the page.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const handler = window.PaystackPop.setup({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        email,
        amount: amount * 100, // convert to kobo (smallest currency unit)
        ref: reference || '',
        metadata: metadata || {},
        onClose: () => {
          setIsLoading(false);
          if (onClose) onClose();
        },
        callback: (response: { reference: string }) => {
          setIsLoading(false);
          onSuccess(response.reference);
        },
      });
      
      handler.openIframe();
    } catch (error: any) {
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