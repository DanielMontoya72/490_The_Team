import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Rocket, User, Briefcase, FileText, Mail, Users, Target, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const gettingStartedItems = [
  {
    id: 'setup-profile',
    title: 'Complete Your Profile',
    description: 'Add your personal information, contact details, and preferences',
    icon: User,
    category: 'profile',
    priority: 'high',
    estimatedTime: '10 minutes'
  },
  {
    id: 'create-first-resume',
    title: 'Create Your First Resume',
    description: 'Build a professional resume using our templates',
    icon: FileText,
    category: 'materials',
    priority: 'high',
    estimatedTime: '30 minutes'
  },
  {
    id: 'add-first-job',
    title: 'Add Your First Job Application',
    description: 'Start tracking your job applications and their progress',
    icon: Briefcase,
    category: 'applications',
    priority: 'medium',
    estimatedTime: '15 minutes'
  },
  {
    id: 'create-cover-letter',
    title: 'Create a Cover Letter Template',
    description: 'Build a reusable cover letter template for applications',
    icon: Mail,
    category: 'materials',
    priority: 'medium',
    estimatedTime: '20 minutes'
  },
  {
    id: 'set-career-goals',
    title: 'Set Your Career Goals',
    description: 'Define what success looks like and track your progress',
    icon: Target,
    category: 'planning',
    priority: 'medium',
    estimatedTime: '15 minutes'
  },
  {
    id: 'add-networking-contacts',
    title: 'Add Your First Networking Contacts',
    description: 'Start building your professional network in the app',
    icon: Users,
    category: 'networking',
    priority: 'low',
    estimatedTime: '10 minutes'
  }
];

export function GettingStartedPopup({ isOpen, onClose, userSession }) {
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isAdding, setIsAdding] = useState(false);

  const toggleItem = (itemId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const addToDoItems = async () => {
    if (selectedItems.size === 0) {
      toast.error("Please select at least one item to add to your to-do list.");
      return;
    }

    setIsAdding(true);
    try {
      const itemsToAdd = gettingStartedItems
        .filter(item => selectedItems.has(item.id))
        .map(item => ({
          user_id: userSession.user.id,
          task: item.title,
          description: item.description,
          priority: item.priority,
          category: item.category,
          estimated_time: item.estimatedTime,
          is_getting_started: true,
          status: 'pending'
        }));

      const { error } = await supabase
        .from('todos')
        .insert(itemsToAdd);

      if (error) throw error;

      // Mark user as having seen getting started
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: userSession.user.id,
          has_seen_getting_started: true
        }, {
          onConflict: 'user_id'
        });

      toast.success(`Added ${selectedItems.size} tasks to your to-do list!`);
      onClose();
    } catch (error) {
      console.error('Error adding to-do items:', error);
      toast.error('Failed to add items to your to-do list. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const skipGettingStarted = async () => {
    try {
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: userSession.user.id,
          has_seen_getting_started: true
        }, {
          onConflict: 'user_id'
        });
      onClose();
    } catch (error) {
      console.error('Error updating preferences:', error);
      onClose();
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Rocket className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl">Welcome! Let's Get You Started 🚀</DialogTitle>
                <DialogDescription className="text-base mt-1">
                  Choose the tasks you'd like to add to your to-do list to kick off your job search journey
                </DialogDescription>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={skipGettingStarted}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
            💡 <strong>Tip:</strong> Select the tasks that feel most relevant to your current situation. 
            You can always add more later or modify these in your to-do list.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gettingStartedItems.map((item) => {
              const Icon = item.icon;
              const isSelected = selectedItems.has(item.id);
              
              return (
                <Card 
                  key={item.id}
                  className={`cursor-pointer transition-all border-2 ${
                    isSelected 
                      ? 'border-primary bg-primary/5 shadow-md' 
                      : 'border-border hover:border-primary/50 hover:shadow-sm'
                  }`}
                  onClick={() => toggleItem(item.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className={`font-medium text-sm leading-tight ${isSelected ? 'text-primary' : ''}`}>
                            {item.title}
                          </h3>
                          {isSelected && (
                            <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          )}
                        </div>
                        
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {item.description}
                        </p>
                        
                        <div className="flex items-center gap-2 mt-3">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getPriorityColor(item.priority)}`}
                          >
                            {item.priority}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            ~{item.estimatedTime}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-6 border-t">
            <div className="text-sm text-muted-foreground">
              {selectedItems.size} task{selectedItems.size !== 1 ? 's' : ''} selected
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={skipGettingStarted}
                disabled={isAdding}
              >
                Skip for Now
              </Button>
              <Button 
                onClick={addToDoItems}
                disabled={selectedItems.size === 0 || isAdding}
                className="min-w-[140px]"
              >
                {isAdding ? 'Adding Tasks...' : `Add ${selectedItems.size} Task${selectedItems.size !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}