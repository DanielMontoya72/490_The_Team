import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { relationshipId, menteeId, periodStart, periodEnd } = await req.json();

    // Gather progress data
    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);

    // Get jobs activity
    const { data: jobs } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', menteeId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const jobsByStatus = jobs?.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Get interviews
    const { data: interviews } = await supabase
      .from('interviews')
      .select('*')
      .eq('user_id', menteeId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Get applications
    const { data: applications } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', menteeId)
      .in('status', ['Applied', 'Interview Scheduled', 'Offer Received']);

    // Get resume updates
    const { data: resumes } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_id', menteeId)
      .gte('updated_at', startDate.toISOString())
      .lte('updated_at', endDate.toISOString());

    // Calculate metrics
    const reportData = {
      period: {
        start: periodStart,
        end: periodEnd
      },
      jobsAdded: jobs?.length || 0,
      jobsByStatus,
      interviewsScheduled: interviews?.length || 0,
      interviewsByType: interviews?.reduce((acc, int) => {
        acc[int.interview_type] = (acc[int.interview_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {},
      totalApplications: applications?.length || 0,
      resumeUpdates: resumes?.length || 0,
      responseRate: applications && applications.length > 0
        ? (interviews?.length || 0) / applications.length * 100
        : 0,
      mostActiveDay: jobs?.reduce((acc, job) => {
        const day = new Date(job.created_at).toLocaleDateString();
        acc[day] = (acc[day] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    // Generate summary
    const summary = `During ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}: Added ${reportData.jobsAdded} jobs, scheduled ${reportData.interviewsScheduled} interviews, submitted ${reportData.totalApplications} applications with ${reportData.responseRate.toFixed(1)}% response rate.`;

    // Create progress report
    const { data: report, error } = await supabase
      .from('mentor_progress_reports')
      .insert({
        relationship_id: relationshipId,
        mentee_id: menteeId,
        report_period_start: startDate.toISOString(),
        report_period_end: endDate.toISOString(),
        report_data: reportData,
        summary
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, report }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
