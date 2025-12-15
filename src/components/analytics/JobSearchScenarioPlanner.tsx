import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { GitBranch, TrendingUp, Calendar, Target, Zap } from 'lucide-react';
import { addDays, format } from 'date-fns';

interface Scenario {
  name: string;
  applicationsPerWeek: number;
  responseRate: number;
  interviewConversion: number;
  offerConversion: number;
  estimatedDays: number;
  estimatedOffers: number;
  confidence: number;
}

export function JobSearchScenarioPlanner() {
  const [baseApplicationsPerWeek, setBaseApplicationsPerWeek] = useState(5);
  const [baseResponseRate, setBaseResponseRate] = useState(20);
  const [baseInterviewRate, setBaseInterviewRate] = useState(15);
  const [baseOfferRate, setBaseOfferRate] = useState(25);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  const calculateScenario = (
    name: string,
    appsPerWeek: number,
    responseMultiplier: number,
    interviewMultiplier: number,
    offerMultiplier: number
  ): Scenario => {
    const responseRate = Math.min(100, baseResponseRate * responseMultiplier);
    const interviewConversion = Math.min(100, baseInterviewRate * interviewMultiplier);
    const offerConversion = Math.min(100, baseOfferRate * offerMultiplier);

    // Calculate conversion funnel: Applications -> Responses -> Interviews -> Offers
    // responseRate: % of applications that get a response
    // interviewConversion: % of applications that lead to interviews
    // offerConversion: % of interviews that lead to offers
    
    // Overall conversion: applications -> offers
    const overallConversionRate = (responseRate / 100) * (interviewConversion / 100) * (offerConversion / 100);
    
    // Calculate expected time to first offer
    const appsNeededForOffer = overallConversionRate > 0 ? 1 / overallConversionRate : 1000;
    const weeksToOffer = appsNeededForOffer / appsPerWeek;
    const estimatedDays = Math.round(Math.min(weeksToOffer * 7, 365)); // Cap at 1 year

    // Calculate expected offers in 90 days
    const totalApps = appsPerWeek * (90 / 7); // ~12.86 weeks
    const estimatedOffers = Math.max(0, Math.round(totalApps * overallConversionRate));

    // Calculate confidence based on realistic rates
    let confidence = 50; // Base confidence
    if (responseRate >= 15 && responseRate <= 40) confidence += 15;
    if (interviewConversion >= 10 && interviewConversion <= 30) confidence += 15;
    if (offerConversion >= 20 && offerConversion <= 50) confidence += 15;
    if (appsPerWeek >= 3 && appsPerWeek <= 15) confidence += 5;

    return {
      name,
      applicationsPerWeek: Math.round(appsPerWeek * 10) / 10,
      responseRate: Math.round(responseRate * 10) / 10,
      interviewConversion: Math.round(interviewConversion * 10) / 10,
      offerConversion: Math.round(offerConversion * 10) / 10,
      estimatedDays,
      estimatedOffers,
      confidence: Math.min(95, confidence)
    };
  };

  const generateScenarios = () => {
    const newScenarios: Scenario[] = [
      calculateScenario('Current Pace', baseApplicationsPerWeek, 1, 1, 1),
      calculateScenario('Quality Focus', baseApplicationsPerWeek * 0.5, 1.6, 1.4, 1.3),
      calculateScenario('High Volume', baseApplicationsPerWeek * 2.5, 0.8, 0.85, 0.95),
      calculateScenario('Optimized', baseApplicationsPerWeek * 1.5, 1.25, 1.15, 1.1),
      calculateScenario('Aggressive', baseApplicationsPerWeek * 3, 0.7, 0.75, 0.9)
    ];
    setScenarios(newScenarios);
  };

  const chartData = scenarios.map(s => ({
    name: s.name,
    'Days to Offer': s.estimatedDays,
    'Offers in 90 Days': s.estimatedOffers,
    'Apps/Week': s.applicationsPerWeek
  }));

  const getScenarioColor = (name: string) => {
    switch (name) {
      case 'Current Pace': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
      case 'Quality Focus': return 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300';
      case 'High Volume': return 'bg-orange-100 text-orange-800 dark:bg-orange-950/30 dark:text-orange-300';
      case 'Optimized': return 'bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-300';
      case 'Aggressive': return 'bg-purple-100 text-purple-800 dark:bg-purple-950/30 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Job Search Scenario Planner
        </CardTitle>
        <CardDescription>
          Compare different job search strategies and predict outcomes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Controls */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Applications per Week</Label>
                <span className="text-sm font-medium">{baseApplicationsPerWeek}</span>
              </div>
              <Slider
                value={[baseApplicationsPerWeek]}
                onValueChange={([value]) => setBaseApplicationsPerWeek(value)}
                min={1}
                max={30}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Response Rate (%)</Label>
                <span className="text-sm font-medium">{baseResponseRate}%</span>
              </div>
              <Slider
                value={[baseResponseRate]}
                onValueChange={([value]) => setBaseResponseRate(value)}
                min={5}
                max={50}
                step={1}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Interview Conversion (%)</Label>
                <span className="text-sm font-medium">{baseInterviewRate}%</span>
              </div>
              <Slider
                value={[baseInterviewRate]}
                onValueChange={([value]) => setBaseInterviewRate(value)}
                min={5}
                max={50}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Offer Conversion (%)</Label>
                <span className="text-sm font-medium">{baseOfferRate}%</span>
              </div>
              <Slider
                value={[baseOfferRate]}
                onValueChange={([value]) => setBaseOfferRate(value)}
                min={10}
                max={60}
                step={1}
              />
            </div>
          </div>
        </div>

        <Button onClick={generateScenarios} className="w-full" size="lg">
          <Zap className="h-4 w-4 mr-2" />
          Generate Scenarios
        </Button>

        {scenarios.length > 0 && (
          <>
            {/* Scenario Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {scenarios.map((scenario) => (
                <div
                  key={scenario.name}
                  className={`p-4 rounded-lg border-2 space-y-3 ${getScenarioColor(scenario.name)}`}
                >
                  <div className="flex items-start justify-between">
                    <h4 className="font-semibold">{scenario.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {scenario.confidence}% confidence
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Apps/Week:</span>
                      <span className="font-medium">{scenario.applicationsPerWeek}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Response Rate:</span>
                      <span className="font-medium">{scenario.responseRate.toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Interview Rate:</span>
                      <span className="font-medium">{scenario.interviewConversion.toFixed(0)}%</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span className="text-lg font-bold">{scenario.estimatedDays} days</span>
                    </div>
                    <p className="text-xs">to first offer</p>
                    
                    <div className="flex items-center gap-2 pt-2">
                      <Target className="h-4 w-4" />
                      <span className="text-lg font-bold">{scenario.estimatedOffers} offers</span>
                    </div>
                    <p className="text-xs">expected in 90 days</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Comparison Chart */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Scenario Comparison
              </h4>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      dataKey="name" 
                      fontSize={12}
                      tick={{ fill: 'currentColor' }}
                    />
                    <YAxis 
                      fontSize={12}
                      tick={{ fill: 'currentColor' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))'
                      }}
                      cursor={false}
                      animationDuration={200}
                      animationEasing="ease-out"
                    />
                    <Legend 
                      wrapperStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Bar 
                      dataKey="Days to Offer" 
                      fill="#3b82f6"
                      animationDuration={800}
                      animationBegin={0}
                    />
                    <Bar 
                      dataKey="Offers in 90 Days" 
                      fill="#10b981"
                      animationDuration={800}
                      animationBegin={100}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Insights */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Key Insights
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>
                    <strong>Quality Focus</strong> strategy yields better conversion rates but requires more targeted applications
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>
                    <strong>High Volume</strong> approach accelerates timeline but may reduce quality and response rates
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>
                    <strong>Optimized</strong> strategy balances volume and quality for best overall results
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>
                    Adjust your strategy based on timeline urgency and energy capacity
                  </span>
                </li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
