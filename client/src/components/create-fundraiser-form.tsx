import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Fundraiser } from "@shared/schema";

// Form schema
const fundraiserFormSchema = z.object({
  name: z.string().min(3, "Event name must be at least 3 characters"),
  location: z.string().min(3, "Location must be at least 3 characters"),
  eventDate: z.date({
    required_error: "Event date is required",
  }),
});

type FundraiserFormValues = z.infer<typeof fundraiserFormSchema>;

interface CreateFundraiserFormProps {
  onSuccess?: () => void;
}

export default function CreateFundraiserForm({ onSuccess }: CreateFundraiserFormProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FundraiserFormValues>({
    resolver: zodResolver(fundraiserFormSchema),
    defaultValues: {
      name: "",
      location: "",
      eventDate: undefined,
    },
  });

  const createFundraiserMutation = useMutation({
    mutationFn: async (values: FundraiserFormValues) => {
      // Format the date properly as YYYY-MM-DD for the API
      const formattedDate = values.eventDate instanceof Date
        ? format(values.eventDate, 'yyyy-MM-dd')
        : undefined;

      // Note: Now the backend expects event_name which maps to 'name' in the DB
      const res = await apiRequest("POST", "/api/school/fundraisers", {
        event_name: values.name, // event_name in API gets mapped to 'name' in database
        location: values.location,
        eventDate: formattedDate,
      });
      return await res.json() as Fundraiser;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Fundraiser event created successfully",
      });
      // Reset the form completely
      form.reset({
        name: "",
        location: "",
        eventDate: undefined,
      });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/school/fundraisers"] });
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create fundraiser",
        variant: "destructive",
      });
    }
  });

  function onSubmit(values: FundraiserFormValues) {
    createFundraiserMutation.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create New Event</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Fundraiser Event</DialogTitle>
          <DialogDescription>
            Add a new fundraising event for your school. Fill out the details below.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter event name" {...field} aria-label="Event Name" />
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
                    <Input placeholder="Enter event location" {...field} aria-label="Location" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="eventDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Event Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          aria-label="Select Event Date"
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full"
              disabled={createFundraiserMutation.isPending}
            >
              {createFundraiserMutation.isPending ? "Creating..." : "Create Event"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
