import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
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
import { Button } from "@/components/ui/button";
import { insertBoardSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { nanoid } from "nanoid";

interface CreateBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateBoardDialog({ open, onOpenChange }: CreateBoardDialogProps) {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(insertBoardSchema),
    defaultValues: {
      name: "",
      description: "",
      blocks: [{
        id: nanoid(),
        type: 'touchpoint',
        content: '',
        phaseIndex: 0,
        columnIndex: 0
      }],
      phases: [{
        id: nanoid(),
        name: "Phase 1",
        columns: [{
          id: nanoid(),
          name: "Step 1"
        }]
      }]
    }
  });

  const createBoardMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/boards", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
      toast({
        title: "Board created",
        description: "Your new blueprint has been created"
      });
      onOpenChange(false);
      setLocation(`/board/${data.id}`);
    }
  });

  const onSubmit = (data: any) => {
    createBoardMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-2 border-[#0A0A0F] rounded-none shadow-[8px_8px_0px_0px_#0A0A0F]">
        <DialogHeader className="border-b-2 border-[#0A0A0F] pb-4">
          <DialogTitle className="text-[#0A0A0F] font-black uppercase tracking-tight">Create New Blueprint</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold uppercase tracking-wide text-xs text-[#0A0A0F]">Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter blueprint name" {...field} className="border-2 border-[#0A0A0F] rounded-none focus:ring-[#FFD600]" />
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
                  <FormLabel className="font-bold uppercase tracking-wide text-xs text-[#0A0A0F]">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter blueprint description"
                      {...field}
                      className="border-2 border-[#0A0A0F] rounded-none focus:ring-[#FFD600] min-h-[100px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full bg-[#0A0A0F] text-white border-2 border-[#0A0A0F] rounded-none shadow-[4px_4px_0px_0px_#FFD600] hover:bg-[#FFD600] hover:text-[#0A0A0F] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] font-bold uppercase tracking-widest transition-all h-12">
              Create Blueprint
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}