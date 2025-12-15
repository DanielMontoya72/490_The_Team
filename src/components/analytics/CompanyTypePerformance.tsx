import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Building2, Users, Factory, Briefcase, Globe, Cpu, HeartPulse, Landmark, ShoppingBag, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CompanyTypePerformanceProps {
  data: any;
}

// Map well-known companies to their sizes
const companySizeMap: Record<string, string> = {
  'google': 'Enterprise',
  'meta': 'Enterprise',
  'amazon': 'Enterprise',
  'microsoft': 'Enterprise',
  'apple': 'Enterprise',
  'capital one': 'Enterprise',
  'target': 'Enterprise',
  'ups': 'Enterprise',
  'adp': 'Enterprise',
  'morgan stanley': 'Enterprise',
  'morgan stanely': 'Enterprise',
  'jpmorgan': 'Enterprise',
  'walmart': 'Enterprise',
  'ibm': 'Enterprise',
  'oracle': 'Enterprise',
  'salesforce': 'Enterprise',
  'netflix': 'Large',
  'riot games': 'Large',
  'spotify': 'Large',
  'uber': 'Large',
  'airbnb': 'Large',
  'openai': 'Startup',
  'figma': 'Startup',
  'stripe': 'Startup',
  'notion': 'Startup',
  'discord': 'Startup',
  'wordpress': 'Medium',
  'merit systems': 'Startup',
};

const sizeIcons: Record<string, React.ReactNode> = {
  'Startup': <Users className="h-4 w-4" />,
  'Small': <Building2 className="h-4 w-4" />,
  'Medium': <Factory className="h-4 w-4" />,
  'Large': <Globe className="h-4 w-4" />,
  'Enterprise': <Landmark className="h-4 w-4" />,
};

const industryIcons: Record<string, React.ReactNode> = {
  'Technology': <Cpu className="h-4 w-4" />,
  'Healthcare': <HeartPulse className="h-4 w-4" />,
  'Finance': <Landmark className="h-4 w-4" />,
  'Retail': <ShoppingBag className="h-4 w-4" />,
  'Education': <GraduationCap className="h-4 w-4" />,
};

function getCompanySize(companyName: string, existingSize?: string): string {
  if (existingSize && existingSize !== 'Unknown' && existingSize.trim()) {
    return existingSize;
  }
  const normalized = companyName?.toLowerCase().trim() || '';
  return companySizeMap[normalized] || 'Medium';
}

function isPositiveOutcome(status: string): boolean {
  const s = status?.toLowerCase() || '';
  return ['accepted', 'offer', 'hired', 'offer received', 'interview', 'phone screen', 'phone_screen'].includes(s);
}

function isPositiveInterviewOutcome(outcome: string): boolean {
  const o = outcome?.toLowerCase() || '';
  return o === 'passed' || o.includes('offer') || o.includes('accept') || o.includes('hired');
}

export function CompanyTypePerformance({ data }: CompanyTypePerformanceProps) {
  // Get interviews from data prop - these are the actual interview records
  const interviews = data?.interviews || [];
  const jobs = data?.jobs || [];
  
  // Create a job lookup map for getting company info
  const jobMap = new Map(jobs.map((j: any) => [j.id, j]));
  
  // Group by company size - count each INTERVIEW, not each job
  const bySize: Record<string, { total: number; positive: number }> = {};
  
  interviews.forEach((interview: any) => {
    // Get company info from the interview's jobs relation or from the jobs array
    const jobInfo = interview.jobs || jobMap.get(interview.job_id);
    const companyName = jobInfo?.company_name || '';
    const companySize = jobInfo?.company_size;
    
    const size = getCompanySize(companyName, companySize);
    if (!bySize[size]) {
      bySize[size] = { total: 0, positive: 0 };
    }
    bySize[size].total++;
    // Check interview outcome, not job status
    if (isPositiveInterviewOutcome(interview.outcome)) {
      bySize[size].positive++;
    }
  });
  
  // Group by industry - count each INTERVIEW
  const byIndustry: Record<string, { total: number; positive: number }> = {};
  
  interviews.forEach((interview: any) => {
    const jobInfo = interview.jobs || jobMap.get(interview.job_id);
    const industry = jobInfo?.industry || 'Technology';
    if (!byIndustry[industry]) {
      byIndustry[industry] = { total: 0, positive: 0 };
    }
    byIndustry[industry].total++;
    if (isPositiveInterviewOutcome(interview.outcome)) {
      byIndustry[industry].positive++;
    }
  });
  
  const sizeOrder = ['Enterprise', 'Large', 'Medium', 'Small', 'Startup'];
  
  const sizeStats = Object.entries(bySize)
    .map(([size, stats]) => ({
      name: size,
      rate: stats.total > 0 ? (stats.positive / stats.total) * 100 : 0,
      total: stats.total,
      positive: stats.positive
    }))
    .sort((a, b) => sizeOrder.indexOf(a.name) - sizeOrder.indexOf(b.name));
  
  const industryStats = Object.entries(byIndustry)
    .map(([industry, stats]) => ({
      name: industry,
      rate: stats.total > 0 ? (stats.positive / stats.total) * 100 : 0,
      total: stats.total,
      positive: stats.positive
    }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5);

  const hasData = interviews.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Performance by Company Type
        </CardTitle>
        <CardDescription>
          Success rates across different company sizes and industries
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-semibold text-sm">By Company Size</h4>
          {hasData && sizeStats.length > 0 ? (
            <div className="space-y-3">
              {sizeStats.map((stat) => (
                <div key={stat.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium flex items-center gap-2">
                      {sizeIcons[stat.name] || <Building2 className="h-4 w-4" />}
                      {stat.name}
                    </span>
                    <span className="text-muted-foreground">
                      <span className={stat.rate >= 40 ? "text-green-600 font-medium" : stat.rate >= 25 ? "text-yellow-600" : "text-muted-foreground"}>
                        {stat.rate.toFixed(0)}%
                      </span>
                      <span className="text-xs ml-1">({stat.positive}/{stat.total})</span>
                    </span>
                  </div>
                  <Progress value={stat.rate} className="h-2" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data available yet</p>
          )}
        </div>
        
        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-semibold text-sm">Top Industries</h4>
          {hasData && industryStats.length > 0 ? (
            <div className="space-y-3">
              {industryStats.map((stat, index) => (
                <div key={stat.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium flex items-center gap-2">
                      {industryIcons[stat.name] || <Briefcase className="h-4 w-4" />}
                      {stat.name}
                      {index === 0 && industryStats.length > 1 && (
                        <Badge variant="secondary" className="text-xs">Top</Badge>
                      )}
                    </span>
                    <span className="text-muted-foreground">
                      <span className={stat.rate >= 40 ? "text-green-600 font-medium" : stat.rate >= 25 ? "text-yellow-600" : "text-muted-foreground"}>
                        {stat.rate.toFixed(0)}%
                      </span>
                      <span className="text-xs ml-1">({stat.positive}/{stat.total})</span>
                    </span>
                  </div>
                  <Progress value={stat.rate} className="h-2" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data available yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}