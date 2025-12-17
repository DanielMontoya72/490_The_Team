import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// BLS Occupation codes mapping for common job titles
const OCCUPATION_MAPPINGS: Record<string, { code: string; title: string }> = {
  'software engineer': { code: '15-1252', title: 'Software Developers' },
  'software developer': { code: '15-1252', title: 'Software Developers' },
  'web developer': { code: '15-1254', title: 'Web Developers' },
  'frontend developer': { code: '15-1254', title: 'Web Developers' },
  'backend developer': { code: '15-1252', title: 'Software Developers' },
  'full stack developer': { code: '15-1252', title: 'Software Developers' },
  'data scientist': { code: '15-2051', title: 'Data Scientists' },
  'data analyst': { code: '15-2051', title: 'Data Scientists' },
  'data engineer': { code: '15-1252', title: 'Software Developers' },
  'machine learning engineer': { code: '15-2051', title: 'Data Scientists' },
  'devops engineer': { code: '15-1244', title: 'Network and Computer Systems Administrators' },
  'cloud engineer': { code: '15-1244', title: 'Network and Computer Systems Administrators' },
  'product manager': { code: '11-2021', title: 'Marketing Managers' },
  'project manager': { code: '11-9199', title: 'Managers, All Other' },
  'ux designer': { code: '27-1024', title: 'Graphic Designers' },
  'ui designer': { code: '27-1024', title: 'Graphic Designers' },
  'graphic designer': { code: '27-1024', title: 'Graphic Designers' },
  'accountant': { code: '13-2011', title: 'Accountants and Auditors' },
  'financial analyst': { code: '13-2051', title: 'Financial Analysts' },
  'marketing manager': { code: '11-2021', title: 'Marketing Managers' },
  'sales manager': { code: '11-2022', title: 'Sales Managers' },
  'hr manager': { code: '11-3121', title: 'Human Resources Managers' },
  'nurse': { code: '29-1141', title: 'Registered Nurses' },
  'registered nurse': { code: '29-1141', title: 'Registered Nurses' },
  'physician': { code: '29-1216', title: 'General Internal Medicine Physicians' },
  'doctor': { code: '29-1216', title: 'General Internal Medicine Physicians' },
  'lawyer': { code: '23-1011', title: 'Lawyers' },
  'attorney': { code: '23-1011', title: 'Lawyers' },
  'teacher': { code: '25-2031', title: 'Secondary School Teachers' },
  'engineer': { code: '17-2199', title: 'Engineers, All Other' },
  'mechanical engineer': { code: '17-2141', title: 'Mechanical Engineers' },
  'electrical engineer': { code: '17-2071', title: 'Electrical Engineers' },
  'civil engineer': { code: '17-2051', title: 'Civil Engineers' },
  'dentist': { code: '29-1021', title: 'Dentists, General' },
  'pharmacist': { code: '29-1051', title: 'Pharmacists' },
  'consultant': { code: '13-1111', title: 'Management Analysts' },
  'business analyst': { code: '13-1111', title: 'Management Analysts' },
  'executive assistant': { code: '43-6011', title: 'Executive Secretaries and Executive Administrative Assistants' },
  'administrative assistant': { code: '43-6014', title: 'Secretaries and Administrative Assistants' },
};

// State codes for BLS location mapping
const STATE_CODES: Record<string, string> = {
  'alabama': '01', 'alaska': '02', 'arizona': '04', 'arkansas': '05', 'california': '06',
  'colorado': '08', 'connecticut': '09', 'delaware': '10', 'florida': '12', 'georgia': '13',
  'hawaii': '15', 'idaho': '16', 'illinois': '17', 'indiana': '18', 'iowa': '19',
  'kansas': '20', 'kentucky': '21', 'louisiana': '22', 'maine': '23', 'maryland': '24',
  'massachusetts': '25', 'michigan': '26', 'minnesota': '27', 'mississippi': '28', 'missouri': '29',
  'montana': '30', 'nebraska': '31', 'nevada': '32', 'new hampshire': '33', 'new jersey': '34',
  'new mexico': '35', 'new york': '36', 'north carolina': '37', 'north dakota': '38', 'ohio': '39',
  'oklahoma': '40', 'oregon': '41', 'pennsylvania': '42', 'rhode island': '44', 'south carolina': '45',
  'south dakota': '46', 'tennessee': '47', 'texas': '48', 'utah': '49', 'vermont': '50',
  'virginia': '51', 'washington': '53', 'west virginia': '54', 'wisconsin': '55', 'wyoming': '56',
  'al': '01', 'ak': '02', 'az': '04', 'ar': '05', 'ca': '06', 'co': '08', 'ct': '09',
  'de': '10', 'fl': '12', 'ga': '13', 'hi': '15', 'id': '16', 'il': '17', 'in': '18',
  'ia': '19', 'ks': '20', 'ky': '21', 'la': '22', 'me': '23', 'md': '24', 'ma': '25',
  'mi': '26', 'mn': '27', 'ms': '28', 'mo': '29', 'mt': '30', 'ne': '31', 'nv': '32',
  'nh': '33', 'nj': '34', 'nm': '35', 'ny': '36', 'nc': '37', 'nd': '38', 'oh': '39',
  'ok': '40', 'or': '41', 'pa': '42', 'ri': '44', 'sc': '45', 'sd': '46', 'tn': '47',
  'tx': '48', 'ut': '49', 'vt': '50', 'va': '51', 'wa': '53', 'wv': '54', 'wi': '55', 'wy': '56',
};

function findOccupationCode(jobTitle: string): { code: string; title: string } | null {
  const normalized = jobTitle.toLowerCase().trim();
  
  // Direct match
  if (OCCUPATION_MAPPINGS[normalized]) {
    return OCCUPATION_MAPPINGS[normalized];
  }
  
  // Partial match
  for (const [key, value] of Object.entries(OCCUPATION_MAPPINGS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  // Try individual words
  const words = normalized.split(/\s+/);
  for (const word of words) {
    for (const [key, value] of Object.entries(OCCUPATION_MAPPINGS)) {
      if (key.includes(word) && word.length > 3) {
        return value;
      }
    }
  }
  
  return null;
}

function extractStateCode(location: string): string | null {
  if (!location) return null;
  
  const normalized = location.toLowerCase().trim();
  
  // Try to find state name or abbreviation
  for (const [key, code] of Object.entries(STATE_CODES)) {
    if (normalized.includes(key)) {
      return code;
    }
  }
  
  return null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { jobTitle, location, forceRefresh = false } = await req.json();

    console.log('Fetching BLS salary data for:', { jobTitle, location });

    // Find occupation code
    const occupation = findOccupationCode(jobTitle || '');
    if (!occupation) {
      console.log('No occupation mapping found for:', jobTitle);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No salary data available for this job title',
          data: null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stateCode = extractStateCode(location || '');
    const currentYear = new Date().getFullYear();
    const dataYear = currentYear - 1; // BLS data is typically for previous year

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const { data: cachedData, error: cacheError } = await supabaseClient
        .from('bls_salary_benchmarks')
        .select('*')
        .eq('occupation_code', occupation.code)
        .eq('location_code', stateCode || 'national')
        .gte('expires_at', new Date().toISOString())
        .order('fetched_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!cacheError && cachedData) {
        console.log('Returning cached BLS data');
        return new Response(
          JSON.stringify({
            success: true,
            data: cachedData,
            cached: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Build BLS API request
    // Using OES (Occupational Employment and Wage Statistics) data
    // Series ID format: OEUS[area code]000000[occupation code][data type]
    // National data: OEUN0000000000[occupation code]01 for median
    const occupationCodeClean = occupation.code.replace('-', '');
    
    // Create series IDs for different percentiles
    const seriesIds = [
      `OEUN000000000${occupationCodeClean}01`, // Mean hourly wage
      `OEUN000000000${occupationCodeClean}02`, // Mean annual wage
      `OEUN000000000${occupationCodeClean}03`, // Median hourly wage
      `OEUN000000000${occupationCodeClean}04`, // Median annual wage
      `OEUN000000000${occupationCodeClean}06`, // 10th percentile hourly
      `OEUN000000000${occupationCodeClean}07`, // 10th percentile annual
      `OEUN000000000${occupationCodeClean}08`, // 25th percentile hourly
      `OEUN000000000${occupationCodeClean}09`, // 25th percentile annual
      `OEUN000000000${occupationCodeClean}10`, // 75th percentile hourly
      `OEUN000000000${occupationCodeClean}11`, // 75th percentile annual
      `OEUN000000000${occupationCodeClean}12`, // 90th percentile hourly
      `OEUN000000000${occupationCodeClean}13`, // 90th percentile annual
    ];

    console.log('Calling BLS API with series:', seriesIds[0]);

    // BLS API v2 request (no API key required for basic access)
    const startTime = Date.now();
    const blsResponse = await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        seriesid: seriesIds.slice(0, 4), // Limit to essential series for v1 API
        startyear: String(dataYear - 1),
        endyear: String(dataYear),
      }),
    });
    const responseTimeMs = Date.now() - startTime;

    // Track API usage
    try {
      await supabaseClient.from('api_usage_logs').insert({
        service_name: 'bls_api',
        endpoint: '/publicAPI/v2/timeseries/data/',
        method: 'POST',
        status_code: blsResponse.status,
        response_time_ms: responseTimeMs,
        success: blsResponse.ok,
        error_message: blsResponse.ok ? null : `BLS API error: ${blsResponse.status}`,
      });
    } catch (trackError) {
      console.error('Failed to track API usage:', trackError);
    }

    if (!blsResponse.ok) {
      console.error('BLS API error:', blsResponse.status, blsResponse.statusText);
      throw new Error(`BLS API error: ${blsResponse.status}`);
    }

    const blsData = await blsResponse.json();
    console.log('BLS API response status:', blsData.status);

    // Parse BLS response
    let salaryData = {
      occupation_code: occupation.code,
      occupation_title: occupation.title,
      location_code: stateCode || 'national',
      location_name: stateCode ? location : 'United States (National)',
      percentile_10: null as number | null,
      percentile_25: null as number | null,
      median_salary: null as number | null,
      percentile_75: null as number | null,
      percentile_90: null as number | null,
      mean_salary: null as number | null,
      annual_total_employment: null as number | null,
      data_year: dataYear,
      data_source: 'BLS OES',
    };

    if (blsData.status === 'REQUEST_SUCCEEDED' && blsData.Results?.series) {
      for (const series of blsData.Results.series) {
        const seriesId = series.seriesID;
        const latestData = series.data?.[0];
        
        if (latestData && latestData.value && latestData.value !== '-') {
          const value = parseFloat(latestData.value);
          
          // Map series ID suffix to data field
          if (seriesId.endsWith('02')) salaryData.mean_salary = value;
          if (seriesId.endsWith('04')) salaryData.median_salary = value;
          if (seriesId.endsWith('07')) salaryData.percentile_10 = value;
          if (seriesId.endsWith('09')) salaryData.percentile_25 = value;
          if (seriesId.endsWith('11')) salaryData.percentile_75 = value;
          if (seriesId.endsWith('13')) salaryData.percentile_90 = value;
        }
      }
    }

    // If no BLS data, generate estimated data based on occupation type
    if (!salaryData.median_salary) {
      console.log('No BLS data available, generating estimates');
      
      // Fallback estimates based on occupation category
      const baseEstimates: Record<string, number> = {
        '15': 95000, // Computer and Mathematical
        '11': 110000, // Management
        '13': 75000, // Business and Financial
        '17': 85000, // Architecture and Engineering
        '23': 130000, // Legal
        '25': 55000, // Educational
        '27': 55000, // Arts and Design
        '29': 75000, // Healthcare
        '43': 42000, // Office and Administrative
      };

      const occupationPrefix = occupation.code.substring(0, 2);
      const baseSalary = baseEstimates[occupationPrefix] || 60000;

      salaryData.median_salary = baseSalary;
      salaryData.mean_salary = baseSalary * 1.05;
      salaryData.percentile_10 = baseSalary * 0.6;
      salaryData.percentile_25 = baseSalary * 0.75;
      salaryData.percentile_75 = baseSalary * 1.3;
      salaryData.percentile_90 = baseSalary * 1.6;
      salaryData.data_source = 'BLS OES (Estimated)';
    }

    // Cache the results
    const { error: insertError } = await supabaseClient
      .from('bls_salary_benchmarks')
      .upsert({
        ...salaryData,
        fetched_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      }, {
        onConflict: 'occupation_code,location_code,data_year',
      });

    if (insertError) {
      console.error('Error caching BLS data:', insertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: salaryData,
        cached: false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error fetching BLS salary data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        data: null,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});