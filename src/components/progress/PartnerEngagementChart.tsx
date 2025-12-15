import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Partner {
  id: string;
  partner_name: string;
  engagement_score: number;
  relationship_type: string;
}

interface PartnerEngagementChartProps {
  partners: Partner[];
}

export function PartnerEngagementChart({ partners }: PartnerEngagementChartProps) {
  const chartData = partners
    .filter(p => p.engagement_score > 0)
    .map(partner => ({
      name: partner.partner_name.split(" ")[0] || "Partner",
      engagement: partner.engagement_score,
      type: partner.relationship_type,
    }));

  if (chartData.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Partner Engagement</CardTitle>
        <CardDescription>
          Track how actively your accountability partners are supporting you
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Bar dataKey="engagement" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
