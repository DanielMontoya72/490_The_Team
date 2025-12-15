import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching URL:', url);

    // Fetch the job posting HTML with comprehensive headers to avoid blocking
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
      },
    });

    if (!response.ok) {
      console.error(`HTTP Error: ${response.status} ${response.statusText}`);
      // Return partial success with just the URL - let user fill in details manually
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: {
            job_title: null,
            company_name: null,
            location: null,
            job_description: null,
            salary_range_min: null,
            salary_range_max: null,
            job_type: null,
            industry: null,
          },
          error: `Website returned ${response.status}. The site may block automated access. Please enter details manually.`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();
    console.log('Fetched HTML length:', html.length);

    // Extract job details from HTML using regex patterns
    const extractedData: any = {
      job_title: null,
      company_name: null,
      location: null,
      job_description: null,
      salary_range_min: null,
      salary_range_max: null,
      job_type: null,
      industry: null,
    };

    // Extract job title - try multiple patterns
    const titlePatterns = [
      /<title[^>]*>([^<|]+)/i,
      /<h1[^>]*class[^>]*job[^>]*title[^>]*>([^<]+)/i,
      /<h1[^>]*>([^<]+)<\/h1>/i,
      /property="og:title"[^>]*content="([^"]+)"/i,
      /"jobTitle":"([^"]+)"/i,
      /"title":"([^"]+)"/i,
    ];

    for (const pattern of titlePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        extractedData.job_title = match[1].trim().split('|')[0].split('-')[0].trim();
        if (extractedData.job_title.length > 5) break;
      }
    }

    // Extract company name
    const companyPatterns = [
      /"hiringOrganization":\s*{\s*"@type":\s*"Organization",\s*"name":\s*"([^"]+)"/i,
      /"companyName":"([^"]+)"/i,
      /class="[^"]*company[^"]*"[^>]*>([^<]+)</i,
      /property="og:site_name"[^>]*content="([^"]+)"/i,
      /"employerName":"([^"]+)"/i,
    ];

    for (const pattern of companyPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        extractedData.company_name = match[1].trim();
        if (extractedData.company_name.length > 2) break;
      }
    }

    // Extract location
    const locationPatterns = [
      /"jobLocation":\s*{\s*"@type":\s*"Place",\s*"address":\s*{\s*"@type":\s*"PostalAddress",\s*"addressLocality":\s*"([^"]+)",\s*"addressRegion":\s*"([^"]+)"/i,
      /"location":"([^"]+)"/i,
      /class="[^"]*location[^"]*"[^>]*>([^<]+)</i,
      /"formattedLocation":"([^"]+)"/i,
    ];

    for (const pattern of locationPatterns) {
      const match = html.match(pattern);
      if (match) {
        if (match[2]) {
          extractedData.location = `${match[1].trim()}, ${match[2].trim()}`;
        } else if (match[1]) {
          extractedData.location = match[1].trim();
        }
        if (extractedData.location && extractedData.location.length > 3) break;
      }
    }

    // Extract description
    const descPatterns = [
      /"description":"([^"]{100,2000})"/i,
      /<div[^>]*class[^>]*description[^>]*>([^<]{100,2000})/i,
      /property="og:description"[^>]*content="([^"]+)"/i,
    ];

    for (const pattern of descPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        let desc = match[1].trim();
        // Remove HTML entities and clean up
        desc = desc
          .replace(/\\n/g, ' ')
          .replace(/\\t/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .trim()
          .substring(0, 2000);
        if (desc.length > 100) {
          extractedData.job_description = desc;
          break;
        }
      }
    }

    // Extract salary information
    const salaryPatterns = [
      /\$?([\d,]+)\s*-\s*\$?([\d,]+)/,
      /"baseSalary"[^}]*"value":\s*{\s*"minValue":\s*([\d.]+),\s*"maxValue":\s*([\d.]+)/i,
      /"salary[^"]*":\s*"[^\d]*([\d,]+)\s*-\s*[^\d]*([\d,]+)/i,
    ];

    for (const pattern of salaryPatterns) {
      const match = html.match(pattern);
      if (match && match[1] && match[2]) {
        extractedData.salary_range_min = parseInt(match[1].replace(/,/g, ''));
        extractedData.salary_range_max = parseInt(match[2].replace(/,/g, ''));
        break;
      }
    }

    // Extract job type
    const jobTypePatterns = [
      /"employmentType":"([^"]+)"/i,
      /"jobType":"([^"]+)"/i,
      /employment[- ]type[^>]*>([^<]+)</i,
    ];

    for (const pattern of jobTypePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const type = match[1].trim();
        if (type.toLowerCase().includes('full')) {
          extractedData.job_type = 'Full-time';
        } else if (type.toLowerCase().includes('part')) {
          extractedData.job_type = 'Part-time';
        } else if (type.toLowerCase().includes('contract')) {
          extractedData.job_type = 'Contract';
        } else if (type.toLowerCase().includes('intern')) {
          extractedData.job_type = 'Internship';
        }
        if (extractedData.job_type) break;
      }
    }

    // Extract industry
    const industryPatterns = [
      /"industry":"([^"]+)"/i,
      /industry[^>]*>([^<]+)</i,
    ];

    for (const pattern of industryPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        extractedData.industry = match[1].trim();
        break;
      }
    }

    console.log('Extracted data:', extractedData);

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error importing job:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
