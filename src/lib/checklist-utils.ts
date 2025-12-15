import { supabase } from '@/integrations/supabase/client';

export type ChecklistItemType = 
  | 'resume' 
  | 'cover_letter' 
  | 'research' 
  | 'portfolio' 
  | 'application' 
  | 'follow_up';

export interface ChecklistItemAction {
  type: 'internal' | 'external' | 'tab';
  label: string;
  path?: string; // for internal navigation
  url?: string; // for external links
  tab?: string; // for tab navigation
  requiresData?: boolean; // if true, check if data exists
  missingDataMessage?: string;
}

const itemKeywords: Record<ChecklistItemType, string[]> = {
  resume: ['tailor resume', 'resume', 'cv'],
  cover_letter: ['cover letter', 'write customized'],
  research: ['research company', 'company background'],
  portfolio: ['portfolio', 'work samples'],
  application: ['complete', 'online application', 'submit'],
  follow_up: ['follow up', 'follow-up'],
};

/**
 * Determines the appropriate action for a checklist item based on its text
 */
export function getChecklistItemAction(
  itemText: string,
  job?: any
): ChecklistItemAction | null {
  const lowerText = itemText.toLowerCase();

  // Resume tailoring
  if (itemKeywords.resume.some(keyword => lowerText.includes(keyword))) {
    return {
      type: 'internal',
      label: 'Go to Resumes',
      path: '/resumes'
    };
  }

  // Cover letter
  if (itemKeywords.cover_letter.some(keyword => lowerText.includes(keyword))) {
    return {
      type: 'internal',
      label: 'Go to Cover Letters',
      path: '/cover-letters'
    };
  }

  // Company research
  if (itemKeywords.research.some(keyword => lowerText.includes(keyword))) {
    return {
      type: 'tab',
      label: 'View Company Info',
      tab: 'company'
    };
  }

  // Portfolio/work samples
  if (itemKeywords.portfolio.some(keyword => lowerText.includes(keyword))) {
    return {
      type: 'tab',
      label: 'View Materials',
      tab: 'materials'
    };
  }

  // Online application
  if (itemKeywords.application.some(keyword => lowerText.includes(keyword))) {
    if (job?.job_url) {
      return {
        type: 'external',
        label: 'Open Job Posting',
        url: job.job_url
      };
    } else {
      return {
        type: 'tab',
        label: 'Add Job URL',
        tab: 'details',
        requiresData: true,
        missingDataMessage: 'Please add a Job Posting URL in the Details tab'
      };
    }
  }

  // Follow up
  if (itemKeywords.follow_up.some(keyword => lowerText.includes(keyword))) {
    return {
      type: 'tab',
      label: 'View Contacts',
      tab: 'contacts',
      requiresData: true,
      missingDataMessage: 'Add a contact in the Contacts tab to follow up with'
    };
  }

  return null;
}

/**
 * Automatically marks a checklist item as completed for a job
 */
export async function markChecklistItemComplete(
  jobId: string,
  itemType: ChecklistItemType
): Promise<void> {
  try {
    // Fetch the checklist for this job
    const { data: checklist, error: fetchError } = await supabase
      .from('application_checklists' as any)
      .select('*')
      .eq('job_id', jobId)
      .single();

    if (fetchError || !checklist) {
      console.error('Error fetching checklist:', fetchError);
      return;
    }

    const items = (checklist as any).checklist_items || [];
    const keywords = itemKeywords[itemType];

    // Find matching item(s) based on keywords
    let updated = false;
    const updatedItems = items.map((item: any) => {
      const itemTextLower = item.text.toLowerCase();
      const matches = keywords.some(keyword => itemTextLower.includes(keyword));
      
      if (matches && !item.completed) {
        updated = true;
        return { ...item, completed: true };
      }
      return item;
    });

    // Only update if something changed
    if (!updated) return;

    // Calculate completion percentage
    const completedCount = updatedItems.filter((item: any) => item.completed).length;
    const completionPercentage = Math.round((completedCount / updatedItems.length) * 100);

    // Update the checklist
    const { error: updateError } = await supabase
      .from('application_checklists' as any)
      .update({
        checklist_items: updatedItems,
        completion_percentage: completionPercentage,
      })
      .eq('id', (checklist as any).id);

    if (updateError) {
      console.error('Error updating checklist:', updateError);
    }
  } catch (error) {
    console.error('Error in markChecklistItemComplete:', error);
  }
}
