import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Fundraiser } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Schema for the form
const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  location: z.string().min(2, "Location must be at least 2 characters"),
  eventDate: z.string().min(1, "Event date is required"),
  isActive: z.boolean(),
  price: z.coerce.number().min(1, "Price must be at least 1"),
  description: z.string().optional(),
  image: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditFundraiserFormProps {
  fundraiser?: Fundraiser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: number;
}

export default function EditFundraiserForm({
  fundraiser,
  open,
  onOpenChange,
  schoolId,
}: EditFundraiserFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [imagePreview, setImagePreview] = useState<string | null>(fundraiser?.image || null);
  const isEditMode = !!fundraiser;

  // Set up form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: fundraiser?.name || "",
      location: fundraiser?.location || "",
      eventDate: fundraiser?.eventDate ? fundraiser.eventDate : new Date().toISOString().split('T')[0],
      isActive: fundraiser?.isActive !== undefined ? fundraiser.isActive : true,
      price: fundraiser?.price ? fundraiser.price / 100 : 10,
      description: fundraiser?.description || "",
      image: fundraiser?.image || "",
    },
  });

  // Mutation for creating/updating fundraiser
  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Convert price from dollars to cents for storage
      const dataToSend = {
        ...values,
        price: Math.round(values.price * 100),
        schoolId: schoolId,
      };

      if (isEditMode) {
        // Update existing fundraiser
        const response = await apiRequest(
          "PATCH",
          `/api/fundraisers/${fundraiser.id}`,
          dataToSend
        );
        return response.json();
      } else {
        // Create new fundraiser
        const response = await apiRequest(
          "POST",
          "/api/fundraisers",
          dataToSend
        );
        return response.json();
      }
    },
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ["/api/fundraisers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/school/fundraisers"] });
      
      // Show success message
      toast({
        title: isEditMode ? "Fundraiser updated" : "Fundraiser created",
        description: isEditMode
          ? "Your fundraiser has been updated successfully."
          : "Your fundraiser has been created successfully.",
      });
      
      // Close the dialog and reset form
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
  };

  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image size should be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Create a FileReader to read the file
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setImagePreview(base64String);
      form.setValue("image", base64String);
    };
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Fundraiser" : "Create Fundraiser"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update your fundraiser details below"
              : "Fill in the details to create a new fundraiser"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Fundraiser name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="Event location" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="eventDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ticket Price ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="10.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your fundraising event"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Image</FormLabel>
              <div className="flex flex-col gap-4">
                {/* Image preview */}
                {imagePreview && (
                  <div className="relative w-full max-w-[200px] aspect-square rounded-md overflow-hidden border">
                    <img
                      src={imagePreview}
                      alt="Fundraiser"
                      className="object-cover w-full h-full"
                    />
                  </div>
                )}
                
                {/* Image upload */}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  Upload a square image (recommended size: 500x500px, max 5MB)
                </p>
              </div>
            </div>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Active Status</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Make this fundraiser visible to students
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={mutation.isPending}
                className={cn(
                  "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
                )}
              >
                {mutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditMode ? "Update Fundraiser" : "Create Fundraiser"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}