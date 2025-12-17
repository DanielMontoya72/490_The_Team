import React, { useEffect, useState, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, MapPin, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { monitoredFetch } from '@/lib/apiMonitor';

const MAPBOX_TOKEN = 'pk.eyJ1IjoibW9tYXJhMDQiLCJhIjoiY21mbXh6b3EyMDZ6ZDJqb2V3bGF2c3luaiJ9.M9p7upr0KyBjaUeRwjRsQw';

interface Job {
  id: string;
  job_title: string;
  company_name: string;
  location?: string;
  status: string;
  job_type?: string;
  salary_range_min?: number;
  salary_range_max?: number;
}

interface GeocodedJob extends Job {
  latitude: number;
  longitude: number;
  commute?: {
    distance_km: number;
    duration_minutes: number;
  };
}

interface HomeAddress {
  address: string;
  latitude: number;
  longitude: number;
}

interface JobLocationMapProps {
  jobs: Job[];
  onJobClick?: (job: Job) => void;
}

const getStatusColor = (status: string): string => {
  const normalizedStatus = status?.toLowerCase().replace(/[\s_-]+/g, '_') || '';
  const colors: Record<string, string> = {
    interested: '#3b82f6',
    applied: '#8b5cf6',
    phone_screen: '#f59e0b',
    interview: '#f97316',
    offer: '#22c55e',
    offer_received: '#22c55e',
    rejected: '#ef4444',
    accepted: '#10b981',
  };
  return colors[normalizedStatus] || '#6b7280';
};

export function JobLocationMap({ jobs, onJobClick }: JobLocationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  
  const [geocodedJobs, setGeocodedJobs] = useState<GeocodedJob[]>([]);
  const [homeAddress, setHomeAddress] = useState<HomeAddress | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Fetch home address
  useEffect(() => {
    const fetchHome = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data } = await supabase
          .from('user_home_addresses')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (data?.latitude && data?.longitude) {
          setHomeAddress({
            address: data.address,
            latitude: data.latitude,
            longitude: data.longitude,
          });
        }
      } catch (error) {
        console.error('Error fetching home address:', error);
      }
    };
    fetchHome();
  }, []);

  // Geocode a single location using Mapbox
  const geocodeLocation = useCallback(async (location: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const response = await monitoredFetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${MAPBOX_TOKEN}&limit=1`,
        undefined,
        'mapbox'
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        console.log(`Geocoded "${location}" to [${lat}, ${lng}]`);
        return { lat, lng };
      }
      console.warn(`No geocode results for: ${location}`);
    } catch (error) {
      console.error(`Geocode error for ${location}:`, error);
    }
    return null;
  }, []);

  // Calculate distance between two points
  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // Geocode all jobs
  useEffect(() => {
    let cancelled = false;

    const geocodeAllJobs = async () => {
      setLoading(true);
      
      // Filter jobs that have a location (include all job types except pure remote)
      const jobsWithLocation = jobs.filter(j => {
        const hasLocation = j.location && j.location.trim().length > 0;
        const notRemote = j.job_type?.toLowerCase() !== 'remote';
        return hasLocation && notRemote;
      });

      console.log(`Found ${jobsWithLocation.length} jobs with locations to geocode out of ${jobs.length} total`);
      
      if (jobsWithLocation.length === 0) {
        setGeocodedJobs([]);
        setLoading(false);
        return;
      }

      setProgress({ current: 0, total: jobsWithLocation.length });
      const results: GeocodedJob[] = [];

      for (let i = 0; i < jobsWithLocation.length; i++) {
        if (cancelled) return;

        const job = jobsWithLocation[i];
        setProgress({ current: i + 1, total: jobsWithLocation.length });
        console.log(`Geocoding job ${i + 1}/${jobsWithLocation.length}: ${job.location}`);

        const coords = await geocodeLocation(job.location!);
        
        if (cancelled) return;

        if (coords) {
          const geocodedJob: GeocodedJob = {
            ...job,
            latitude: coords.lat,
            longitude: coords.lng,
          };

          // Calculate commute if home is set
          if (homeAddress) {
            const distance = calculateDistance(
              homeAddress.latitude, 
              homeAddress.longitude, 
              coords.lat, 
              coords.lng
            );
            
            geocodedJob.commute = {
              distance_km: Math.round(distance * 10) / 10,
              duration_minutes: Math.round(distance * 1.5),
            };
          }

          results.push(geocodedJob);
        }

        // Small delay to avoid rate limiting
        if (i < jobsWithLocation.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      if (!cancelled) {
        console.log(`Successfully geocoded ${results.length} jobs`);
        setGeocodedJobs(results);
        setLoading(false);
      }
    };

    if (jobs.length > 0) {
      geocodeAllJobs();
    } else {
      setGeocodedJobs([]);
      setLoading(false);
    }

    return () => { cancelled = true; };
  }, [jobs, homeAddress, geocodeLocation, calculateDistance]);

  // Initialize map once loading is complete
  useEffect(() => {
    if (loading) {
      console.log('Map init skipped: still loading');
      return;
    }
    
    if (!mapContainer.current) {
      console.log('Map init skipped: no container ref');
      return;
    }

    console.log('Map container dimensions:', {
      width: mapContainer.current.offsetWidth,
      height: mapContainer.current.offsetHeight,
    });

    // Clean up existing map
    if (map.current) {
      console.log('Removing existing map');
      map.current.remove();
      map.current = null;
    }

    // Calculate center point
    let center: [number, number] = [-98.5795, 39.8283]; // Default: center of USA
    
    if (homeAddress) {
      center = [homeAddress.longitude, homeAddress.latitude];
    } else if (geocodedJobs.length > 0) {
      center = [geocodedJobs[0].longitude, geocodedJobs[0].latitude];
    }

    console.log(`Initializing map at center: [${center[0]}, ${center[1]}] with ${geocodedJobs.length} jobs`);

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center,
        zoom: 4,
        attributionControl: true,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.current.on('load', () => {
        console.log('Map loaded successfully');
        setMapReady(true);
      });

      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
      });

      map.current.on('idle', () => {
        console.log('Map is idle (fully rendered)');
      });
    } catch (error) {
      console.error('Error initializing map:', error);
    }

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      setMapReady(false);
    };
  }, [loading, geocodedJobs.length, homeAddress]);

  // Add markers when map is ready
  useEffect(() => {
    if (!map.current || !mapReady || loading) return;

    console.log(`Adding ${geocodedJobs.length} job markers to map`);

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Add home marker
    if (homeAddress) {
      const homeEl = document.createElement('div');
      homeEl.innerHTML = `
        <div style="background-color: #22c55e; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
          </svg>
        </div>
      `;

      const homeMarker = new mapboxgl.Marker({ element: homeEl })
        .setLngLat([homeAddress.longitude, homeAddress.latitude])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 8px;">
            <div style="font-weight: 600; display: flex; align-items: center; gap: 6px;">🏠 Home</div>
            <p style="font-size: 14px; color: #666; margin-top: 4px;">${homeAddress.address}</p>
          </div>
        `))
        .addTo(map.current!);
      
      markersRef.current.push(homeMarker);
    }

    // Add job markers
    geocodedJobs.forEach((job) => {
      const color = getStatusColor(job.status);
      
      const el = document.createElement('div');
      el.innerHTML = `
        <div class="marker-dot" style="background-color: ${color}; width: 26px; height: 26px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); cursor: pointer; transition: transform 0.2s;">
        </div>
      `;
      
      // Set native title for hover tooltip
      el.title = `${job.job_title} - ${job.company_name}`;
      el.style.cursor = 'pointer';
      
      el.onmouseenter = () => {
        const dot = el.querySelector('.marker-dot') as HTMLElement;
        if (dot) dot.style.transform = 'scale(1.2)';
      };
      el.onmouseleave = () => {
        const dot = el.querySelector('.marker-dot') as HTMLElement;
        if (dot) dot.style.transform = 'scale(1)';
      };

      const popupHtml = `
        <div style="padding: 8px; min-width: 200px;">
          <div style="font-weight: 600; font-size: 14px;">${job.job_title}</div>
          <div style="font-size: 13px; color: #666;">🏢 ${job.company_name}</div>
          <div style="font-size: 13px; color: #666; margin-top: 4px;">📍 ${job.location}</div>
          ${job.commute ? `
            <div style="display: flex; gap: 12px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee; font-size: 13px;">
              <span>🚗 ${job.commute.distance_km} km</span>
              <span>⏱️ ~${job.commute.duration_minutes} min</span>
            </div>
          ` : ''}
          <div style="margin-top: 8px;">
            <span style="background-color: ${color}; color: white; padding: 3px 10px; border-radius: 4px; font-size: 12px; text-transform: capitalize;">
              ${job.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      `;

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([job.longitude, job.latitude])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupHtml))
        .addTo(map.current!);

      el.addEventListener('click', () => onJobClick?.(job));
      markersRef.current.push(marker);
    });

    // Fit bounds if we have markers
    if (geocodedJobs.length > 0 || homeAddress) {
      const bounds = new mapboxgl.LngLatBounds();
      
      if (homeAddress) {
        bounds.extend([homeAddress.longitude, homeAddress.latitude]);
      }
      
      geocodedJobs.forEach(j => {
        bounds.extend([j.longitude, j.latitude]);
      });

      map.current.fitBounds(bounds, { 
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 12
      });
    }
  }, [mapReady, geocodedJobs, homeAddress, onJobClick, loading]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">
            Geocoding locations... ({progress.current}/{progress.total})
          </p>
        </CardContent>
      </Card>
    );
  }

  if (geocodedJobs.length === 0 && !homeAddress) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            No job locations to display. Add locations to your jobs or set your home address.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span>{geocodedJobs.length} jobs on map</span>
            </div>
            {homeAddress && (
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-green-600" />
                <span>Home address set</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div 
          ref={mapContainer} 
          className="h-[500px] w-full" 
          style={{ minHeight: '500px' }}
        />
      </Card>

      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-medium">Legend:</span>
            {[
              { status: 'interested', label: 'Interested' },
              { status: 'applied', label: 'Applied' },
              { status: 'interview', label: 'Interview' },
              { status: 'offer', label: 'Offer' },
              { status: 'rejected', label: 'Rejected' },
            ].map(({ status, label }) => (
              <div key={status} className="flex items-center gap-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getStatusColor(status) }}
                />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
