import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { MessageSquarePlus, Bug, Lightbulb, MessageCircle, ThumbsUp, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const feedbackTypes = [
  { value: "bug", label: "Bug", icon: Bug, description: "Something isn't working" },
  { value: "feature", label: "Feature", icon: Lightbulb, description: "Suggest an improvement" },
  { value: "general", label: "General", icon: MessageCircle, description: "Share your thoughts" },
  { value: "praise", label: "Praise", icon: ThumbsUp, description: "Tell us what you love" },
];

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState("general");
  const [content, setContent] = useState("");
  const { toast } = useToast();

  const submitFeedback = useMutation({
    mutationFn: async (data: { type: string; content: string; pageUrl: string }) => {
      const response = await apiRequest("POST", "/api/feedback", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Thank you for your feedback!",
        description: "We appreciate you taking the time to help us improve Blupi.",
      });
      setIsOpen(false);
      setContent("");
      setType("general");
    },
    onError: () => {
      toast({
        title: "Failed to submit feedback",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast({
        title: "Please enter your feedback",
        variant: "destructive",
      });
      return;
    }
    submitFeedback.mutate({
      type,
      content: content.trim(),
      pageUrl: window.location.pathname,
    });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          data-testid="button-feedback"
          variant="outline"
          size="sm"
          className="fixed bottom-4 right-4 z-50 shadow-lg hover:shadow-xl transition-all duration-200 bg-white dark:bg-gray-800 border-2 border-gray-900 dark:border-gray-600 rounded-full px-4 py-2 flex items-center gap-2 group"
        >
          <MessageSquarePlus className="h-4 w-4 text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition-colors" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition-colors">
            Feedback
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        side="top" 
        align="end" 
        className="w-80 p-0 shadow-xl border-2 border-gray-900 dark:border-gray-600 rounded-lg"
        sideOffset={8}
      >
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-t-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Share Feedback
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsOpen(false)}
              data-testid="button-close-feedback"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">What kind of feedback?</Label>
              <RadioGroup
                value={type}
                onValueChange={setType}
                className="grid grid-cols-2 gap-2"
              >
                {feedbackTypes.map((feedbackType) => {
                  const Icon = feedbackType.icon;
                  return (
                    <div key={feedbackType.value}>
                      <RadioGroupItem
                        value={feedbackType.value}
                        id={feedbackType.value}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={feedbackType.value}
                        className="flex flex-col items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all
                          peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 dark:peer-data-[state=checked]:bg-blue-900/20
                          hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700"
                        data-testid={`radio-feedback-${feedbackType.value}`}
                      >
                        <Icon className="h-5 w-5 mb-1 text-gray-600 dark:text-gray-400" />
                        <span className="text-xs font-medium">{feedbackType.label}</span>
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-content" className="text-sm font-medium">
                Your feedback
              </Label>
              <Textarea
                id="feedback-content"
                placeholder="Tell us what's on your mind..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[100px] resize-none border-gray-200 dark:border-gray-700"
                data-testid="textarea-feedback"
              />
            </div>
          </div>

          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-lg">
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={submitFeedback.isPending || !content.trim()}
              data-testid="button-submit-feedback"
            >
              {submitFeedback.isPending ? (
                "Sending..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Feedback
                </>
              )}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
