import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { MapPin, Clock, Car, Building2, DollarSign, Scale, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Job {
  id: string;
  job_title: string;
  company_name: string;
  location?: string;
  status: string;
  work_type?: string;
  salary_range_min?: number;
  salary_range_max?: number;
}

interface JobWithCommute extends Job {
  latitude?: number;
  longitude?: number;
  commute?: {
    distance_km: number;
    duration_minutes: number;
  };
  timezone?: string;
}

interface LocationComparisonProps {
  jobs: Job[];
  homeAddress?: { latitude: number; longitude: number } | null;
}

export function LocationComparison({ jobs, homeAddress }: LocationComparisonProps) {
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<JobWithCommute[]>([]);
  const [loading, setLoading] = useState(false);

  // Show all jobs that have a location (not just offers)
  const jobsWithLocation = jobs.filter(job => 
    job.location && job.location.trim().length > 0
  );

  const toggleJobSelection = (jobId: string) => {
    setSelectedJobs(prev => 
      prev.includes(jobId) 
        ? prev.filter(id => id !== jobId)
        : prev.length < 4 
          ? [...prev, jobId]
          : prev
    );
  };

  // Estimate timezone from longitude
  const estimateTimezone = (longitude: number): string => {
    // Common US timezone mappings based on longitude
    if (longitude >= -125 && longitude < -115) return 'America/Los_Angeles';
    if (longitude >= -115 && longitude < -102) return 'America/Denver';
    if (longitude >= -102 && longitude < -87) return 'America/Chicago';
    if (longitude >= -87 && longitude < -67) return 'America/New_York';
    
    // Generic UTC offset for other locations
    const offset = Math.round(longitude / 15);
    if (offset === 0) return 'UTC';
    const sign = offset > 0 ? '+' : '';
    return `UTC${sign}${offset}`;
  };

  const loadComparison = async () => {
    if (selectedJobs.length === 0) return;

    setLoading(true);
    const results: JobWithCommute[] = [];

    for (const jobId of selectedJobs) {
      const job = jobs.find(j => j.id === jobId);
      if (!job || !job.location) continue;

      try {
        // Geocode job location
        const { data: geocodeData } = await supabase.functions.invoke('geocode-location', {
          body: { action: 'geocode', location: job.location },
        });

        const jobWithData: JobWithCommute = { ...job };

        if (geocodeData?.success && geocodeData.data) {
          jobWithData.latitude = geocodeData.data.latitude;
          jobWithData.longitude = geocodeData.data.longitude;
          
          // Use timezone from API or estimate from longitude
          jobWithData.timezone = geocodeData.data.timezone || estimateTimezone(geocodeData.data.longitude);

          // Calculate commute if home address available
          if (homeAddress) {
            const { data: commuteData } = await supabase.functions.invoke('geocode-location', {
              body: {
                action: 'calculate_commute',
                from_location: { latitude: homeAddress.latitude, longitude: homeAddress.longitude },
                to_location: { latitude: geocodeData.data.latitude, longitude: geocodeData.data.longitude },
              },
            });

            if (commuteData?.success) {
              jobWithData.commute = {
                distance_km: commuteData.data.distance_km,
                duration_minutes: commuteData.data.duration_minutes,
              };
            }
          }
        }

        results.push(jobWithData);
      } catch (error) {
        console.error(`Error loading data for job ${jobId}:`, error);
        results.push({ ...job });
      }
    }

    setComparisonData(results);
    setLoading(false);
  };

  useEffect(() => {
    if (selectedJobs.length > 0) {
      loadComparison();
    } else {
      setComparisonData([]);
    }
  }, [selectedJobs, homeAddress]);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getBestValue = (values: (number | undefined)[], type: 'lowest' | 'highest') => {
    const validValues = values.filter((v): v is number => v !== undefined);
    if (validValues.length === 0) return undefined;
    return type === 'lowest' ? Math.min(...validValues) : Math.max(...validValues);
  };

  const commuteTimes = comparisonData.map(j => j.commute?.duration_minutes);
  const commuteDistances = comparisonData.map(j => j.commute?.distance_km);
  const salaries = comparisonData.map(j => j.salary_range_max);

  const bestCommuteTime = getBestValue(commuteTimes, 'lowest');
  const bestCommuteDistance = getBestValue(commuteDistances, 'lowest');
  const bestSalary = getBestValue(salaries, 'highest');

  return (
    <div className="space-y-4">
      {/* Job Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Compare Job Locations
          </CardTitle>
          <CardDescription>
            Select up to 4 jobs to compare their locations and commute times side by side.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobsWithLocation.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No jobs with locations available to compare. Add locations to your jobs to compare them here.
            </p>
          ) : (
            <div className="space-y-2">
              {jobsWithLocation.map(job => (
                <div
                  key={job.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedJobs.includes(job.id) 
                      ? 'bg-primary/10 border-primary' 
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => toggleJobSelection(job.id)}
                >
                  <Checkbox
                    checked={selectedJobs.includes(job.id)}
                    disabled={!selectedJobs.includes(job.id) && selectedJobs.length >= 4}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{job.job_title}</p>
                    <p className="text-sm text-muted-foreground">{job.company_name}</p>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {job.location || 'No location'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison Table */}
      {selectedJobs.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Location Comparison</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedJobs([])}
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Metric</TableHead>
                      {comparisonData.map(job => (
                        <TableHead key={job.id} className="text-center min-w-[180px]">
                          <div className="space-y-1">
                            <p className="font-medium">{job.job_title}</p>
                            <p className="text-xs text-muted-foreground">{job.company_name}</p>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Location */}
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Location
                        </div>
                      </TableCell>
                      {comparisonData.map(job => (
                        <TableCell key={job.id} className="text-center">
                          {job.location || 'N/A'}
                        </TableCell>
                      ))}
                    </TableRow>

                    {/* Work Type */}
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Work Type
                        </div>
                      </TableCell>
                      {comparisonData.map(job => (
                        <TableCell key={job.id} className="text-center">
                          <Badge variant="outline">
                            {job.work_type || 'Not specified'}
                          </Badge>
                        </TableCell>
                      ))}
                    </TableRow>

                    {/* Commute Time */}
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Commute Time
                        </div>
                      </TableCell>
                      {comparisonData.map(job => (
                        <TableCell key={job.id} className="text-center">
                          {job.commute ? (
                            <span className={
                              job.commute.duration_minutes === bestCommuteTime 
                                ? 'text-green-600 font-medium' 
                                : ''
                            }>
                              {formatDuration(job.commute.duration_minutes)}
                              {job.commute.duration_minutes === bestCommuteTime && (
                                <Badge className="ml-2 bg-green-100 text-green-800" variant="secondary">
                                  Best
                                </Badge>
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              {homeAddress ? 'Unable to calculate' : 'Set home address'}
                            </span>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>

                    {/* Commute Distance */}
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4" />
                          Distance
                        </div>
                      </TableCell>
                      {comparisonData.map(job => (
                        <TableCell key={job.id} className="text-center">
                          {job.commute ? (
                            <span className={
                              job.commute.distance_km === bestCommuteDistance 
                                ? 'text-green-600 font-medium' 
                                : ''
                            }>
                              {job.commute.distance_km} km
                            </span>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>

                    {/* Weekly Commute Time */}
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Weekly (5 days)
                        </div>
                      </TableCell>
                      {comparisonData.map(job => (
                        <TableCell key={job.id} className="text-center">
                          {job.commute ? (
                            <span>
                              {formatDuration(job.commute.duration_minutes * 2 * 5)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>

                    {/* Salary */}
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Salary Range
                        </div>
                      </TableCell>
                      {comparisonData.map(job => (
                        <TableCell key={job.id} className="text-center">
                          {job.salary_range_min || job.salary_range_max ? (
                            <span className={
                              job.salary_range_max === bestSalary 
                                ? 'text-green-600 font-medium' 
                                : ''
                            }>
                              ${job.salary_range_min?.toLocaleString() || '?'} - ${job.salary_range_max?.toLocaleString() || '?'}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Not specified</span>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>

                    {/* Timezone */}
                    <TableRow>
                      <TableCell className="font-medium">Timezone</TableCell>
                      {comparisonData.map(job => (
                        <TableCell key={job.id} className="text-center">
                          {job.timezone || 'Unknown'}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No Home Address Warning */}
      {!homeAddress && selectedJobs.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
          <CardContent className="py-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Set your home address to see commute times and distances for each job location.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
