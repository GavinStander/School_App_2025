import { useState } from "react";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

// Define form schema with validation
const customerInfoSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  phone: z.string().min(10, { message: "Please enter a valid phone number" }).optional(),
  studentEmail: z.string().email({ message: "Please enter a valid student email" }).optional(),
  ticketInfo: z.string().optional(),
});

type CustomerInfoValues = z.infer<typeof customerInfoSchema>;

interface CustomerInfoFormProps {
  onSubmit: (values: CustomerInfoValues) => void;
  defaultValues?: Partial<CustomerInfoValues>;
}

export default function CustomerInfoForm({ onSubmit, defaultValues }: CustomerInfoFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize form with react-hook-form
  const form = useForm<CustomerInfoValues>({
    resolver: zodResolver(customerInfoSchema),
    defaultValues: defaultValues || {
      name: "",
      email: "",
      phone: "",
      studentEmail: "",
      ticketInfo: "",
    },
  });
  
  // Handle form submission
  const handleSubmit = async (values: CustomerInfoValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="john.doe@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number (optional)</FormLabel>
              <FormControl>
                <Input placeholder="(123) 456-7890" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="studentEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Student Email (if different from above)</FormLabel>
              <FormControl>
                <Input placeholder="student@school.edu" {...field} />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground">
                Enter the student's email if the purchase should be credited to a specific student
              </p>
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="ticketInfo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Ticket Information</FormLabel>
              <FormControl>
                <Input placeholder="Table preference, dietary restrictions, etc." {...field} />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground">
                Add any specific information related to your ticket purchase
              </p>
            </FormItem>
          )}
        />
        
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <span className="animate-spin mr-2">⚙️</span>
              Processing...
            </>
          ) : (
            "Continue to Payment"
          )}
        </Button>
      </form>
    </Form>
  );
}