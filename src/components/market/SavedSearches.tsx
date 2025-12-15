import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Star, Trash2, Play } from "lucide-react";
import { toast } from "sonner";

interface SavedSearchesProps {
  onLoadSearch: (industry: string, location: string) => void;
}

export function SavedSearches({ onLoadSearch }: SavedSearchesProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  const { data: savedSearches } = useQuery({
    queryKey: ['saved-market-searches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_market_searches')
        .select('*')
        .order('is_favorite', { ascending: false })
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    }
  });

  const saveSearch = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const { error } = await supabase
        .from('saved_market_searches')
        .insert({
          user_id: user.id,
          search_name: searchName,
          industry,
          location
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-market-searches'] });
      toast.success("Search saved successfully!");
      setDialogOpen(false);
      setSearchName("");
      setIndustry("");
      setLocation("");
    },
    onError: () => {
      toast.error("Failed to save search");
    }
  });

  const toggleFavorite = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      const { error } = await supabase
        .from('saved_market_searches')
        .update({ is_favorite: !isFavorite, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-market-searches'] });
    }
  });

  const deleteSearch = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('saved_market_searches')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-market-searches'] });
      toast.success("Search deleted");
    }
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bookmark className="h-5 w-5" />
              Saved Searches
            </CardTitle>
            <CardDescription>Quick access to your market intelligence searches</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Bookmark className="h-4 w-4 mr-2" />
                Save New Search
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Market Search</DialogTitle>
                <DialogDescription>
                  Save your search parameters for quick access later
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="searchName">Search Name</Label>
                  <Input
                    id="searchName"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    placeholder="e.g., Tech Jobs in SF"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="searchIndustry">Industry</Label>
                  <Input
                    id="searchIndustry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g., Technology"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="searchLocation">Location</Label>
                  <Input
                    id="searchLocation"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., San Francisco (optional)"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => saveSearch.mutate()}
                  disabled={!searchName || !industry || saveSearch.isPending}
                >
                  {saveSearch.isPending ? "Saving..." : "Save Search"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {!savedSearches || savedSearches.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bookmark className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No saved searches yet</p>
            <p className="text-sm mt-1">Save searches for quick access</p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedSearches.map((search) => (
              <div
                key={search.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{search.search_name}</h4>
                    {search.is_favorite && (
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    )}
                  </div>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="secondary">{search.industry}</Badge>
                    {search.location && (
                      <Badge variant="outline">{search.location}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleFavorite.mutate({ id: search.id, isFavorite: search.is_favorite })}
                  >
                    <Star className={`h-4 w-4 ${search.is_favorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onLoadSearch(search.industry, search.location || "")}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteSearch.mutate(search.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}