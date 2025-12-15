import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Video, Phone, MapPin, Clock, User, Mail, CheckCircle2, XCircle, Calendar as CalendarIcon, Trash2, Plus, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { InterviewScheduler } from "./InterviewScheduler";
import { InterviewSuccessPrediction } from "./InterviewSuccessPrediction";

interface Interview {
  id: string;
  job_id: string;
  interview_type: string;
  interview_date: string;
  duration_minutes: number;
  location?: string;
  meeting_link?: string;
  interviewer_name?: string;
  interviewer_email?: string;
  interviewer_phone?: string;
  notes?: string;
  preparation_tasks: any;
  outcome?: string;
  outcome_notes?: string;
  status: string;
  jobs: {
    job_title: string;
    company_name: string;
  };
}

interface InterviewCalendarProps {
  onInterviewClick?: (jobId: string) => void;
}

export function InterviewCalendar({ onInterviewClick }: InterviewCalendarProps = {}) {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [outcome, setOutcome] = useState("");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [interviewToDelete, setInterviewToDelete] = useState<string | null>(null);
  const [addInterviewDialogOpen, setAddInterviewDialogOpen] = useState(false);
  const [selectedJobForInterview, setSelectedJobForInterview] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [successPredictionDialogOpen, setSuccessPredictionDialogOpen] = useState(false);
  const [selectedInterviewForPrediction, setSelectedInterviewForPrediction] = useState<Interview | null>(null);
  const [predictions, setPredictions] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchInterviews();
    fetchJobs();

    // Set up real-time subscription for interview updates
    const interviewChannel = supabase
      .channel('interviews_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interviews'
        },
        () => {
          // Refetch interviews when any change occurs
          fetchInterviews();
        }
      )
      .subscribe();

    // Set up real-time subscription for prediction updates
    const predictionChannel = supabase
      .channel('interview_predictions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interview_success_predictions'
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object' && 'interview_id' in payload.new) {
            const newPrediction = payload.new as any;
            setPredictions(prev => ({ ...prev, [newPrediction.interview_id]: newPrediction }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(interviewChannel);
      supabase.removeChannel(predictionChannel);
    };
  }, []);

  const fetchJobs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('jobs')
        .select('id, job_title, company_name')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error: any) {
      console.error('Error fetching jobs:', error);
    }
  };

  const fetchInterviews = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('interviews')
        .select(`
          *,
          jobs (
            job_title,
            company_name
          )
        `)
        .eq('user_id', user.id)
        .order('interview_date', { ascending: true });

      if (error) throw error;
      
      // Ensure preparation_tasks is an array
      const processedData = (data || []).map(interview => ({
        ...interview,
        preparation_tasks: Array.isArray(interview.preparation_tasks) 
          ? interview.preparation_tasks 
          : []
      }));
      
      setInterviews(processedData);

      // Fetch predictions for all interviews
      if (processedData.length > 0) {
        const interviewIds = processedData.map(i => i.id);
        const { data: predictionsData } = await supabase
          .from('interview_success_predictions')
          .select('*')
          .in('interview_id', interviewIds)
          .order('created_at', { ascending: false });
        
        if (predictionsData) {
          const predMap: Record<string, any> = {};
          predictionsData.forEach(pred => {
            if (!predMap[pred.interview_id]) {
              predMap[pred.interview_id] = pred;
            }
          });
          setPredictions(predMap);
        }
      }
    } catch (error: any) {
      console.error('Error fetching interviews:', error);
      toast.error("Failed to load interviews");
    } finally {
      setLoading(false);
    }
  };

  const updatePreparationTask = async (interviewId: string, taskIndex: number, completed: boolean) => {
    try {
      const interview = interviews.find(i => i.id === interviewId);
      if (!interview) return;

      const updatedTasks = [...interview.preparation_tasks];
      updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], completed };

      const { error } = await supabase
        .from('interviews')
        .update({ preparation_tasks: updatedTasks })
        .eq('id', interviewId);

      if (error) throw error;

      setInterviews(interviews.map(i => 
        i.id === interviewId ? { ...i, preparation_tasks: updatedTasks } : i
      ));

      // Recalculate prediction if one exists
      if (predictions[interviewId]) {
        const interview = interviews.find(i => i.id === interviewId);
        if (interview) {
          const { data, error: calcError } = await supabase.functions.invoke('calculate-interview-success', {
            body: { interviewId, jobId: interview.job_id }
          });
          if (!calcError && data) {
            // Refetch predictions to get the updated one
            const { data: updatedPred } = await supabase
              .from('interview_success_predictions')
              .select('*')
              .eq('interview_id', interviewId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            if (updatedPred) {
              setPredictions(prev => ({ ...prev, [interviewId]: updatedPred }));
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast.error("Failed to update task");
    }
  };

  const recordOutcome = async () => {
    if (!selectedInterview || !outcome) return;

    try {
      const { error } = await supabase
        .from('interviews')
        .update({
          outcome,
          outcome_notes: outcomeNotes,
          status: 'completed'
        })
        .eq('id', selectedInterview.id);

      if (error) throw error;

      toast.success("Interview outcome recorded");
      setSelectedInterview(null);
      setOutcome("");
      setOutcomeNotes("");
      fetchInterviews();
    } catch (error: any) {
      console.error('Error recording outcome:', error);
      toast.error("Failed to record outcome");
    }
  };

  const handleDeleteInterview = async () => {
    if (!interviewToDelete) return;

    try {
      const { error } = await supabase
        .from('interviews')
        .delete()
        .eq('id', interviewToDelete);

      if (error) throw error;

      toast.success("Interview deleted successfully");
      setDeleteDialogOpen(false);
      setInterviewToDelete(null);
      fetchInterviews();
    } catch (error: any) {
      console.error('Error deleting interview:', error);
      toast.error("Failed to delete interview");
    }
  };

  const getInterviewIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'phone': return <Phone className="h-4 w-4" />;
      case 'in-person': return <MapPin className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const getOutcomeBadge = (outcome?: string) => {
    switch (outcome) {
      case 'passed': return <Badge className="bg-green-500">Passed</Badge>;
      case 'failed': return <Badge variant="destructive">Not Selected</Badge>;
      case 'cancelled': return <Badge variant="secondary">Cancelled</Badge>;
      case 'rescheduled': return <Badge variant="outline">Rescheduled</Badge>;
      default: return <Badge>Pending</Badge>;
    }
  };

  const upcomingInterviews = interviews.filter(i => 
    new Date(i.interview_date) > new Date() && i.status === 'scheduled'
  );

  const pastInterviews = interviews.filter(i => 
    new Date(i.interview_date) <= new Date() || i.status === 'completed'
  );

  if (loading) {
    return <div className="text-center py-8">Loading interviews...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Upcoming Interviews ({upcomingInterviews.length})
              </CardTitle>
              <CardDescription>Scheduled interviews and preparation tasks</CardDescription>
            </div>
            <Button onClick={() => setAddInterviewDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Interview
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {upcomingInterviews.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No upcoming interviews scheduled
            </p>
          ) : (
            upcomingInterviews.map((interview) => (
              <Card key={interview.id} className="border-l-4 border-l-primary">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        {getInterviewIcon(interview.interview_type)}
                        <h4 
                          className="font-semibold hover:text-primary cursor-pointer transition-colors"
                          onClick={() => onInterviewClick?.(interview.job_id)}
                        >
                          {interview.jobs.job_title}
                        </h4>
                      </div>
                      <p className="text-sm text-muted-foreground">{interview.jobs.company_name}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {predictions[interview.id] && (
                        <Badge 
                          variant="outline" 
                          className={`font-semibold ${
                            predictions[interview.id].overall_probability >= 70 ? 'bg-green-500/10 text-green-700 border-green-500/20' :
                            predictions[interview.id].overall_probability >= 50 ? 'bg-blue-500/10 text-blue-700 border-blue-500/20' :
                            predictions[interview.id].overall_probability >= 30 ? 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20' :
                            'bg-red-500/10 text-red-700 border-red-500/20'
                          }`}
                        >
                          <Target className="h-3 w-3 mr-1" />
                          {predictions[interview.id].overall_probability}% Success
                        </Badge>
                      )}
                      {getOutcomeBadge(interview.outcome)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{format(new Date(interview.interview_date), 'PPp')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{interview.duration_minutes} minutes</span>
                    </div>
                  </div>

                  {interview.interviewer_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{interview.interviewer_name}</span>
                      {interview.interviewer_email && (
                        <>
                          <Mail className="h-4 w-4 text-muted-foreground ml-2" />
                          <span>{interview.interviewer_email}</span>
                        </>
                      )}
                    </div>
                  )}

                  {interview.meeting_link && (
                    <a
                      href={interview.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-2"
                    >
                      <Video className="h-4 w-4" />
                      Join Meeting
                    </a>
                  )}

                  {interview.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{interview.location}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h5 className="text-sm font-medium">Preparation Tasks:</h5>
                    <div className="space-y-2">
                      {interview.preparation_tasks.map((task: any, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <Checkbox
                            checked={task.completed}
                            onCheckedChange={(checked) => 
                              updatePreparationTask(interview.id, index, checked as boolean)
                            }
                          />
                          <span className={`text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {task.task}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant={predictions[interview.id] ? "outline" : "default"}
                      size="sm"
                      onClick={() => {
                        setSelectedInterviewForPrediction(interview);
                        setSuccessPredictionDialogOpen(true);
                      }}
                      className="gap-2"
                    >
                      <Target className="h-4 w-4" />
                      {predictions[interview.id] ? 'Update Probability' : 'Calculate Probability'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedInterview(interview);
                        setOutcome(interview.outcome || "");
                        setOutcomeNotes(interview.outcome_notes || "");
                      }}
                    >
                      Record Outcome
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setInterviewToDelete(interview.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Past Interviews ({pastInterviews.length})</CardTitle>
          <CardDescription>Interview history and outcomes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pastInterviews.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No past interviews
            </p>
          ) : (
            pastInterviews.map((interview) => (
              <Card key={interview.id} className="border-l-4 border-l-muted">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        {getInterviewIcon(interview.interview_type)}
                        <h4 
                          className="font-semibold hover:text-primary cursor-pointer transition-colors"
                          onClick={() => onInterviewClick?.(interview.job_id)}
                        >
                          {interview.jobs.job_title}
                        </h4>
                      </div>
                      <p className="text-sm text-muted-foreground">{interview.jobs.company_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(interview.interview_date), 'PPp')}
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      {getOutcomeBadge(interview.outcome)}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setInterviewToDelete(interview.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {interview.outcome_notes && (
                    <p className="text-sm mt-4 p-3 bg-muted rounded-md">
                      {interview.outcome_notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedInterview} onOpenChange={() => setSelectedInterview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Interview Outcome</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Outcome</label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger>
                  <SelectValue placeholder="Select outcome" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="passed">Passed / Moving Forward</SelectItem>
                  <SelectItem value="failed">Not Selected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                placeholder="Interview feedback, next steps, etc..."
                value={outcomeNotes}
                onChange={(e) => setOutcomeNotes(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedInterview(null)}>
                Cancel
              </Button>
              <Button onClick={recordOutcome} disabled={!outcome}>
                Save Outcome
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Interview</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this interview? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setInterviewToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteInterview} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Interview Dialog */}
      <Dialog 
        open={addInterviewDialogOpen} 
        onOpenChange={(open) => {
          setAddInterviewDialogOpen(open);
          if (!open) {
            setSelectedJobForInterview(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Schedule New Interview</DialogTitle>
          </DialogHeader>
          {!selectedJobForInterview ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Job</label>
                <Select onValueChange={(value) => {
                  const job = jobs.find(j => j.id === value);
                  setSelectedJobForInterview(job);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a job to schedule interview for" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.map(job => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.job_title} - {job.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <InterviewScheduler
              jobId={selectedJobForInterview.id}
              jobTitle={selectedJobForInterview.job_title}
              companyName={selectedJobForInterview.company_name}
              onScheduled={() => {
                fetchInterviews();
                setAddInterviewDialogOpen(false);
                setSelectedJobForInterview(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Success Prediction Dialog */}
      <Dialog 
        open={successPredictionDialogOpen} 
        onOpenChange={async (open) => {
          setSuccessPredictionDialogOpen(open);
          if (!open && selectedInterviewForPrediction) {
            // Refetch the prediction when dialog closes to show updated data
            const { data: updatedPred } = await supabase
              .from('interview_success_predictions')
              .select('*')
              .eq('interview_id', selectedInterviewForPrediction.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            if (updatedPred) {
              setPredictions(prev => ({ ...prev, [selectedInterviewForPrediction.id]: updatedPred }));
            }
            setSelectedInterviewForPrediction(null);
          }
        }}
      >        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Interview Success Probability - {selectedInterviewForPrediction?.jobs.job_title}
            </DialogTitle>
          </DialogHeader>
          {selectedInterviewForPrediction && (
            <InterviewSuccessPrediction 
              interviewId={selectedInterviewForPrediction.id} 
              jobId={selectedInterviewForPrediction.job_id} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
