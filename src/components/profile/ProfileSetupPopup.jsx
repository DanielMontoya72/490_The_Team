import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { User, ArrowRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export function ProfileSetupPopup({ isOpen, onClose, userSession }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const navigate = useNavigate();

  const goToProfile = async () => {
    setIsNavigating(true);
    try {
      // Mark user as having seen profile setup prompt
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: userSession.user.id,
          has_seen_profile_setup: true
        }, {
          onConflict: 'user_id'
        });

      // Navigate to profile page
      navigate('/profile-and-settings');
      onClose();
    } catch (error) {
      console.error('Error updating preferences:', error);
      // Still navigate even if preference update fails
      navigate('/profile-and-settings');
      onClose();
    } finally {
      setIsNavigating(false);
    }
  };

  const skipForNow = async () => {
    try {
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: userSession.user.id,
          has_seen_profile_setup: true
        }, {
          onConflict: 'user_id'
        });
      onClose();
    } catch (error) {
      console.error('Error updating preferences:', error);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">Welcome to Your Career Hub!</DialogTitle>
              <DialogDescription className="mt-1">
                Let's get you started with your profile
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold text-base mb-2">Start with Your Profile</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Complete your profile to unlock all features and get personalized recommendations. 
              Add your personal information, work experience, and career goals to make the most 
              of your job search journey.
            </p>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Quick Setup (5-10 minutes)</h4>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                  <li>• Personal & contact information</li>
                  <li>• Work experience & skills</li>
                  <li>• Career preferences</li>
                  <li>• Privacy settings</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={skipForNow}
            disabled={isNavigating}
            size="sm"
          >
            Skip for Now
          </Button>
          
          <Button 
            onClick={goToProfile}
            disabled={isNavigating}
            className="flex items-center gap-2"
          >
            {isNavigating ? (
              'Taking you there...'
            ) : (
              <>
                Set Up Profile
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}