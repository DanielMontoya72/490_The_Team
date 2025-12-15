import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, CalendarIcon, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCampaignDialog({ open, onOpenChange }: CreateCampaignDialogProps) {
  const queryClient = useQueryClient();
  const [campaignName, setCampaignName] = useState("");
  const [campaignType, setCampaignType] = useState("industry");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [targetCompanies, setTargetCompanies] = useState<string[]>([]);
  const [targetIndustries, setTargetIndustries] = useState<string[]>([]);
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [outreachTarget, setOutreachTarget] = useState("50");
  const [responseTarget, setResponseTarget] = useState("20");
  const [connectionTarget, setConnectionTarget] = useState("10");
  const [newItem, setNewItem] = useState("");

  const createCampaign = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('networking_campaigns')
        .insert({
          user_id: user.id,
          campaign_name: campaignName,
          campaign_type: campaignType,
          description,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
          target_companies: targetCompanies,
          target_industries: targetIndustries,
          target_roles: targetRoles,
          goals: {
            outreach_target: parseInt(outreachTarget) || 0,
            response_target: parseInt(responseTarget) || 0,
            connection_target: parseInt(connectionTarget) || 0
          },
          status: 'active'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['networking-campaigns'] });
      toast.success('Campaign created successfully!');
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create campaign');
    }
  });

  const resetForm = () => {
    setCampaignName("");
    setCampaignType("industry");
    setDescription("");
    setStartDate(new Date());
    setEndDate(undefined);
    setTargetCompanies([]);
    setTargetIndustries([]);
    setTargetRoles([]);
    setOutreachTarget("50");
    setResponseTarget("20");
    setConnectionTarget("10");
    setNewItem("");
  };

  const addItem = (type: 'companies' | 'industries' | 'roles') => {
    if (!newItem.trim()) return;
    
    if (type === 'companies') {
      setTargetCompanies([...targetCompanies, newItem.trim()]);
    } else if (type === 'industries') {
      setTargetIndustries([...targetIndustries, newItem.trim()]);
    } else {
      setTargetRoles([...targetRoles, newItem.trim()]);
    }
    setNewItem("");
  };

  const removeItem = (type: 'companies' | 'industries' | 'roles', index: number) => {
    if (type === 'companies') {
      setTargetCompanies(targetCompanies.filter((_, i) => i !== index));
    } else if (type === 'industries') {
      setTargetIndustries(targetIndustries.filter((_, i) => i !== index));
    } else {
      setTargetRoles(targetRoles.filter((_, i) => i !== index));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Create Networking Campaign</DialogTitle>
          <DialogDescription>
            Set up a targeted campaign to systematically build relationships
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4 px-1 pb-4">
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name *</Label>
              <Input
                id="name"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g., Tech Industry Outreach Q1 2025"
                className="focus-visible:ring-primary focus-visible:ring-offset-0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Campaign Type</Label>
              <Select value={campaignType} onValueChange={setCampaignType}>
                <SelectTrigger className="focus:ring-2 focus:ring-primary focus:ring-offset-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="industry">Industry Targeting</SelectItem>
                  <SelectItem value="company">Company Targeting</SelectItem>
                  <SelectItem value="role">Role Targeting</SelectItem>
                  <SelectItem value="custom">Custom Campaign</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your campaign goals and strategy..."
                rows={3}
                className="focus-visible:ring-primary focus-visible:ring-offset-0"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(startDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={startDate} onSelect={(date) => date && setStartDate(date)} />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "No end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {campaignType === 'company' && (
              <div className="space-y-2">
                <Label>Target Companies</Label>
                <div className="flex gap-2">
                  <Input
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    placeholder="Add a company..."
                    className="focus-visible:ring-primary focus-visible:ring-offset-0"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addItem('companies');
                      }
                    }}
                  />
                  <Button type="button" onClick={() => addItem('companies')} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {targetCompanies.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {targetCompanies.map((company, idx) => (
                      <div key={idx} className="flex items-center gap-1 bg-secondary px-3 py-1 rounded-full text-sm">
                        {company}
                        <button onClick={() => removeItem('companies', idx)} className="ml-1">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {campaignType === 'industry' && (
              <div className="space-y-2">
                <Label>Target Industries</Label>
                <div className="flex gap-2">
                  <Input
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    placeholder="Add an industry..."
                    className="focus-visible:ring-primary focus-visible:ring-offset-0"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addItem('industries');
                      }
                    }}
                  />
                  <Button type="button" onClick={() => addItem('industries')} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {targetIndustries.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {targetIndustries.map((industry, idx) => (
                      <div key={idx} className="flex items-center gap-1 bg-secondary px-3 py-1 rounded-full text-sm">
                        {industry}
                        <button onClick={() => removeItem('industries', idx)} className="ml-1">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {campaignType === 'role' && (
              <div className="space-y-2">
                <Label>Target Roles</Label>
                <div className="flex gap-2">
                  <Input
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    placeholder="Add a role..."
                    className="focus-visible:ring-primary focus-visible:ring-offset-0"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addItem('roles');
                      }
                    }}
                  />
                  <Button type="button" onClick={() => addItem('roles')} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {targetRoles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {targetRoles.map((role, idx) => (
                      <div key={idx} className="flex items-center gap-1 bg-secondary px-3 py-1 rounded-full text-sm">
                        {role}
                        <button onClick={() => removeItem('roles', idx)} className="ml-1">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3 pt-4 border-t">
              <Label className="text-base">Campaign Goals</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="outreach">Outreach Target</Label>
                  <Input
                    id="outreach"
                    type="number"
                    value={outreachTarget}
                    onChange={(e) => setOutreachTarget(e.target.value)}
                    min="1"
                    className="focus-visible:ring-primary focus-visible:ring-offset-0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="response">Response Target</Label>
                  <Input
                    id="response"
                    type="number"
                    value={responseTarget}
                    onChange={(e) => setResponseTarget(e.target.value)}
                    min="1"
                    className="focus-visible:ring-primary focus-visible:ring-offset-0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="connection">Connection Target</Label>
                  <Input
                    id="connection"
                    type="number"
                    value={connectionTarget}
                    onChange={(e) => setConnectionTarget(e.target.value)}
                    min="1"
                    className="focus-visible:ring-primary focus-visible:ring-offset-0"
                  />
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createCampaign.mutate()}
            disabled={!campaignName || createCampaign.isPending}
          >
            {createCampaign.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Campaign
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
