import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Palette, Loader2, Image, Globe, Mail } from "lucide-react";

interface BrandingSettingsProps {
  organizationId: string;
}

export function BrandingSettings({ organizationId }: BrandingSettingsProps) {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState({
    logo_url: '',
    primary_color: '#6366f1',
    secondary_color: '#8b5cf6',
    accent_color: '#22c55e',
    custom_domain: '',
    custom_email_from: '',
    email_footer_text: '',
    landing_page_title: '',
    landing_page_description: '',
    hide_lovable_branding: false,
    custom_css: '',
  });

  const { data: existingBranding, isLoading } = useQuery({
    queryKey: ['organization-branding', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_branding')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  useEffect(() => {
    if (existingBranding) {
      setSettings({
        logo_url: existingBranding.logo_url || '',
        primary_color: existingBranding.primary_color || '#6366f1',
        secondary_color: existingBranding.secondary_color || '#8b5cf6',
        accent_color: existingBranding.accent_color || '#22c55e',
        custom_domain: existingBranding.custom_domain || '',
        custom_email_from: existingBranding.custom_email_from || '',
        email_footer_text: existingBranding.email_footer_text || '',
        landing_page_title: existingBranding.landing_page_title || '',
        landing_page_description: existingBranding.landing_page_description || '',
        hide_lovable_branding: existingBranding.hide_lovable_branding || false,
        custom_css: existingBranding.custom_css || '',
      });
    }
  }, [existingBranding]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('organization_branding')
        .upsert({
          organization_id: organizationId,
          ...settings,
        }, { onConflict: 'organization_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-branding'] });
      toast.success("Branding settings saved!");
    },
    onError: () => {
      toast.error("Failed to save branding settings");
    },
  });

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            White-Label Branding
          </CardTitle>
          <CardDescription>
            Customize the appearance for your organization's job seekers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Logo URL
            </Label>
            <Input
              placeholder="https://example.com/logo.png"
              value={settings.logo_url}
              onChange={(e) => setSettings(s => ({ ...s, logo_url: e.target.value }))}
            />
            {settings.logo_url && (
              <div className="mt-2 p-4 border rounded-lg bg-muted/50">
                <img 
                  src={settings.logo_url} 
                  alt="Logo preview" 
                  className="max-h-16 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* Colors */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={settings.primary_color}
                  onChange={(e) => setSettings(s => ({ ...s, primary_color: e.target.value }))}
                  className="w-12 h-10 p-1"
                />
                <Input
                  value={settings.primary_color}
                  onChange={(e) => setSettings(s => ({ ...s, primary_color: e.target.value }))}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={settings.secondary_color}
                  onChange={(e) => setSettings(s => ({ ...s, secondary_color: e.target.value }))}
                  className="w-12 h-10 p-1"
                />
                <Input
                  value={settings.secondary_color}
                  onChange={(e) => setSettings(s => ({ ...s, secondary_color: e.target.value }))}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Accent Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={settings.accent_color}
                  onChange={(e) => setSettings(s => ({ ...s, accent_color: e.target.value }))}
                  className="w-12 h-10 p-1"
                />
                <Input
                  value={settings.accent_color}
                  onChange={(e) => setSettings(s => ({ ...s, accent_color: e.target.value }))}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Custom Domain */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Custom Domain
            </Label>
            <Input
              placeholder="careers.youruniversity.edu"
              value={settings.custom_domain}
              onChange={(e) => setSettings(s => ({ ...s, custom_domain: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Contact support to configure DNS for your custom domain
            </p>
          </div>

          {/* Email Settings */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Customization
            </h4>
            
            <div className="space-y-2">
              <Label>From Email Address</Label>
              <Input
                placeholder="careers@youruniversity.edu"
                value={settings.custom_email_from}
                onChange={(e) => setSettings(s => ({ ...s, custom_email_from: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Email Footer Text</Label>
              <Textarea
                placeholder="© 2025 Your University Career Services"
                value={settings.email_footer_text}
                onChange={(e) => setSettings(s => ({ ...s, email_footer_text: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          {/* Landing Page */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium">Landing Page Customization</h4>
            
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Your Career Journey Starts Here"
                value={settings.landing_page_title}
                onChange={(e) => setSettings(s => ({ ...s, landing_page_title: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Welcome to our career services platform..."
                value={settings.landing_page_description}
                onChange={(e) => setSettings(s => ({ ...s, landing_page_description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          {/* Advanced */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium">Advanced Settings</h4>

            <div className="flex items-center justify-between">
              <Label htmlFor="hideBranding" className="flex flex-col">
                <span>Hide Platform Branding</span>
                <span className="text-xs text-muted-foreground font-normal">
                  Remove "Powered by" attribution (Enterprise only)
                </span>
              </Label>
              <Switch
                id="hideBranding"
                checked={settings.hide_lovable_branding}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, hide_lovable_branding: checked }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Custom CSS (Advanced)</Label>
              <Textarea
                placeholder=".custom-class { color: red; }"
                value={settings.custom_css}
                onChange={(e) => setSettings(s => ({ ...s, custom_css: e.target.value }))}
                rows={4}
                className="font-mono text-sm"
              />
            </div>
          </div>

          <Button 
            onClick={() => saveMutation.mutate()} 
            disabled={saveMutation.isPending}
            className="w-full"
          >
            {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Branding Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
