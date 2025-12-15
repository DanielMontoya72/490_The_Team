import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Loader2, X } from "lucide-react";

interface ContactMutualConnectionsProps {
  contactId: string;
  currentMutualConnections?: string[];
}

export function ContactMutualConnections({ contactId, currentMutualConnections = [] }: ContactMutualConnectionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [mutualConnectionName, setMutualConnectionName] = useState("");
  const [mutualConnections, setMutualConnections] = useState<string[]>(currentMutualConnections);

  const updateMutualConnectionsMutation = useMutation({
    mutationFn: async (connections: string[]) => {
      const { error } = await supabase
        .from('professional_contacts')
        .update({ mutual_connections: connections })
        .eq('id', contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professional-contacts'] });
      toast({
        title: "Updated",
        description: "Mutual connections updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addMutualConnection = () => {
    if (!mutualConnectionName.trim()) return;
    
    const updated = [...mutualConnections, mutualConnectionName.trim()];
    setMutualConnections(updated);
    updateMutualConnectionsMutation.mutate(updated);
    setMutualConnectionName("");
    setIsDialogOpen(false);
  };

  const removeMutualConnection = (name: string) => {
    const updated = mutualConnections.filter(c => c !== name);
    setMutualConnections(updated);
    updateMutualConnectionsMutation.mutate(updated);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-6">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Mutual Connections
            </CardTitle>
            <CardDescription>
              People you both know who can strengthen this relationship
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Connection
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Mutual Connection</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Connection Name</Label>
                  <Input
                    value={mutualConnectionName}
                    onChange={(e) => setMutualConnectionName(e.target.value)}
                    placeholder="Enter name of mutual connection"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addMutualConnection();
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={addMutualConnection}
                  disabled={!mutualConnectionName.trim() || updateMutualConnectionsMutation.isPending}
                  className="w-full"
                >
                  {updateMutualConnectionsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Connection
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {mutualConnections.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {mutualConnections.map((connection, index) => (
              <Badge key={index} variant="secondary" className="pr-1">
                <Users className="h-3 w-3 mr-1" />
                {connection}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 ml-1 hover:bg-transparent"
                  onClick={() => removeMutualConnection(connection)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No mutual connections added yet</p>
            <p className="text-sm">Add people you both know to strengthen this connection</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
