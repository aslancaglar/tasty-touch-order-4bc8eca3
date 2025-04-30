
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  value?: string;
  onChange?: (url: string) => void;
  onImageUploaded?: (url: string) => void;  // Added this prop
  existingImageUrl?: string;  // Added this prop
  label?: string;
  uploadFolder?: string;
  clearable?: boolean;  // Added this prop
}

const ImageUpload = ({ 
  value, 
  onChange,
  onImageUploaded,
  existingImageUrl,
  label = "Image", 
  uploadFolder = "restaurant-covers",
  clearable = false
}: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  
  // Use value or existingImageUrl (for backward compatibility)
  const imageUrl = value || existingImageUrl || "";
  
  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${uploadFolder}/${fileName}`;
      
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        throw new Error("File must be an image.");
      }
      
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error("File size must be less than 2MB.");
      }

      // Upload file to Supabase storage
      const { data, error } = await supabase.storage
        .from('restaurant-images')
        .upload(filePath, file);

      if (error) throw error;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('restaurant-images')
        .getPublicUrl(filePath);

      // Set the image URL
      const publicUrl = publicUrlData.publicUrl;
      
      if (onChange) {
        onChange(publicUrl);
      }
      
      if (onImageUploaded) {
        onImageUploaded(publicUrl);
      }
      
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      // Clear the file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const removeImage = () => {
    if (onChange) {
      onChange("");
    }
    
    if (onImageUploaded) {
      onImageUploaded("");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {imageUrl && clearable && (
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={removeImage} 
            className="h-8 px-2 text-red-500 hover:text-red-700"
          >
            <X className="h-4 w-4 mr-1" />
            Remove
          </Button>
        )}
      </div>
      
      {imageUrl ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-md border">
          <img
            src={imageUrl}
            alt={label}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 text-center">
          <ImageIcon className="h-8 w-8 mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-2">
            Drag and drop or click to upload
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Recommended: 1200 x 600px (2:1 ratio)
          </p>
          <Button 
            type="button" 
            variant="outline" 
            disabled={uploading}
            className="relative"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Image
              </>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={uploadImage}
              disabled={uploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </Button>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
