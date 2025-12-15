import { supabase } from '@/integrations/supabase/client';

const defaultTodoTemplates = [
  {
    title: 'Research company culture and values',
    category: 'research',
    priority: 'high',
    description: 'Review company website, LinkedIn, and Glassdoor reviews'
  },
  {
    title: 'Tailor resume for this position',
    category: 'application',
    priority: 'high',
    description: 'Customize resume to highlight relevant skills and experience'
  },
  {
    title: 'Write customized cover letter',
    category: 'application',
    priority: 'high',
    description: 'Create a compelling cover letter addressing job requirements'
  },
  {
    title: 'Prepare portfolio or work samples',
    category: 'application',
    priority: 'medium',
    description: 'Gather relevant work examples and projects'
  },
  {
    title: 'Prepare portfolio presentation for interview',
    category: 'interview_prep',
    priority: 'medium',
    description: 'Organize and prepare to present your portfolio during the interview'
  },
  {
    title: 'Practice common interview questions',
    category: 'interview_prep',
    priority: 'medium',
    description: 'Prepare answers for behavioral and technical questions'
  },
  {
    title: 'Research interview panel members',
    category: 'interview_prep',
    priority: 'medium',
    description: 'Look up interviewers on LinkedIn to understand their background'
  },
  {
    title: 'Prepare questions to ask interviewer',
    category: 'interview_prep',
    priority: 'medium',
    description: 'Develop thoughtful questions about role, team, and company'
  },
  {
    title: 'Submit online application',
    category: 'application',
    priority: 'high',
    description: 'Complete and submit the job application with all materials'
  },
  {
    title: 'Send follow-up email after application',
    category: 'follow_up',
    priority: 'low',
    description: 'Send a professional follow-up 7-10 days after applying'
  },
  {
    title: 'Connect with employees on LinkedIn',
    category: 'research',
    priority: 'low',
    description: 'Network with current employees to learn about the company'
  }
];

/**
 * Automatically creates default to-do items for a new job
 */
export async function createDefaultTodos(jobId: string, userId: string): Promise<void> {
  try {
    const todos = defaultTodoTemplates.map(template => ({
      job_id: jobId,
      user_id: userId,
      title: template.title,
      description: template.description,
      category: template.category,
      priority: template.priority,
      completed: false,
      due_date: null
    }));

    const { error } = await supabase
      .from('job_todos' as any)
      .insert(todos);

    if (error) {
      console.error('Error creating default todos:', error);
      // Don't throw - we don't want to block job creation if todos fail
    } else {
      console.log('Default to-dos created successfully for job:', jobId);
    }
  } catch (error) {
    console.error('Error in createDefaultTodos:', error);
    // Silently fail - this is a nice-to-have feature
  }
}
