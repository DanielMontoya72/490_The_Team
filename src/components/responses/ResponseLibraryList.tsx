import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Star, StarOff, Edit, Trash2, History, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { AddResponseDialog } from "./AddResponseDialog";
import { EditResponseDialog } from "./EditResponseDialog";
import { ResponseVersionHistory } from "./ResponseVersionHistory";

interface ResponseItem {
  id: string;
  question: string;
  question_type: string;
  current_response: string | null;
  tags: string[];
  skills: string[];
  companies_used_for: string[];
  experiences_referenced: string[];
  success_count: number;
  usage_count: number;
  effectiveness_score: number;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export function ResponseLibraryList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [questionTypeFilter, setQuestionTypeFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingResponse, setEditingResponse] = useState<ResponseItem | null>(null);
  const [viewingHistory, setViewingHistory] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: responses, isLoading } = useQuery({
    queryKey: ['response-library'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('interview_response_library')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as ResponseItem[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('interview_response_library')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['response-library'] });
      toast.success('Response deleted');
    },
    onError: () => toast.error('Failed to delete response'),
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      const { error } = await supabase
        .from('interview_response_library')
        .update({ is_favorite: !isFavorite })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['response-library'] });
    },
  });

  const filteredResponses = responses?.filter(response => {
    const matchesSearch = searchQuery === "" || 
      response.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      response.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      response.skills?.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = questionTypeFilter === "all" || response.question_type === questionTypeFilter;
    
    return matchesSearch && matchesType;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'behavioral': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'technical': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'situational': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted rounded-lg" />)}
    </div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search questions, tags, or skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Response
        </Button>
      </div>

      <Tabs value={questionTypeFilter} onValueChange={setQuestionTypeFilter}>
        <TabsList>
          <TabsTrigger value="all">All ({responses?.length || 0})</TabsTrigger>
          <TabsTrigger value="behavioral">
            Behavioral ({responses?.filter(r => r.question_type === 'behavioral').length || 0})
          </TabsTrigger>
          <TabsTrigger value="technical">
            Technical ({responses?.filter(r => r.question_type === 'technical').length || 0})
          </TabsTrigger>
          <TabsTrigger value="situational">
            Situational ({responses?.filter(r => r.question_type === 'situational').length || 0})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredResponses?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No responses found. Start building your library!</p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Response
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredResponses?.map((response) => (
            <Card key={response.id} className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getTypeColor(response.question_type)}>
                        {response.question_type}
                      </Badge>
                      {response.success_count > 0 && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {response.success_count} success{response.success_count > 1 ? 'es' : ''}
                        </Badge>
                      )}
                      {response.usage_count > 0 && (
                        <Badge variant="outline">
                          Used {response.usage_count}x
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg">{response.question}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleFavoriteMutation.mutate({ id: response.id, isFavorite: response.is_favorite })}
                    >
                      {response.is_favorite ? (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      ) : (
                        <StarOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setViewingHistory(response.id)}>
                      <History className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setEditingResponse(response)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => deleteMutation.mutate(response.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {response.current_response && (
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                    {response.current_response}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {response.skills?.map((skill, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {response.companies_used_for?.map((company, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {company}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddResponseDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
      
      {editingResponse && (
        <EditResponseDialog 
          response={editingResponse} 
          open={!!editingResponse} 
          onOpenChange={(open) => !open && setEditingResponse(null)} 
        />
      )}

      {viewingHistory && (
        <ResponseVersionHistory 
          responseId={viewingHistory} 
          open={!!viewingHistory} 
          onOpenChange={(open) => !open && setViewingHistory(null)} 
        />
      )}
    </div>
  );
}
