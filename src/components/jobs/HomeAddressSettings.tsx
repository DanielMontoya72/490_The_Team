import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Home, MapPin, Loader2, Check, X, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HomeAddressSettingsProps {
  onSave?: () => void;
}

export function HomeAddressSettings({ onSave }: HomeAddressSettingsProps) {
  const [address, setAddress] = useState('');
  const [savedAddress, setSavedAddress] = useState<{
    address: string;
    latitude: number;
    longitude: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeResult, setGeocodeResult] = useState<{
    display_name: string;
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    fetchHomeAddress();
  }, []);

  const fetchHomeAddress = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('user_home_addresses')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching home address:', error);
        return;
      }

      if (data) {
        setSavedAddress({
          address: data.address,
          latitude: data.latitude || 0,
          longitude: data.longitude || 0,
        });
        setAddress(data.address);
      }
    } catch (error) {
      console.error('Error fetching home address:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeocode = async () => {
    if (!address.trim()) {
      toast.error('Please enter an address');
      return;
    }

    setGeocoding(true);
    setGeocodeResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('geocode-location', {
        body: { action: 'geocode', location: address },
      });

      if (error) throw error;

      if (data?.success && data.data) {
        setGeocodeResult({
          display_name: data.data.display_name,
          latitude: data.data.latitude,
          longitude: data.data.longitude,
        });
      } else {
        toast.error('Could not find this address. Please try a more specific address.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast.error('Failed to verify address');
    } finally {
      setGeocoding(false);
    }
  };

  const handleSave = async () => {
    if (!geocodeResult) {
      toast.error('Please verify your address first');
      return;
    }

    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_home_addresses')
        .upsert({
          user_id: session.user.id,
          address: address.trim(),
          latitude: geocodeResult.latitude,
          longitude: geocodeResult.longitude,
          is_primary: true,
        }, { onConflict: 'user_id' });

      if (error) throw error;

      setSavedAddress({
        address: address.trim(),
        latitude: geocodeResult.latitude,
        longitude: geocodeResult.longitude,
      });

      toast.success('Home address saved successfully');
      onSave?.();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save home address');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('user_home_addresses')
        .delete()
        .eq('user_id', session.user.id);

      if (error) throw error;

      setAddress('');
      setSavedAddress(null);
      setGeocodeResult(null);
      toast.success('Home address removed');
      onSave?.();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to remove home address');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="h-5 w-5" />
          Home Address
        </CardTitle>
        <CardDescription>
          Set your home address to calculate commute distances and times for job locations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {savedAddress && !geocodeResult && (
          <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
            <MapPin className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Current Address</p>
              <p className="text-sm text-muted-foreground">{savedAddress.address}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Coordinates: {savedAddress.latitude.toFixed(4)}, {savedAddress.longitude.toFixed(4)}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="address">
            {savedAddress ? 'Update Address' : 'Enter Your Home Address'}
          </Label>
          <div className="flex gap-2">
            <Input
              id="address"
              placeholder="e.g., 123 Main St, New York, NY 10001"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setGeocodeResult(null);
              }}
              className="flex-1"
            />
            <Button
              variant="secondary"
              onClick={handleGeocode}
              disabled={geocoding || !address.trim()}
            >
              {geocoding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Verify'
              )}
            </Button>
          </div>
        </div>

        {geocodeResult && (
          <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-start gap-2">
              <Check className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-green-800 dark:text-green-200">Address Verified</p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {geocodeResult.display_name}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <span>Your address is stored securely and only used for commute calculations.</span>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={saving || !geocodeResult}
            className="flex-1"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Save Address
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
