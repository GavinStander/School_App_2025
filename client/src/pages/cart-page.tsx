import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Loader2, Trash2, CreditCard, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import CustomerInfoForm from "@/components/customer-info-form";

// Interface for cart items
interface CartItem {
  id: number;
  fundraiserId: number;
  name: string;
  eventDate: string;
  location: string;
  quantity: number;
  price: number;
}

// Interface for customer information
interface CustomerInfo {
  name: string;
  email: string;
  phone?: string;
}

export default function CartPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentPath, setLocation] = useLocation();
  
  // State for cart items, loading state, payment method
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("stripe");
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [showCustomerInfoForm, setShowCustomerInfoForm] = useState(true);
  
  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.0; // No tax for now
  const total = subtotal + tax;
  
  // Get cart items from localStorage on component mount
  useEffect(() => {
    const storedCart = localStorage.getItem('fundraiser-cart');
    if (storedCart) {
      try {
        const parsedCart = JSON.parse(storedCart);
        setCartItems(parsedCart);
      } catch (error) {
        console.error("Error parsing cart from localStorage:", error);
        // Clear invalid cart data
        localStorage.removeItem('fundraiser-cart');
      }
    }
    
    // If user is logged in, pre-fill customer info
    if (user) {
      setCustomerInfo({
        name: user.username || "",
        email: user.email || "",
        phone: ""
      });
      setShowCustomerInfoForm(false);
    }
  }, [user]);
  
  // Handle quantity changes
  const handleQuantityChange = (id: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    if (newQuantity > 10) {
      toast({
        title: "Maximum quantity exceeded",
        description: "You can purchase up to 10 tickets per item.",
        variant: "destructive"
      });
      newQuantity = 10;
    }
    
    const updatedCart = cartItems.map(item => 
      item.id === id ? { ...item, quantity: newQuantity } : item
    );
    
    setCartItems(updatedCart);
    localStorage.setItem('fundraiser-cart', JSON.stringify(updatedCart));
  };
  
  // Remove item from cart
  const handleRemoveItem = (id: number) => {
    const updatedCart = cartItems.filter(item => item.id !== id);
    setCartItems(updatedCart);
    localStorage.setItem('fundraiser-cart', JSON.stringify(updatedCart));
    
    toast({
      title: "Item removed",
      description: "The item has been removed from your cart."
    });
  };
  
  // Handle customer info submission
  const handleCustomerInfoSubmit = (info: CustomerInfo) => {
    setCustomerInfo(info);
    setShowCustomerInfoForm(false);
    
    toast({
      title: "Information saved",
      description: "Your contact information has been saved."
    });
  };
  
  // Handle checkout process
  const handleCheckout = async () => {
    if (!customerInfo) {
      toast({
        title: "Missing information",
        description: "Please provide your contact information.",
        variant: "destructive"
      });
      setShowCustomerInfoForm(true);
      return;
    }
    
    if (cartItems.length === 0) {
      toast({
        title: "Empty cart",
        description: "Your cart is empty. Please add items before checkout.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Check if we should process as a multi-item cart or single item checkout
      if (cartItems.length === 1) {
        // Single item checkout - use the existing checkout page
        const item = cartItems[0];
        window.location.href = `/checkout/${item.fundraiserId}?quantity=${item.quantity}`;
        return;
      }
      
      // Process as a multi-item cart checkout
      
      // Prepare checkout data
      const checkoutData = {
        items: cartItems.map(item => ({
          fundraiserId: item.fundraiserId,
          quantity: item.quantity
        })),
        customerInfo
      };
      
      console.log("Submitting cart checkout data:", checkoutData);
      
      // Process checkout with Stripe
      const response = await fetch("/api/cart/create-payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(checkoutData),
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg;
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.message || "Checkout failed";
        } catch (e) {
          errorMsg = errorText || `Server error: ${response.status}`;
        }
        throw new Error(errorMsg);
      }
      
      const { clientSecret, amount } = await response.json();
      
      if (!clientSecret) {
        throw new Error("No client secret returned");
      }
      
      toast({
        title: "Redirecting to payment",
        description: `Processing payment of ${formatCurrency(amount)}`,
      });
      
      // Store client secret and cart information in sessionStorage for payment page
      sessionStorage.setItem("cart_payment_client_secret", clientSecret);
      sessionStorage.setItem("cart_payment_amount", amount.toString());
      sessionStorage.setItem("cart_customer_info", JSON.stringify(customerInfo));
      
      // Store cart items for cash payment option
      const cartItemsData = cartItems.map(item => ({
        fundraiserId: item.fundraiserId,
        quantity: item.quantity,
        amount: item.price * item.quantity * 100 // Convert to cents
      }));
      sessionStorage.setItem("cart_items", JSON.stringify(cartItemsData));
      
      // Navigate to the cart payment page
      window.location.href = "/payment/cart";
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        title: "Checkout failed",
        description: error.message || "There was an error processing your checkout. Please try again.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };
  
  // Clear cart
  const handleClearCart = () => {
    setCartItems([]);
    localStorage.removeItem('fundraiser-cart');
    
    toast({
      title: "Cart cleared",
      description: "All items have been removed from your cart."
    });
  };
  
  return (
    <DashboardLayout title="Shopping Cart" role={user?.role || "student"}>
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Cart Items Section - Left Side */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="border-b">
              <div className="flex justify-between items-center">
                <CardTitle>Your Cart Items</CardTitle>
                {cartItems.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleClearCart}
                  >
                    Clear Cart
                  </Button>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="pt-6">
              {cartItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Your cart is empty.</p>
                  <Button onClick={() => window.location.href = "/student/fundraisers"}>
                    Browse Fundraisers
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between border-b pb-4">
                      <div className="flex-1">
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(item.eventDate).toLocaleDateString()} at {item.location}
                        </p>
                        <p className="text-sm font-medium mt-1">
                          {formatCurrency(item.price)} per ticket
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 rounded-r-none"
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            -
                          </Button>
                          <Input 
                            type="number" 
                            min="1" 
                            max="10"
                            value={item.quantity} 
                            onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                            className="h-8 w-16 rounded-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 rounded-l-none"
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            disabled={item.quantity >= 10}
                          >
                            +
                          </Button>
                        </div>
                        
                        <div className="w-20 text-right font-medium">
                          {formatCurrency(item.price * item.quantity)}
                        </div>
                        
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Customer Information Section */}
          {showCustomerInfoForm ? (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <CustomerInfoForm 
                  onSubmit={handleCustomerInfoSubmit}
                  defaultValues={customerInfo || undefined}
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="mt-6">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle>Contact Information</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowCustomerInfoForm(true)}
                  >
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p>
                    <span className="font-semibold">Name:</span> {customerInfo?.name}
                  </p>
                  <p>
                    <span className="font-semibold">Email:</span> {customerInfo?.email}
                  </p>
                  {customerInfo?.phone && (
                    <p>
                      <span className="font-semibold">Phone:</span> {customerInfo?.phone}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Order Summary - Right Side */}
        <div>
          <Card className="sticky top-4">
            <CardHeader className="border-b">
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                
                <div className="pt-4">
                  <Label className="mb-3 block">Payment Method</Label>
                  <RadioGroup 
                    value={paymentMethod} 
                    onValueChange={setPaymentMethod}
                    className="space-y-3"
                  >
                    <div className="flex items-center space-x-2 border rounded-md p-3">
                      <RadioGroupItem value="stripe" id="stripe" />
                      <Label htmlFor="stripe" className="flex items-center">
                        <CreditCard className="mr-2 h-4 w-4" />
                        Credit Card (Stripe)
                      </Label>
                    </div>
                    
                    {/* Add other payment methods here in the future */}
                  </RadioGroup>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="border-t pt-6">
              <Button 
                className="w-full" 
                size="lg"
                disabled={cartItems.length === 0 || isLoading}
                onClick={handleCheckout}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Proceed to Checkout
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}