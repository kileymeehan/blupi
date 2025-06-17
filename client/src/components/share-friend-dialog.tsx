import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Copy, Check, Mail, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareFriendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareFriendDialog({ open, onOpenChange }: ShareFriendDialogProps) {
  const [friendEmail, setFriendEmail] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const shareUrl = "https://blupi.io";
  const defaultMessage = `I've been using Blupi to create amazing customer journey maps and blueprints, and I think you'd love it too! It's made collaboration on product design so much easier for our team.

Check it out: ${shareUrl}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "The Blupi link has been copied to your clipboard."
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually.",
        variant: "destructive"
      });
    }
  };

  const handleSendEmail = () => {
    const subject = encodeURIComponent("Check out Blupi - Amazing design collaboration tool");
    const body = encodeURIComponent(personalMessage || defaultMessage);
    const mailtoUrl = `mailto:${friendEmail}?subject=${subject}&body=${body}`;
    window.open(mailtoUrl);
  };

  const handleSendMessage = () => {
    const message = encodeURIComponent(personalMessage || defaultMessage);
    // This would open the default messaging app
    const smsUrl = `sms:?body=${message}`;
    window.open(smsUrl);
  };

  const resetForm = () => {
    setFriendEmail("");
    setPersonalMessage("");
    setCopied(false);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Blupi with a Friend</DialogTitle>
          <DialogDescription>
            Help a friend discover Blupi's powerful design collaboration features.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Share Link Section */}
          <div className="space-y-2">
            <Label>Share Link</Label>
            <div className="flex items-center space-x-2">
              <Input
                value={shareUrl}
                readOnly
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="flex items-center gap-2"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>

          {/* Email Section */}
          <div className="space-y-2">
            <Label htmlFor="friend-email">Friend's Email (optional)</Label>
            <Input
              id="friend-email"
              type="email"
              placeholder="friend@example.com"
              value={friendEmail}
              onChange={(e) => setFriendEmail(e.target.value)}
            />
          </div>

          {/* Personal Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Personal Message</Label>
            <Textarea
              id="message"
              placeholder={defaultMessage}
              value={personalMessage}
              onChange={(e) => setPersonalMessage(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleSendMessage}
            className="flex items-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Send Message
          </Button>
          <Button
            onClick={handleSendEmail}
            disabled={!friendEmail}
            className="flex items-center gap-2"
          >
            <Mail className="h-4 w-4" />
            Send Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}