
-- Fix the trigger function with correct table and column names
CREATE OR REPLACE FUNCTION public.seed_group_example_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert example sessions (correct table: peer_group_sessions, correct columns)
  INSERT INTO public.peer_group_sessions (group_id, session_title, session_description, session_type, scheduled_at, duration_minutes, max_participants, meeting_link, created_by)
  VALUES 
    (NEW.id, 'Weekly Check-in', 'Share your job search progress and get support from the group.', 'support', NOW() + INTERVAL '3 days', 60, 20, 'https://meet.example.com/weekly', NEW.created_by),
    (NEW.id, 'Resume Review Workshop', 'Bring your resume for peer feedback and improvement tips.', 'workshop', NOW() + INTERVAL '7 days', 90, 15, 'https://meet.example.com/resume', NEW.created_by),
    (NEW.id, 'Mock Interview Practice', 'Practice interview skills with fellow job seekers.', 'practice', NOW() + INTERVAL '10 days', 120, 10, 'https://meet.example.com/mock', NEW.created_by);

  -- Insert example challenges (correct table: peer_support_challenges, correct columns)
  INSERT INTO public.peer_support_challenges (group_id, challenge_name, challenge_description, challenge_type, target_metric, target_value, start_date, end_date, created_by)
  VALUES 
    (NEW.id, '10 Applications Challenge', 'Submit 10 quality job applications this week.', 'weekly', 'applications', 10, NOW()::date, (NOW() + INTERVAL '7 days')::date, NEW.created_by),
    (NEW.id, 'Network Expansion', 'Connect with 5 new professionals in your field.', 'weekly', 'connections', 5, NOW()::date, (NOW() + INTERVAL '14 days')::date, NEW.created_by),
    (NEW.id, 'Skill Building Sprint', 'Complete 3 skill-building activities or courses.', 'monthly', 'activities', 3, NOW()::date, (NOW() + INTERVAL '21 days')::date, NEW.created_by);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-create trigger
DROP TRIGGER IF EXISTS seed_group_data_trigger ON public.peer_support_groups;
CREATE TRIGGER seed_group_data_trigger
AFTER INSERT ON public.peer_support_groups
FOR EACH ROW
EXECUTE FUNCTION public.seed_group_example_data();
