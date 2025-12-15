import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Upload, X, Loader2, ImageIcon, ChevronDown } from "lucide-react";

export const ProfilePictureUpload = ({ userId, currentPictureUrl, onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentPictureUrl);
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Keep preview in sync when parent updates currentPictureUrl (e.g., after refetch)
  useEffect(() => {
    setPreviewUrl(currentPictureUrl || null);
  }, [currentPictureUrl]);

  const uploadFile = async (file) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a JPG, PNG, or GIF image');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload to Supabase Storage
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      // Update user profile with new picture URL
      const { error: updateError } = await supabase.functions.invoke('users-me', {
        method: 'PUT',
        body: { profile_picture_url: publicUrl },
      });

      if (updateError) throw updateError;

      toast.success('Profile picture uploaded successfully!');
      onUploadSuccess?.(publicUrl);
      setIsOpen(false);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload profile picture');
      setPreviewUrl(currentPictureUrl);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    setIsDragging(false);
    
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemove = async () => {
    try {
      const { error } = await supabase.functions.invoke('users-me', {
        method: 'PUT',
        body: { profile_picture_url: null },
      });

      if (error) throw error;

      setPreviewUrl(null);
      toast.success('Profile picture removed');
      onUploadSuccess?.(null);
    } catch (error) {
      toast.error('Failed to remove profile picture');
    }
  };

  const initials = userId ? userId.substring(0, 2).toUpperCase() : 'U';

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative flex-shrink-0">
        <Avatar className="h-32 w-32 border-4 border-primary/20 shadow-lg">
          <AvatarImage src={previewUrl} alt="Profile" className="object-cover" />
          <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </div>
      
      <div className="flex flex-col gap-4 text-center">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="default"
              disabled={uploading}
              className="touch-target w-full sm:w-auto"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Picture
              <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="mt-4">
            <div className="space-y-4">
              {/* Drag and Drop Area */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
                  isDragging 
                    ? 'border-primary bg-primary/10' 
                    : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif"
                  onChange={handleFileSelect}
                  className="hidden"
                  aria-label="Upload profile picture"
                />
                
                <div className="flex flex-col items-center gap-3">
                  {uploading ? (
                    <>
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                      <p className="text-sm font-medium">Uploading...</p>
                    </>
                  ) : (
                    <>
                      <div className="p-3 bg-primary/10 rounded-full">
                        <ImageIcon className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          Drag & drop your image here
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          or click to browse
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Guidelines */}
              <div className="space-y-2 bg-muted/50 p-4 rounded-lg">
                <p className="text-sm font-medium text-foreground">
                  Profile Picture Guidelines:
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Accepted formats: JPG, PNG, GIF</li>
                  <li>• Maximum file size: 5MB</li>
                  <li>• Recommended: Square image, 400x400px or larger</li>
                  <li>• Use a professional, clear headshot</li>
                </ul>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {previewUrl && !uploading && (
          <Button
            type="button"
            variant="ghost"
            size="default"
            onClick={handleRemove}
            className="touch-target text-destructive hover:text-destructive hover:bg-destructive/10 w-full sm:w-auto"
          >
            <X className="mr-2 h-4 w-4" />
            Remove Picture
          </Button>
        )}
      </div>
    </div>
  );
};
