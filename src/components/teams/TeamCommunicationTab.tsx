import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageSquare, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface TeamCommunicationTabProps {
  teamId: string;
}

interface TeamNote {
  id: string;
  content: string;
  created_at: string;
  created_by: string;
  user_name?: string;
}

export const TeamCommunicationTab = ({ teamId }: TeamCommunicationTabProps) => {
  const [notes, setNotes] = useState<TeamNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [teamId]);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from("team_communication")
        .select("id, content, created_at, created_by")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user names separately
      const notesWithNames = await Promise.all(
        (data || []).map(async (note) => {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("first_name, last_name")
            .eq("user_id", note.created_by)
            .single();

          return {
            ...note,
            user_name: profile
              ? `${profile.first_name} ${profile.last_name}`.trim()
              : "Unknown User",
          };
        })
      );

      setNotes(notesWithNames);
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("team_communication")
        .insert({
          team_id: teamId,
          content: newNote,
          created_by: user.id,
        });

      if (error) throw error;

      toast.success("Note added");
      setNewNote("");
      fetchNotes();
    } catch (error) {
      toast.error("Failed to add note");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Team Notes & Updates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder="Share an update, note, or message with the team..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
            />
            <Button onClick={handleAddNote} disabled={loading || !newNote.trim()}>
              <Send className="h-4 w-4 mr-2" />
              Post Note
            </Button>
          </div>

          <div className="space-y-3 mt-6">
            {notes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No team notes yet. Start the conversation!
              </p>
            ) : (
              notes.map((note) => (
                <Card key={note.id}>
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{note.user_name || "Unknown User"}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm">{note.content}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
