import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageSquare, Trash2, TrendingUp } from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { MentorShareSettings } from "./MentorShareSettings";
import { MenteeProgressView } from "./MenteeProgressView";

interface RelationshipCardProps {
  relationship: {
    id: string;
    mentor_id: string;
    mentee_id: string;
    status: string;
    started_at: string;
    relationship_type: string;
  };
  isMentor: boolean;
  onMessage: (id: string) => void;
  onRemove: (id: string) => void;
}

export function RelationshipCard({ relationship, isMentor, onMessage, onRemove }: RelationshipCardProps) {
  const otherUserId = isMentor ? relationship.mentee_id : relationship.mentor_id;
  const { data: profile, isLoading } = useUserProfile(otherUserId);
  const [showProgress, setShowProgress] = useState(false);

  const displayName = profile 
    ? `${profile.first_name} ${profile.last_name}`.trim() || profile.email
    : 'Loading...';

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{isMentor ? 'Mentee' : 'Mentor'}: {isLoading ? 'Loading...' : displayName}</CardTitle>
              <CardDescription>
                Started {new Date(relationship.started_at).toLocaleDateString()}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {isMentor && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowProgress(true)}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Progress
                </Button>
              )}
              {!isMentor && (
                <MentorShareSettings relationshipId={relationship.id} />
              )}
              <Button
                size="sm"
                onClick={() => onMessage(relationship.id)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Message
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onRemove(relationship.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Badge variant={relationship.status === 'active' ? 'default' : 'secondary'}>
              {relationship.status}
            </Badge>
            <Badge variant="outline">{relationship.relationship_type}</Badge>
          </div>
        </CardContent>
      </Card>

      {isMentor && (
        <Dialog open={showProgress} onOpenChange={setShowProgress}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Mentee Progress - {displayName}</DialogTitle>
            </DialogHeader>
            <MenteeProgressView 
              menteeId={relationship.mentee_id} 
              relationshipId={relationship.id}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
