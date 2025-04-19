import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingCart, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Fundraiser } from "@shared/schema";

interface AddToCartButtonProps {
  fundraiser: Fundraiser;
  quantity?: number;
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export default function AddToCartButton({
  fundraiser,
  quantity = 1,
  variant = "default",
  size = "default",
  className
}: AddToCartButtonProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Function to add item to cart
  const addToCart = () => {
    setIsAdding(true);
    
    try {
      // Get existing cart from local storage
      const existingCartJson = localStorage.getItem('fundraiser-cart');
      let cart = existingCartJson ? JSON.parse(existingCartJson) : [];
      
      // Check if this fundraiser is already in the cart
      const existingItemIndex = cart.findIndex(
        (item: any) => item.fundraiserId === fundraiser.id
      );
      
      if (existingItemIndex >= 0) {
        // Update quantity if item exists
        const newQuantity = Math.min(cart[existingItemIndex].quantity + quantity, 10);
        cart[existingItemIndex].quantity = newQuantity;
        
        toast({
          title: "Cart updated",
          description: `Updated quantity for "${fundraiser.name}" to ${newQuantity} tickets.`
        });
      } else {
        // Add new item if it doesn't exist
        cart.push({
          id: Date.now(), // Generate a unique ID
          fundraiserId: fundraiser.id,
          name: fundraiser.name,
          eventDate: fundraiser.eventDate,
          location: fundraiser.location,
          quantity: quantity,
          price: 10 // Fixed price for now - $10 per ticket
        });
        
        toast({
          title: "Added to cart",
          description: `"${fundraiser.name}" has been added to your cart.`
        });
      }
      
      // Save updated cart back to local storage
      localStorage.setItem('fundraiser-cart', JSON.stringify(cart));
      
      // Show success state
      setAdded(true);
      setTimeout(() => {
        setAdded(false);
      }, 2000);
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast({
        title: "Error",
        description: "There was a problem adding this item to your cart.",
        variant: "destructive"
      });
    } finally {
      setIsAdding(false);
    }
  };
  
  // Function to view cart
  const viewCart = () => {
    navigate("/cart");
  };
  
  return (
    <div className="flex space-x-2">
      <Button
        variant={variant}
        size={size}
        onClick={addToCart}
        disabled={isAdding}
        className={className}
      >
        {isAdding ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Adding...
          </>
        ) : added ? (
          <>
            <Check className="mr-2 h-4 w-4" />
            Added
          </>
        ) : (
          <>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Add to Cart
          </>
        )}
      </Button>
      
      {added && (
        <Button
          variant="outline"
          size={size}
          onClick={viewCart}
        >
          View Cart
        </Button>
      )}
    </div>
  );
}