import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, X, Filter, Bookmark } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface JobSearchFilterProps {
  onFilterChange: (filters: any) => void;
  onSearchChange: (search: string) => void;
  initialFilters?: any;
  initialSearch?: string;
}

export function JobSearchFilter({ onFilterChange, onSearchChange, initialFilters, initialSearch }: JobSearchFilterProps) {
  const [search, setSearch] = useState(initialSearch || '');
  const [showFilters, setShowFilters] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState(initialFilters || {
    status: '',
    industry: '',
    jobType: '',
    location: '',
    salaryMin: '',
    salaryMax: '',
    deadlineFrom: '',
    deadlineTo: ''
  });

  // Update when saved search is loaded
  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);

  useEffect(() => {
    if (initialFilters) {
      setFilters(initialFilters);
    }
  }, [initialFilters]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onSearchChange(value);
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleSaveSearch = async () => {
    if (!searchName.trim()) {
      toast.error('Please enter a name for this search');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('saved_search_preferences' as any)
        .insert([{
          user_id: user.id,
          name: searchName,
          filters: {
            ...filters,
            searchQuery: search
          }
        } as any]);

      if (error) throw error;

      toast.success('Search saved successfully');
      setSaveDialogOpen(false);
      setSearchName('');
    } catch (error) {
      console.error('Error saving search:', error);
      toast.error('Failed to save search');
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = () => {
    const emptyFilters = {
      status: '',
      industry: '',
      jobType: '',
      location: '',
      salaryMin: '',
      salaryMax: '',
      deadlineFrom: '',
      deadlineTo: ''
    };
    setFilters(emptyFilters);
    setSearch('');
    onFilterChange(emptyFilters);
    onSearchChange('');
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '') || search !== '';

  return (
    <Card className="p-4 mb-6">
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by job title, company, or keywords..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </CollapsibleTrigger>
        </Collapsible>
        {hasActiveFilters && (
          <>
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Bookmark className="h-4 w-4 mr-2" />
                  Save Search
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Search</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="search-name">Search Name</Label>
                    <Input
                      id="search-name"
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      placeholder="e.g., Senior Developer in Tech"
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setSaveDialogOpen(false)} disabled={saving}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveSearch} disabled={saving}>
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </>
        )}
      </div>

      <Collapsible open={showFilters} onOpenChange={setShowFilters}>
        <CollapsibleContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filters.status || "all"} onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="Interested">Interested</SelectItem>
                  <SelectItem value="Applied">Applied</SelectItem>
                  <SelectItem value="Phone Screen">Phone Screen</SelectItem>
                  <SelectItem value="Interview">Interview</SelectItem>
                  <SelectItem value="Interview Scheduled">Interview Scheduled</SelectItem>
                  <SelectItem value="Offer Received">Offer Received</SelectItem>
                  <SelectItem value="Accepted">Accepted</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                  <SelectItem value="Withdrawn">Withdrawn</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Job Type</Label>
              <Select value={filters.jobType || "all"} onValueChange={(value) => handleFilterChange('jobType', value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="Full-time">Full-time</SelectItem>
                  <SelectItem value="Part-time">Part-time</SelectItem>
                  <SelectItem value="Contract">Contract</SelectItem>
                  <SelectItem value="Freelance">Freelance</SelectItem>
                  <SelectItem value="Internship">Internship</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                placeholder="Filter by location"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Salary Min</Label>
              <Input
                type="number"
                placeholder="Min salary"
                value={filters.salaryMin}
                onChange={(e) => handleFilterChange('salaryMin', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Salary Max</Label>
              <Input
                type="number"
                placeholder="Max salary"
                value={filters.salaryMax}
                onChange={(e) => handleFilterChange('salaryMax', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Industry</Label>
              <Select value={filters.industry || "all"} onValueChange={(value) => handleFilterChange('industry', value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All industries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All industries</SelectItem>
                  <SelectItem value="Technology">Technology</SelectItem>
                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Education">Education</SelectItem>
                  <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="Retail">Retail</SelectItem>
                  <SelectItem value="Consulting">Consulting</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Deadline From</Label>
              <DatePicker
                date={filters.deadlineFrom ? new Date(filters.deadlineFrom) : null}
                onSelect={(date) => handleFilterChange('deadlineFrom', date ? date.toISOString().split('T')[0] : '')}
                placeholder="Select start date"
              />
            </div>

            <div className="space-y-2">
              <Label>Deadline To</Label>
              <DatePicker
                date={filters.deadlineTo ? new Date(filters.deadlineTo) : null}
                onSelect={(date) => handleFilterChange('deadlineTo', date ? date.toISOString().split('T')[0] : '')}
                placeholder="Select end date"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}