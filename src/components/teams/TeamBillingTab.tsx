import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Users, CheckCircle } from "lucide-react";

interface TeamBillingTabProps {
  teamId: string;
}

export const TeamBillingTab = ({ teamId }: TeamBillingTabProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Manage your team subscription</CardDescription>
            </div>
            <Badge variant="secondary">Free</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-6 border rounded-lg text-center space-y-4">
            <div>
              <p className="text-lg font-medium">No Active Subscription</p>
              <p className="text-sm text-muted-foreground">You're currently on the free plan</p>
            </div>
            <Button variant="default">Upgrade to Professional</Button>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Available with Professional Plan</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4" />
                <span>Up to 10 team members</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4" />
                <span>Unlimited candidate profiles</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4" />
                <span>Team dashboard & analytics</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4" />
                <span>Performance reports & insights</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No billing history</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
