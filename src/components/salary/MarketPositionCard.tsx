import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Target } from "lucide-react";

interface MarketPositionCardProps {
  analysis?: {
    current_percentile?: number;
    position_label?: string;
    gap_to_median?: number;
    gap_to_75th_percentile?: number;
    industry_comparison?: string;
    location_adjustment?: string;
  };
  currentCompensation: number;
  marketData?: any;
}

export function MarketPositionCard({ analysis, currentCompensation, marketData }: MarketPositionCardProps) {
  const percentile = analysis?.current_percentile || 50;
  
  const getPositionColor = () => {
    if (percentile >= 75) return 'text-green-500';
    if (percentile >= 50) return 'text-blue-500';
    if (percentile >= 25) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Market Position Analysis</CardTitle>
          <CardDescription>Compare your compensation against market benchmarks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Percentile Visualization */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Your Market Percentile</span>
              <span className={`text-2xl font-bold ${getPositionColor()}`}>
                {percentile}th
              </span>
            </div>
            <div className="relative">
              <Progress value={percentile} className="h-4" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0th</span>
                <span>25th</span>
                <span>50th</span>
                <span>75th</span>
                <span>100th</span>
              </div>
            </div>
          </div>

          {/* Position Badge */}
          <div className="flex items-center justify-center gap-2 p-4 bg-muted rounded-lg">
            <Target className="h-5 w-5 text-primary" />
            <span className="text-sm">You are earning</span>
            <Badge variant={
              analysis?.position_label === 'above_market' ? 'default' :
              analysis?.position_label === 'at_market' ? 'secondary' : 'outline'
            }>
              {analysis?.position_label?.replace('_', ' ') || 'Unknown'}
            </Badge>
            <span className="text-sm">compared to peers</span>
          </div>

          {/* Gap Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                {(analysis?.gap_to_median || 0) >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm font-medium">Gap to Median</span>
              </div>
              <p className={`text-xl font-bold ${(analysis?.gap_to_median || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {(analysis?.gap_to_median || 0) >= 0 ? '+' : ''}${(analysis?.gap_to_median || 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {(analysis?.gap_to_median || 0) >= 0 
                  ? 'Above market median' 
                  : 'Below market median'}
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Gap to 75th Percentile</span>
              </div>
              <p className="text-xl font-bold">
                ${Math.abs(analysis?.gap_to_75th_percentile || 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {(analysis?.gap_to_75th_percentile || 0) > 0 
                  ? 'To reach top quartile' 
                  : 'Already in top quartile'}
              </p>
            </div>
          </div>

          {/* Market Data Reference */}
          {marketData && (
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-3">Market Reference Data</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">25th Percentile</p>
                  <p className="font-medium">${marketData.percentile_25?.toLocaleString() || '--'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Median (50th)</p>
                  <p className="font-medium">${marketData.median_salary?.toLocaleString() || '--'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">75th Percentile</p>
                  <p className="font-medium">${marketData.percentile_75?.toLocaleString() || '--'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Industry & Location Insights */}
          {(analysis?.industry_comparison || analysis?.location_adjustment) && (
            <div className="space-y-3 pt-4 border-t">
              {analysis.industry_comparison && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Industry Comparison</p>
                  <p className="text-sm text-muted-foreground mt-1">{analysis.industry_comparison}</p>
                </div>
              )}
              {analysis.location_adjustment && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Location Factor</p>
                  <p className="text-sm text-muted-foreground mt-1">{analysis.location_adjustment}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
