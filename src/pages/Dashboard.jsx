import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, Settings, Briefcase, FileText, Mail, TrendingUp, BookOpen, Users, Cake, PhoneCall, Rocket, ArrowRight, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AppNav } from "@/components/layout/AppNav";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { GeneralizedToDoList } from "@/components/jobs/GeneralizedToDoList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardCalendar } from "@/components/dashboard/DashboardCalendar";
import { Target, Bell, Calendar } from "lucide-react";
import { format, differenceInDays, parseISO, isBefore, addYears, isAfter } from "date-fns";
import { FollowUpNotificationWidget } from "@/components/jobs/FollowUpNotificationWidget";

const Dashboard = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);

  // Fetch goals data
  const { data: goals } = useQuery({
    queryKey: ['career-goals'],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('career_goals')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch all deadline reminders
  const { data: deadlineReminders } = useQuery({
    queryKey: ['all-reminders', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deadline_reminders')
        .select(`
          *,
          jobs (
            job_title,
            company_name,
            user_id
          )
        `)
        .gte('reminder_date', new Date().toISOString())
        .order('reminder_date', { ascending: true });
      
      if (error) throw error;
      return data?.filter(r => r.jobs?.user_id === session.user.id) || [];
    }
  });

  // Fetch contacts with birthdays
  const { data: contactsWithBirthdays } = useQuery({
    queryKey: ['contacts-birthdays', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data: professional, error: profError } = await supabase
        .from('professional_contacts')
        .select('id, first_name, last_name, birthday')
        .eq('user_id', session.user.id)
        .not('birthday', 'is', null);
      
      const { data: suggestions, error: sugError } = await supabase
        .from('contact_suggestions')
        .select('id, contact_name, birthday')
        .eq('user_id', session.user.id)
        .not('birthday', 'is', null);
      
      if (profError || sugError) throw profError || sugError;
      
      const now = new Date();
      const allContacts = [
        ...(professional || []).map(c => ({
          id: c.id,
          name: `${c.first_name} ${c.last_name}`.trim(),
          birthday: c.birthday,
          source: 'professional'
        })),
        ...(suggestions || []).map(c => ({
          id: c.id,
          name: c.contact_name,
          birthday: c.birthday,
          source: 'suggestion'
        }))
      ];

      // Deduplicate by name (prefer professional contacts)
      const uniqueByName = new Map();
      allContacts.forEach(contact => {
        const nameLower = contact.name.toLowerCase().trim();
        if (!uniqueByName.has(nameLower) || contact.source === 'professional') {
          uniqueByName.set(nameLower, contact);
        }
      });
      const deduplicatedContacts = Array.from(uniqueByName.values());

      // Calculate upcoming birthdays in next 30 days
      return deduplicatedContacts.map(contact => {
        const birthday = parseISO(contact.birthday);
        let nextBirthday = new Date(now.getFullYear(), birthday.getMonth(), birthday.getDate());
        if (isBefore(nextBirthday, now)) {
          nextBirthday = addYears(nextBirthday, 1);
        }
        const daysUntil = differenceInDays(nextBirthday, now);
        return { ...contact, daysUntil, nextBirthday };
      })
      .filter(c => c.daysUntil >= 0 && c.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil);
    }
  });

  // Fetch job interviews
  const { data: jobInterviews } = useQuery({
    queryKey: ['job-interviews', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interviews')
        .select(`
          *,
          jobs (
            job_title,
            company_name
          )
        `)
        .eq('user_id', session.user.id)
        .gte('interview_date', new Date().toISOString())
        .order('interview_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch informational interviews
  const { data: informationalInterviews } = useQuery({
    queryKey: ['informational-interviews-upcoming', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('informational_interviews')
        .select('*')
        .eq('user_id', session.user.id)
        .not('interview_date', 'is', null)
        .gte('interview_date', new Date().toISOString())
        .order('interview_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch contacts needing check-in (not contacted in 30+ days)
  const { data: contactsNeedingCheckin } = useQuery({
    queryKey: ['contacts-checkin', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: professional, error: profError } = await supabase
        .from('professional_contacts')
        .select('id, first_name, last_name, last_contacted_at')
        .eq('user_id', session.user.id)
        .or(`last_contacted_at.is.null,last_contacted_at.lt.${thirtyDaysAgo.toISOString()}`);
      
      if (profError) throw profError;
      
      const now = new Date();
      return (professional || []).map(c => {
        const daysSince = c.last_contacted_at 
          ? differenceInDays(now, parseISO(c.last_contacted_at))
          : 999;
        return {
          id: c.id,
          name: `${c.first_name} ${c.last_name}`.trim(),
          daysSince,
          lastContact: c.last_contacted_at
        };
      }).sort((a, b) => b.daysSince - a.daysSince).slice(0, 5);
    }
  });

  // Fetch active jobs for calendar
  const { data: activeJobs } = useQuery({
    queryKey: ['active-jobs', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (!session) {
          navigate("/login");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (!session) {
    return null;
  }

  const dashboardCards = [
    {
      title: "Profile",
      description: "Manage your professional profile",
      icon: User,
      path: "/profile-enhanced",
      variant: "purple"
    },
    {
      title: "Jobs",
      description: "Track and manage job applications",
      icon: Briefcase,
      path: "/jobs",
      variant: "pink"
    },
    {
      title: "Interview Preparation",
      description: "Track your job search performance",
      icon: TrendingUp,
      path: "/performance-improvement",
      variant: "yellow"
    },
    {
      title: "Skills",
      description: "Develop and track your skills",
      icon: BookOpen,
      path: "/skill-development",
      variant: "purple"
    },
    {
      title: "Resumes",
      description: "Create and manage resumes",
      icon: FileText,
      path: "/resumes",
      variant: "pink"
    },
    {
      title: "Cover Letters",
      description: "Create and manage cover letters",
      icon: Mail,
      path: "/cover-letters",
      variant: "yellow"
    },
    {
      title: "Networking",
      description: "Manage contacts, campaigns, mentors & teams",
      icon: Users,
      path: "/networking",
      variant: "purple"
    },
    {
      title: "Settings",
      description: "Account settings and preferences",
      icon: Settings,
      path: "/settings",
      variant: "pink"
    }
  ];

  // Calculate goals stats
  const activeGoals = goals?.filter(g => g.status === 'active') || [];
  const completedGoals = goals?.filter(g => g.status === 'completed') || [];
  const totalProgress = activeGoals.length > 0 
    ? activeGoals.reduce((sum, g) => sum + (g.current_progress || 0), 0) / activeGoals.length 
    : 0;

  const quickActions = [
    { title: "Profile", icon: User, path: "/profile-enhanced", variant: "purple" },
    { title: "Jobs", icon: Briefcase, path: "/jobs", variant: "pink" },
    { title: "Interview Prep", icon: TrendingUp, path: "/performance-improvement", variant: "yellow" },
    { title: "Skills", icon: BookOpen, path: "/skill-development", variant: "purple" },
    { title: "Resumes", icon: FileText, path: "/resumes", variant: "pink" },
    { title: "Cover Letters", icon: Mail, path: "/cover-letters", variant: "yellow" },
    { title: "Networking", icon: Users, path: "/networking", variant: "purple" },
    { title: "Settings", icon: Settings, path: "/settings", variant: "pink" }
  ];

  return (
    <>
      <AppNav />
      
      <div className="flex min-h-screen bg-gradient-to-br from-background to-muted pt-16">
        {/* Quick Actions Sidebar - Mobile Dropdown */}
        <aside className="lg:hidden fixed left-0 top-16 right-0 bg-card/80 backdrop-blur-md border-b z-40">
          <details className="group">
            <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary flex-shrink-0" />
                <h3 className="font-bold text-base text-white">Quick Actions</h3>
              </div>
              <svg className="h-5 w-5 transition-transform group-open:rotate-180 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="px-4 pb-4 space-y-0.5 border-t bg-background/80 backdrop-blur-md">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={index}
                    to={action.path}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <Icon className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                    <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate">{action.title}</span>
                  </Link>
                );
              })}
            </div>
          </details>
        </aside>

        {/* Quick Actions Sidebar - Desktop */}
        <aside className="hidden lg:block w-52 bg-card border-r overflow-y-auto flex-shrink-0">
          <div className="p-3 sticky top-16">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-primary flex-shrink-0" />
              <h3 className="font-bold text-base text-white">Quick Actions</h3>
            </div>
            <div className="space-y-0.5">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={index}
                    to={action.path}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted transition-colors group"
                  >
                    <Icon className="h-4 w-4 text-white transition-colors flex-shrink-0" />
                    <span className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate">{action.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </aside>
        
        {/* Main Content Area */}
        <main className="flex-1 w-full overflow-x-hidden lg:mt-0 mt-0">
          <div className="px-6 md:px-8 py-6 md:py-8 max-w-[1600px] mx-auto">
        {/* Personalized Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            Welcome back{session?.user?.user_metadata?.full_name ? `, ${session.user.user_metadata.full_name.split(' ')[0]}` : ''}! 👋
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Key Metrics Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground mb-1">Active Goals</p>
              <p className="text-2xl font-bold text-primary">{(goals?.filter(g => g.status === 'in_progress') || []).length}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-secondary">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground mb-1">Upcoming Reminders</p>
              <p className="text-2xl font-bold text-secondary">{(deadlineReminders?.length || 0) + (contactsWithBirthdays?.length || 0)}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-accent">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground mb-1">Pending Check-ins</p>
              <p className="text-2xl font-bold text-accent">{contactsNeedingCheckin?.length || 0}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-destructive">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground mb-1">Completion Rate</p>
              <p className="text-2xl font-bold text-destructive">{Math.round(totalProgress)}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Calendar and Reminders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Calendar with All Events */}
          <Card className="border-2 border-accent/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="bg-gradient-to-r from-accent/10 to-primary/10 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-accent" />
                Calendar
              </CardTitle>
              <CardDescription className="text-xs mt-1">All important dates</CardDescription>
            </CardHeader>
            <CardContent className="pt-3">
              <DashboardCalendar 
                jobs={activeJobs || []} 
                interviews={jobInterviews || []}
                informationalInterviews={informationalInterviews || []}
                deadlineReminders={deadlineReminders || []}
                birthdays={contactsWithBirthdays || []}
                onNavigate={navigate}
              />
            </CardContent>
          </Card>

          {/* Reminders */}
          <Card className="border-2 border-secondary/20 shadow-lg hover:shadow-xl transition-shadow flex flex-col">
            <CardHeader className="bg-gradient-to-r from-secondary/10 to-accent/10 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bell className="h-4 w-4 text-secondary" />
                  Upcoming Reminders
                </CardTitle>
                <Badge variant="outline" className="font-normal text-xs">
                  {((contactsWithBirthdays?.length || 0) + (contactsNeedingCheckin?.length || 0) + (deadlineReminders?.length || 0) + (jobInterviews?.length || 0) + (informationalInterviews?.length || 0))} total
                </Badge>
              </div>
              <CardDescription className="text-xs mt-1">Don't miss important dates and connections</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 flex-1 overflow-hidden flex flex-col">
              <div className="space-y-4 max-h-[320px] overflow-y-auto flex-1 pr-1">
              {/* Birthday Section */}
              {contactsWithBirthdays && contactsWithBirthdays.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                    🎂 Birthdays
                  </p>
                  <div className="space-y-2">
                  {contactsWithBirthdays.slice(0, 2).map((contact) => (
                    <div 
                      key={`bday-${contact.id}`} 
                      className="flex items-center justify-between gap-3 p-2 bg-destructive/10 rounded-md text-xs border border-destructive/20 hover:bg-destructive/15 hover:border-destructive/30 transition-all cursor-pointer group"
                      onClick={() => navigate('/networking')}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="font-medium truncate text-foreground leading-normal">{contact.name}</p>
                        <p className="text-muted-foreground text-[11px] mt-1 leading-relaxed">
                          {contact.daysUntil === 0 ? '🎉 Today!' : `🗓️ in ${contact.daysUntil} day${contact.daysUntil > 1 ? 's' : ''}`}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </div>
                  ))}
                </div>
                </div>
              )}

              {/* Check-ins Section */}
              {contactsNeedingCheckin && contactsNeedingCheckin.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                    💬 Network Check-ins
                  </p>
                  <div className="space-y-2">
                  {contactsNeedingCheckin.slice(0, 2).map((contact) => (
                    <div 
                      key={`checkin-${contact.id}`} 
                      className="flex items-center justify-between gap-3 p-2 bg-secondary/10 rounded-md text-xs border border-secondary/20 hover:bg-secondary/15 hover:border-secondary/30 transition-all cursor-pointer group"
                      onClick={() => navigate('/networking')}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="font-medium truncate text-foreground leading-normal">{contact.name}</p>
                        <p className="text-muted-foreground text-[11px] mt-1 leading-relaxed">
                          {contact.daysSince === 999 ? '⚠️ Never contacted' : `⏰ Last: ${contact.daysSince} days ago`}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </div>
                  ))}
                </div>
                </div>
              )}

              {/* Interviews Section */}
              {((jobInterviews && jobInterviews.length > 0) || (informationalInterviews && informationalInterviews.length > 0)) && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                    🎤 Upcoming Interviews
                  </p>
                  <div className="space-y-2">
                  {jobInterviews?.slice(0, 2).map((interview) => (
                    <div 
                      key={`job-interview-${interview.id}`} 
                      className="flex items-start justify-between gap-3 p-2 bg-primary/10 rounded-md text-xs border border-primary/20 hover:bg-primary/15 hover:border-primary/30 transition-all cursor-pointer group"
                      onClick={() => navigate('/jobs')}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="font-medium truncate text-foreground leading-normal">
                          {interview.jobs?.job_title || 'Interview'}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] leading-relaxed">
                          <span className="text-muted-foreground">
                            📆 {format(new Date(interview.interview_date), 'MMM d, h:mm a')}
                          </span>
                          {interview.jobs?.company_name && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-muted-foreground truncate">
                                🏢 {interview.jobs.company_name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </div>
                  ))}
                  {informationalInterviews?.slice(0, 2).map((interview) => (
                    <div 
                      key={`info-interview-${interview.id}`} 
                      className="flex items-start justify-between gap-3 p-2 bg-primary/10 rounded-md text-xs border border-primary/20 hover:bg-primary/15 hover:border-primary/30 transition-all cursor-pointer group"
                      onClick={() => navigate('/networking')}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="font-medium truncate text-foreground leading-normal">
                          Informational Interview: {interview.candidate_name}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] leading-relaxed">
                          <span className="text-muted-foreground">
                            📆 {format(new Date(interview.interview_date), 'MMM d, h:mm a')}
                          </span>
                          {interview.candidate_company && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-muted-foreground truncate">
                                🏢 {interview.candidate_company}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </div>
                  ))}
                </div>
                </div>
              )}

              {/* Deadlines Section */}
              {deadlineReminders && deadlineReminders.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                    📅 Application Deadlines
                  </p>
                  <div className="space-y-2">
                  {deadlineReminders.slice(0, 2).map((reminder) => (
                    <div 
                      key={reminder.id} 
                      className="flex items-start justify-between gap-3 p-2 bg-secondary/10 rounded-md text-xs border border-secondary/20 hover:bg-secondary/15 hover:border-secondary/30 transition-all cursor-pointer group"
                      onClick={() => navigate('/jobs')}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="font-medium truncate text-foreground leading-normal">
                          {reminder.jobs?.job_title || 'Reminder'}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] leading-relaxed">
                          <span className="text-muted-foreground">
                            📆 {format(new Date(reminder.reminder_date), 'MMM d')}
                          </span>
                          {reminder.jobs?.company_name && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-muted-foreground truncate">
                                🏢 {reminder.jobs.company_name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </div>
                  ))}
                </div>
                </div>
              )}

              {/* Empty State */}
              {(!contactsWithBirthdays || contactsWithBirthdays.length === 0) &&
               (!contactsNeedingCheckin || contactsNeedingCheckin.length === 0) &&
               (!deadlineReminders || deadlineReminders.length === 0) &&
               (!jobInterviews || jobInterviews.length === 0) &&
               (!informationalInterviews || informationalInterviews.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">You're all caught up!</p>
                  <p className="text-xs mt-1">No upcoming reminders at the moment.</p>
                </div>
              )}
            </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Focus */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
            Today's Focus
          </h2>
          <p className="text-sm text-muted-foreground mt-1 ml-4">Your most important tasks and updates</p>
        </div>

        {/* Dashboard Layout: To-Do List */}
        <div className="mb-12">
          {/* To-Do List */}
          <Card className="border-2 border-primary/30 shadow-lg hover:shadow-xl transition-shadow flex flex-col bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
            <CardHeader className="bg-gradient-to-r from-primary/15 via-secondary/10 to-accent/15 pb-3 border-b border-primary/10">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-primary to-secondary animate-pulse"></span>
                  ✅ Your Tasks
                </CardTitle>
                <Badge variant="outline" className="font-normal text-xs bg-primary/10 border-primary/30 text-primary">
                  Priority
                </Badge>
              </div>
              <CardDescription className="text-xs mt-1">Stay on top of your job search 🎯</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 flex-1 overflow-hidden flex flex-col">
              <div className="max-h-[320px] overflow-y-auto flex-1">
                <GeneralizedToDoList compact />
              </div>
              <button 
                onClick={() => navigate('/jobs')}
                className="mt-4 w-full text-xs text-center py-2 rounded-md bg-gradient-to-r from-primary/10 to-secondary/10 hover:from-primary/20 hover:to-secondary/20 text-primary font-medium transition-all border border-primary/20"
              >
                View All Tasks →
              </button>
            </CardContent>
          </Card>
        </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default Dashboard;
