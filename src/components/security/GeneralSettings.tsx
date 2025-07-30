import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SupportedLanguage, LANGUAGE_NAMES } from '@/utils/language-utils';
import { Loader2, Upload, Trash2 } from 'lucide-react';

interface LanguageSetting {
  id: string;
  restaurant_id: string;
  language: SupportedLanguage;
  flag_url: string | null;
}

interface GeneralSettingsProps {
  restaurantId?: string;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ restaurantId }) => {
  const [languageSettings, setLanguageSettings] = useState<LanguageSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const { toast } = useToast();

  const languages: SupportedLanguage[] = ['fr', 'en', 'tr'];

  useEffect(() => {
    if (restaurantId) {
      fetchLanguageSettings();
    }
  }, [restaurantId]);

  const fetchLanguageSettings = async () => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('language_settings')
        .select('*')
        .eq('restaurant_id', restaurantId);

      if (error) throw error;

      setLanguageSettings((data || []) as LanguageSetting[]);
    } catch (error) {
      console.error('Error fetching language settings:', error);
      toast({
        title: "Error",
        description: "Failed to load language settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, language: SupportedLanguage) => {
    const file = event.target.files?.[0];
    if (!file || !restaurantId) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(language);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${restaurantId}/${language}.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('language-flags')
        .upload(fileName, file, {
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('language-flags')
        .getPublicUrl(fileName);

      // Update or insert language setting
      const { error: upsertError } = await supabase
        .from('language_settings')
        .upsert({
          restaurant_id: restaurantId,
          language,
          flag_url: urlData.publicUrl,
        }, {
          onConflict: 'restaurant_id,language'
        });

      if (upsertError) throw upsertError;

      await fetchLanguageSettings();
      
      toast({
        title: "Success",
        description: `Flag for ${LANGUAGE_NAMES[language]} uploaded successfully`,
      });
    } catch (error) {
      console.error('Error uploading flag:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload flag image",
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  const handleDeleteFlag = async (language: SupportedLanguage) => {
    if (!restaurantId) return;
    
    try {
      const setting = languageSettings.find(s => s.language === language);
      if (!setting) return;

      // Delete from storage
      const fileName = `${restaurantId}/${language}`;
      await supabase.storage
        .from('language-flags')
        .remove([fileName]);

      // Update database
      const { error } = await supabase
        .from('language_settings')
        .update({ flag_url: null })
        .eq('restaurant_id', restaurantId)
        .eq('language', language);

      if (error) throw error;

      await fetchLanguageSettings();
      
      toast({
        title: "Success",
        description: `Flag for ${LANGUAGE_NAMES[language]} removed successfully`,
      });
    } catch (error) {
      console.error('Error deleting flag:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete flag image",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Language Flags</CardTitle>
        <CardDescription>
          Upload custom flag icons for each language. These will appear on the welcome page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {languages.map((language) => {
          const setting = languageSettings.find(s => s.language === language);
          const isUploading = uploading === language;
          
          return (
            <div key={language} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-8 border rounded overflow-hidden bg-gray-100">
                  {setting?.flag_url ? (
                    <img 
                      src={setting.flag_url} 
                      alt={`${LANGUAGE_NAMES[language]} flag`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                      No flag
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium">{LANGUAGE_NAMES[language]}</Label>
                  <p className="text-xs text-gray-500">{language.toUpperCase()}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, language)}
                  className="hidden"
                  id={`flag-upload-${language}`}
                  disabled={isUploading}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById(`flag-upload-${language}`)?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {isUploading ? 'Uploading...' : 'Upload'}
                </Button>
                
                {setting?.flag_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteFlag(language)}
                    disabled={isUploading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};