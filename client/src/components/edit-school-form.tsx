import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

interface School {
  id: number;
  name: string;
  adminName: string;
  address?: string;
}

interface EditSchoolFormProps {
  school: School;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const schoolFormSchema = z.object({
  name: z.string().min(2, "School name must be at least 2 characters"),
  adminName: z.string().min(2, "Admin name must be at least 2 characters"),
  address: z.string().optional(),
});

type SchoolFormValues = z.infer<typeof schoolFormSchema>;

export default function EditSchoolForm({ school, open, onOpenChange }: EditSchoolFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<SchoolFormValues>({
    resolver: zodResolver(schoolFormSchema),
    defaultValues: {
      name: school.name,
      adminName: school.adminName,
      address: school.address || "",
    },
  });

  const updateSchoolMutation = useMutation({
    mutationFn: async (values: SchoolFormValues) => {
      const res = await apiRequest("PUT", "/api/school/update", values);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/info"] });
      toast({
        title: "School updated successfully",
        description: "Your school information has been updated",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update school",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: SchoolFormValues) {
    updateSchoolMutation.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit School Information</DialogTitle>
          <DialogDescription>
            Update your school's information here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>School Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="adminName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Admin Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Enter school address"
                      className="resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button 
                type="submit" 
                disabled={updateSchoolMutation.isPending}
              >
                {updateSchoolMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}