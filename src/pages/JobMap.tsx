import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppNav } from '@/components/layout/AppNav';
import { JobSidebar } from '@/components/layout/JobSidebar';
import { JobLocationMap } from '@/components/jobs/JobLocationMap';
import { HomeAddressSettings } from '@/components/jobs/HomeAddressSettings';
import { LocationComparison } from '@/components/jobs/LocationComparison';
import { JobDetailsDialog } from '@/components/jobs/JobDetailsDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Map, Home, Scale, Settings, MapPin, Globe, BarChart3, DollarSign, TrendingUp, GitCompare, Activity, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function JobMap() {
  const location = useLocation();
  const isCurrentPage = (path: string) => location.pathname === path;
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [homeAddress, setHomeAddress] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (!session) {
          navigate('/login');
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fetch jobs
  const { data: jobs = [], refetch: refetchJobs } = useQuery({
    queryKey: ['jobs-for-map', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', session!.user!.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch home address
  const { data: homeAddressData, refetch: refetchHomeAddress } = useQuery({
    queryKey: ['home-address', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_home_addresses')
        .select('*')
        .eq('user_id', session!.user!.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching home address:', error);
        return null;
      }

      if (data && data.latitude && data.longitude) {
        setHomeAddress({ latitude: data.latitude, longitude: data.longitude });
        return data;
      }
      return null;
    },
  });

  const handleJobClick = (job: any) => {
    setSelectedJob(job);
  };

  const handleJobUpdate = () => {
    refetchJobs();
  };

  const handleHomeAddressSave = () => {
    refetchHomeAddress();
    toast.success('Home address updated - map will recalculate commutes');
  };

  // Calculate stats
  const jobStats = {
    total: jobs.length,
    withLocation: jobs.filter((j: any) => j.location).length,
    remote: jobs.filter((j: any) => j.work_type === 'remote').length,
    hybrid: jobs.filter((j: any) => j.work_type === 'hybrid').length,
    onsite: jobs.filter((j: any) => j.work_type === 'onsite').length,
  };

  if (!session) return null;

  return (
    <>
      <AppNav />
      
      <div className="flex min-h-screen bg-background pt-16">
        <JobSidebar activeTab="job-map" />

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden lg:ml-56">
          <div className="h-full overflow-y-auto">
            <div className="container mx-auto px-4 py-8 max-w-7xl lg:pt-0 pt-16">
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-3">
                  <Map className="h-8 w-8 text-primary" />
                  <h1 className="text-3xl font-bold">Job Location Map</h1>
                </div>
                <p className="text-muted-foreground">
                  Visualize your job opportunities on an interactive map and compare commute times
                </p>
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold">{jobStats.total}</div>
              <div className="text-sm text-muted-foreground">Total Jobs</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-2xl font-bold">{jobStats.withLocation}</span>
              </div>
              <div className="text-sm text-muted-foreground">With Location</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <Globe className="h-4 w-4 text-blue-500" />
                <span className="text-2xl font-bold">{jobStats.remote}</span>
              </div>
              <div className="text-sm text-muted-foreground">Remote</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold">{jobStats.hybrid}</div>
              <div className="text-sm text-muted-foreground">Hybrid</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold">{jobStats.onsite}</div>
              <div className="text-sm text-muted-foreground">On-site</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="map" className="space-y-6">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
            <TabsTrigger value="map" className="flex items-center gap-2 text-xs sm:text-sm px-1 sm:px-2">
              <Map className="h-4 w-4" />
              Interactive Map
            </TabsTrigger>
            <TabsTrigger value="compare" className="flex items-center gap-2 text-xs sm:text-sm px-1 sm:px-2">
              <Scale className="h-4 w-4" />
              Compare Locations
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2 text-xs sm:text-sm px-1 sm:px-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="space-y-4">
            {!homeAddress && (
              <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
                <CardContent className="py-4 flex items-center gap-3">
                  <Home className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">
                      Set Your Home Address
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Add your home address in Settings to see commute times for each job location.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <JobLocationMap jobs={jobs} onJobClick={handleJobClick} />
          </TabsContent>

          <TabsContent value="compare">
            <LocationComparison jobs={jobs} homeAddress={homeAddress} />
          </TabsContent>

          <TabsContent value="settings">
            <div className="max-w-2xl">
              <HomeAddressSettings onSave={handleHomeAddressSave} />

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>About Location Services</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <p>
                    This feature uses <strong>OpenStreetMap Nominatim</strong> for geocoding (converting addresses to coordinates) 
                    and <strong>OSRM</strong> for route calculations. Both are free, open-source services.
                  </p>
                  <div>
                    <p className="font-medium text-foreground mb-2">Privacy Information:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Your home address is stored securely in your account</li>
                      <li>Location data is cached to minimize API requests</li>
                      <li>No personal data is shared with third parties</li>
                      <li>You can delete your home address at any time</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-2">Supported Features:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>International locations and addresses</li>
                      <li>Driving distance and time calculations</li>
                      <li>Filter by commute time or distance</li>
                      <li>Compare multiple job locations side by side</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Job Details Dialog */}
        {selectedJob && (
          <JobDetailsDialog
            job={selectedJob}
            open={!!selectedJob}
            onOpenChange={(open) => !open && setSelectedJob(null)}
            onUpdate={handleJobUpdate}
            onArchive={() => {
              handleJobUpdate();
              setSelectedJob(null);
            }}
            onDelete={() => {
              handleJobUpdate();
              setSelectedJob(null);
            }}
          />
        )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
