import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Star, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SavedSearchesManagerProps {
  currentFilters: any;
  currentSearchQuery: string;
  onLoadSearch: (filters: any, searchQuery: string) => void;
}

export function SavedSearchesManager({ currentFilters, currentSearchQuery, onLoadSearch }: SavedSearchesManagerProps) {
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [searchName, setSearchName] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSavedSearches();
  }, []);

  const fetchSavedSearches = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('saved_search_preferences' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedSearches(data || []);
    } catch (error) {
      console.error('Error fetching saved searches:', error);
    }
  };

  const handleSaveSearch = async () => {
    if (!searchName.trim()) {
      toast.error('Please enter a name for this search');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('saved_search_preferences' as any)
        .insert([{
          user_id: user.id,
          name: searchName,
          filters: {
            ...currentFilters,
            searchQuery: currentSearchQuery
          }
        } as any]);

      if (error) throw error;
      
      toast.success('Search saved successfully');
      setSearchName('');
      await fetchSavedSearches(); // Auto-refresh the list
    } catch (error) {
      console.error('Error saving search:', error);
      toast.error('Failed to save search');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSearch = (search: any) => {
    const filters = search.filters || {};
    const searchQuery = filters.searchQuery || '';
    delete filters.searchQuery;
    
    onLoadSearch(filters, searchQuery);
    toast.success(`Loaded search: ${search.name}`);
    setIsOpen(false);
  };

  const handleDeleteSearch = async (searchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this saved search?')) return;

    try {
      const { error } = await supabase
        .from('saved_search_preferences' as any)
        .delete()
        .eq('id', searchId);

      if (error) throw error;
      
      toast.success('Search deleted');
      fetchSavedSearches();
    } catch (error) {
      console.error('Error deleting search:', error);
      toast.error('Failed to delete search');
    }
  };

  const handleSetDefault = async (searchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Unset all defaults first
      await supabase
        .from('saved_search_preferences' as any)
        .update({ is_default: false } as any)
        .eq('user_id', user.id);

      // Set the selected one as default
      const { error } = await supabase
        .from('saved_search_preferences' as any)
        .update({ is_default: true } as any)
        .eq('id', searchId);

      if (error) throw error;
      
      toast.success('Set as default search');
      fetchSavedSearches();
    } catch (error) {
      console.error('Error setting default:', error);
      toast.error('Failed to set default');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-auto">
          <Save className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Saved Searches ({savedSearches.length})</span>
          <span className="sm:hidden">Saved ({savedSearches.length})</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Saved Searches</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 sm:space-y-6 pt-4 overflow-hidden">
          <div className="space-y-2 sm:space-y-3">
            <Label className="text-sm sm:text-base">Save Current Search</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Enter search name..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveSearch()}
                className="flex-1"
              />
              <Button 
                onClick={handleSaveSearch} 
                disabled={loading || !searchName.trim()} 
                className="bg-yellow-500 hover:bg-yellow-600 text-black w-full sm:w-auto"
              >
                Save
              </Button>
            </div>
          </div>

          <div className="space-y-2 sm:space-y-3 min-h-0 flex-1">
            <Label className="text-sm sm:text-base">Your Saved Searches</Label>
            <div className="max-h-[50vh] sm:max-h-[400px] overflow-y-auto space-y-2">
              {savedSearches.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm sm:text-base">
                  No saved searches yet
                </div>
              ) : (
                savedSearches.map((search) => (
                  <div
                    key={search.id}
                    className="flex items-center justify-between p-3 sm:p-4 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => handleLoadSearch(search)}
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm sm:text-lg truncate">{search.name}</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {new Date(search.created_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex gap-1 sm:gap-2 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleSetDefault(search.id, e)}
                        title={search.is_default ? "Default search" : "Set as default"}
                        className={`h-8 w-8 sm:h-10 sm:w-10 ${search.is_default ? "text-yellow-500" : ""}`}
                      >
                        <Star className={`h-4 w-4 sm:h-5 sm:w-5 ${search.is_default ? "fill-current" : ""}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDeleteSearch(search.id, e)}
                        className="h-8 w-8 sm:h-10 sm:w-10"
                      >
                        <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
