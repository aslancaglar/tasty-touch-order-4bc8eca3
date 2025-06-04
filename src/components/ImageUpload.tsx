
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  value?: string;
  onChange?: (url: string) => void;
  onImageUploaded?: (url: string) => void;
  existingImageUrl?: string;
  label?: string;
  uploadFolder?: string;
  clearable?: boolean;
}

// Security constants for file validation
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/gif'
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

// Enhanced security validation functions
const validateFileType = (file: File): boolean => {
  return ALLOWED_MIME_TYPES.includes(file.type.toLowerCase());
};

const validateFileExtension = (fileName: string): boolean => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return extension ? ALLOWED_EXTENSIONS.includes(extension) : false;
};

const validateFileSize = (file: File): boolean => {
  return file.size <= MAX_FILE_SIZE;
};

const sanitizeFileName = (fileName: string): string => {
  // Remove potentially dangerous characters and limit length
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .substring(0, 100);
};

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
  
  const imageUrl = value || existingImageUrl || "";
  
  const logSecurityEvent = (event: string, details: any) => {
    console.warn(`[Security] Image Upload: ${event}`, {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      ...details
    });
  };
  
  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      const file = event.target.files[0];
      
      // Enhanced security validations
      if (!validateFileType(file)) {
        logSecurityEvent("Invalid file type attempt", { 
          fileType: file.type, 
          fileName: file.name 
        });
        throw new Error(`Invalid file type. Only ${ALLOWED_MIME_TYPES.join(', ')} are allowed.`);
      }
      
      if (!validateFileExtension(file.name)) {
        logSecurityEvent("Invalid file extension attempt", { 
          fileName: file.name 
        });
        throw new Error(`Invalid file extension. Only ${ALLOWED_EXTENSIONS.join(', ')} files are allowed.`);
      }
      
      if (!validateFileSize(file)) {
        logSecurityEvent("File size exceeded", { 
          fileSize: file.size, 
          maxSize: MAX_FILE_SIZE 
        });
        throw new Error(`File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
      }

      // Create secure filename
      const sanitizedName = sanitizeFileName(file.name);
      const fileExt = sanitizedName.split('.').pop();
      const secureFileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${uploadFolder}/${secureFileName}`;
      
      console.log(`[ImageUpload] Uploading secure file: ${secureFileName}`);

      // Upload file to Supabase storage
      const { data, error } = await supabase.storage
        .from('restaurant-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false // Prevent overwriting existing files
        });

      if (error) {
        logSecurityEvent("Upload failed", { error: error.message });
        throw error;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('restaurant-images')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;
      
      if (onChange) {
        onChange(publicUrl);
      }
      
      if (onImageUploaded) {
        onImageUploaded(publicUrl);
      }
      
      console.log(`[ImageUpload] Successfully uploaded: ${secureFileName}`);
      
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error: any) {
      console.error("Error uploading image:", error);
      
      // Standardized error handling
      const errorMessage = error?.message || "Failed to upload image";
      
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      // Clear the file input for security
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
            onError={(e) => {
              console.error("Failed to load image:", imageUrl);
              // Could implement fallback image here
            }}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 text-center">
          <ImageIcon className="h-8 w-8 mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-2">
            Drag and drop or click to upload
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Recommended: 1200 x 600px (2:1 ratio) • Max 5MB • JPG, PNG, WebP
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
              accept={ALLOWED_MIME_TYPES.join(',')}
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
