
-- Create function to seed example sessions and challenges for new groups
CREATE OR REPLACE FUNCTION public.seed_group_example_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert example sessions
  INSERT INTO public.peer_group_sessions (group_id, title, description, scheduled_at, duration_minutes, max_participants, meeting_link)
  VALUES 
    (NEW.id, 'Weekly Check-in', 'Share your job search progress and get support from the group.', NOW() + INTERVAL '3 days', 60, 20, 'https://meet.example.com/weekly'),
    (NEW.id, 'Resume Review Workshop', 'Bring your resume for peer feedback and improvement tips.', NOW() + INTERVAL '7 days', 90, 15, 'https://meet.example.com/resume'),
    (NEW.id, 'Mock Interview Practice', 'Practice interview skills with fellow job seekers.', NOW() + INTERVAL '10 days', 120, 10, 'https://meet.example.com/mock');

  -- Insert example challenges
  INSERT INTO public.peer_group_challenges (group_id, challenge_name, description, target_metric, target_value, start_date, end_date)
  VALUES 
    (NEW.id, '10 Applications Challenge', 'Submit 10 quality job applications this week.', 'applications', 10, NOW(), NOW() + INTERVAL '7 days'),
    (NEW.id, 'Network Expansion', 'Connect with 5 new professionals in your field.', 'connections', 5, NOW(), NOW() + INTERVAL '14 days'),
    (NEW.id, 'Skill Building Sprint', 'Complete 3 skill-building activities or courses.', 'activities', 3, NOW(), NOW() + INTERVAL '21 days');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run on new group creation
DROP TRIGGER IF EXISTS seed_group_data_trigger ON public.peer_support_groups;
CREATE TRIGGER seed_group_data_trigger
AFTER INSERT ON public.peer_support_groups
FOR EACH ROW
EXECUTE FUNCTION public.seed_group_example_data();
