import { Button } from '@/components/ui/button';
import { ExternalLink, ArrowRight, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getChecklistItemAction, ChecklistItemAction as ActionType } from '@/lib/checklist-utils';
import { toast } from 'sonner';

interface ChecklistItemActionProps {
  itemText: string;
  job?: any;
  onTabChange?: (tab: string) => void;
  compact?: boolean;
}

export function ChecklistItemAction({ 
  itemText, 
  job, 
  onTabChange,
  compact = false 
}: ChecklistItemActionProps) {
  const navigate = useNavigate();
  const action = getChecklistItemAction(itemText, job);

  if (!action) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    switch (action.type) {
      case 'internal':
        if (action.path) {
          navigate(action.path);
        }
        break;
      case 'external':
        if (action.url) {
          window.open(action.url, '_blank', 'noopener,noreferrer');
        }
        break;
      case 'tab':
        if (action.tab && onTabChange) {
          if (action.requiresData && action.missingDataMessage) {
            toast.info(action.missingDataMessage, { duration: 4000 });
          }
          onTabChange(action.tab);
        }
        break;
    }
  };

  const Icon = action.type === 'external' ? ExternalLink : ArrowRight;
  const showAlert = action.requiresData && action.missingDataMessage;

  return (
    <Button
      variant="ghost"
      size={compact ? "sm" : "default"}
      onClick={handleClick}
      className={`shrink-0 ${showAlert ? 'text-amber-600 dark:text-amber-500' : ''}`}
      title={action.label}
    >
      {showAlert && <AlertCircle className="h-3 w-3 mr-1" />}
      {!compact && <span className="text-xs">{action.label}</span>}
      <Icon className={compact ? "h-3 w-3" : "h-3 w-3 ml-1"} />
    </Button>
  );
}
