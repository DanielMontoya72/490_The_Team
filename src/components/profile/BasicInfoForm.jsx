import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ProfilePictureUpload } from "./ProfilePictureUpload";
import { User, Briefcase, MapPin } from "lucide-react";
import { INDUSTRIES } from "@/data/seedData";

const EXPERIENCE_LEVELS = ["Entry", "Mid", "Senior", "Executive"];

export const BasicInfoForm = ({ userId }) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
    headline: "",
    bio: "",
    industry: "",
    experienceLevel: "",
    profilePictureUrl: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('users-me', {
        method: 'GET',
      });

      if (error) throw error;

      if (data?.data) {
        const profile = data.data;
        setFormData({
          firstName: profile.first_name || "",
          lastName: profile.last_name || "",
          email: profile.email || "",
          phone: profile.phone || "",
          location: profile.location || "",
          headline: profile.headline || "",
          bio: profile.bio || "",
          industry: profile.industry || "",
          experienceLevel: profile.experience_level || "",
          profilePictureUrl: profile.profile_picture_url || null
        });
        setCharCount(profile.bio?.length || 0);
      }
    } catch (error) {
      toast.error("Failed to load profile");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'bio') {
      if (value.length <= 500) {
        setFormData(prev => ({ ...prev, [name]: value }));
        setCharCount(value.length);
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('users-me', {
        method: 'PUT',
        body: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          location: formData.location,
          headline: formData.headline,
          bio: formData.bio,
          industry: formData.industry,
          experience_level: formData.experienceLevel,
          profile_picture_url: formData.profilePictureUrl,
        },
      });

      if (error) throw error;
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Profile Picture Section */}
      <Card className="animate-fade-in">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Profile Picture
          </CardTitle>
          <CardDescription className="text-base">Upload a professional profile picture</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          <ProfilePictureUpload
            userId={userId}
            currentPictureUrl={formData.profilePictureUrl}
            onUploadSuccess={(url) => setFormData(prev => ({ ...prev, profilePictureUrl: url }))}
          />
        </CardContent>
      </Card>

      {/* Personal Information Section */}
      <Card className="animate-fade-in" style={{ animationDelay: '100ms' }}>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Personal Information
          </CardTitle>
          <CardDescription className="text-base">Your name and professional details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm font-medium">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="John"
                required
                className="touch-target"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm font-medium">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Doe"
                required
                className="touch-target"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="headline" className="text-sm font-medium">
              Professional Headline
            </Label>
            <Input
              id="headline"
              name="headline"
              placeholder="e.g., Senior Software Engineer at Tech Corp"
              value={formData.headline}
              onChange={handleChange}
              className="touch-target"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio" className="text-sm font-medium">
              Bio / Summary
            </Label>
            <Textarea
              id="bio"
              name="bio"
              placeholder="Tell us about yourself, your experience, and what makes you unique..."
              value={formData.bio}
              onChange={handleChange}
              rows={5}
              className="resize-none"
            />
            <p className={`text-xs text-right transition-colors ${
              charCount > 450 ? 'text-destructive' : 'text-muted-foreground'
            }`}>
              {charCount} / 500 characters
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information Section */}
      <Card className="animate-fade-in" style={{ animationDelay: '200ms' }}>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Contact Information
          </CardTitle>
          <CardDescription className="text-base">How employers can reach you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john.doe@example.com"
                required
                className="touch-target"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">
                Phone
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="(555) 123-4567"
                className="touch-target"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="text-sm font-medium">
              Location (City, State)
            </Label>
            <Input
              id="location"
              name="location"
              placeholder="e.g., San Francisco, CA"
              value={formData.location}
              onChange={handleChange}
              className="touch-target"
            />
          </div>
        </CardContent>
      </Card>

      {/* Professional Details Section */}
      <Card className="animate-fade-in" style={{ animationDelay: '300ms' }}>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Professional Details
          </CardTitle>
          <CardDescription className="text-base">Your industry and experience level</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industry" className="text-sm font-medium">
                Industry
              </Label>
              <Select
                value={formData.industry}
                onValueChange={(value) => setFormData(prev => ({ ...prev, industry: value }))}
              >
                <SelectTrigger className="bg-background touch-target min-h-[48px] px-4 py-3">
                  <SelectValue placeholder="Select industry" className="pr-10 min-w-[140px]" style={{lineHeight: '2.5rem'}} />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {INDUSTRIES.map(industry => (
                    <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="experienceLevel" className="text-sm font-medium">
                Experience Level
              </Label>
              <Select
                value={formData.experienceLevel}
                onValueChange={(value) => setFormData(prev => ({ ...prev, experienceLevel: value }))}
              >
                <SelectTrigger className="bg-background touch-target min-h-[48px] px-4 py-3">
                  <SelectValue placeholder="Select level" style={{lineHeight: '2.5rem'}} />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {EXPERIENCE_LEVELS.map(level => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button 
          type="submit" 
          disabled={isLoading}
          className="touch-target flex-1 sm:flex-initial"
          size="lg"
        >
          {isLoading ? "Saving..." : "Save Profile"}
        </Button>
        <Button 
          className="touch-target flex-1 sm:flex-initial"
          size="lg"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
};
