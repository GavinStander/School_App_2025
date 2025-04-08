import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const massNotificationFormSchema = z.object({
  title: z.string().min(2, "Title is required"),
  message: z.string().min(5, "Message is required"),
  type: z.string().default("info"),
  schoolId: z.number(),
});

type MassNotificationFormValues = z.infer<typeof massNotificationFormSchema>;

interface MassNotificationFormProps {
  schoolId: number;
  schoolName?: string;
  onSuccess?: () => void;
  triggerLabel?: string | React.ReactNode;
}

export default function MassNotificationForm({ 
  schoolId,
  schoolName,
  onSuccess, 
  triggerLabel = "Notify All Students" 
}: MassNotificationFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // Fetch students for the school to get count
  const { data: students, isLoading } = useQuery<any[]>({
    queryKey: ["/api/school/students"],
    enabled: open, // Only fetch when dialog is open
  });

  const form = useForm<MassNotificationFormValues>({
    resolver: zodResolver(massNotificationFormSchema),
    defaultValues: {
      title: "",
      message: "",
      type: "info",
      schoolId: schoolId,
    },
  });

  const sendMassNotificationMutation = useMutation({
    mutationFn: async (values: MassNotificationFormValues) => {
      const res = await apiRequest("POST", "/api/notifications/mass", values);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Notification sent to ${data.count} students`,
      });
      form.reset();
      setOpen(false);
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to send notifications",
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: MassNotificationFormValues) {
    sendMassNotificationMutation.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Notify All Students</DialogTitle>
          <DialogDescription>
            {schoolName 
              ? `Send a notification to all students at ${schoolName}`
              : "Send a notification to all students at your school"}
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {students && (
                <div className="text-sm text-muted-foreground mb-2">
                  This will send a notification to <strong>{students.length}</strong> students.
                </div>
              )}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Notification title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Write a detailed message..." 
                        className="min-h-24" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select notification type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={sendMassNotificationMutation.isPending}
                >
                  {sendMassNotificationMutation.isPending ? "Sending..." : "Send to All Students"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}