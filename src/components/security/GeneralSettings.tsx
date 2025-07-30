import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, Trash2, Image as ImageIcon, Plus, Star, Loader2 } from 'lucide-react';
import { useRestaurantLanguages } from '@/hooks/useRestaurantLanguages';

interface GeneralSettingsProps {
  restaurantId?: string;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ restaurantId }) => {
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const { toast } = useToast();
  
  const {
    languages,
    restaurantLanguages,
    loading,
    addRestaurantLanguage,
    removeRestaurantLanguage,
    setDefaultLanguage,
    updateLanguageFlag,
  } = useRestaurantLanguages(restaurantId);

  const handleFileUpload = async (file: File, languageCode: string) => {
    if (!restaurantId) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${restaurantId}/${languageCode}.${fileExt}`;

    try {
      setUploading(prev => ({ ...prev, [languageCode]: true }));

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Only image files are allowed');
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('language-flags')
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('language-flags')
        .getPublicUrl(fileName);

      // Update language flag URL
      const success = await updateLanguageFlag(languageCode, publicUrl);
      
      if (success) {
        toast({
          title: "Success",
          description: `Flag uploaded successfully`,
        });
      }
    } catch (error) {
      console.error('Error uploading flag:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload flag",
        variant: "destructive",
      });
    } finally {
      setUploading(prev => ({ ...prev, [languageCode]: false }));
    }
  };

  const handleDeleteFlag = async (languageCode: string) => {
    if (!restaurantId) return;

    const language = languages.find(l => l.code === languageCode);
    if (!language?.flag_url) return;

    try {
      // Extract filename from URL
      const url = new URL(language.flag_url);
      const fileName = url.pathname.split('/').pop();
      
      if (fileName) {
        // Delete from storage
        const { error: deleteError } = await supabase.storage
          .from('language-flags')
          .remove([`${restaurantId}/${fileName}`]);

        if (deleteError) throw deleteError;
      }

      // Update language flag URL to null
      const success = await updateLanguageFlag(languageCode, null);
      
      if (success) {
        toast({
          title: "Success",
          description: `Flag deleted successfully`,
        });
      }
    } catch (error) {
      console.error('Error deleting flag:', error);
      toast({
        title: "Error",
        description: "Failed to delete flag",
        variant: "destructive",
      });
    }
  };

  const handleAddLanguage = async () => {
    if (!selectedLanguage) return;
    
    const success = await addRestaurantLanguage(selectedLanguage, restaurantLanguages.length === 0);
    if (success) {
      setSelectedLanguage('');
    }
  };

  const getAvailableLanguages = () => {
    const usedLanguageCodes = restaurantLanguages.map(rl => rl.language_code);
    return languages.filter(lang => !usedLanguageCodes.includes(lang.code));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Restaurant Languages Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Restaurant Languages</CardTitle>
          <CardDescription>
            Configure which languages are available for your restaurant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add new language */}
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a language to add" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableLanguages().map((language) => (
                    <SelectItem key={language.code} value={language.code}>
                      {language.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleAddLanguage} 
              disabled={!selectedLanguage}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Language
            </Button>
          </div>

          {/* Active languages */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Active Languages</Label>
            {restaurantLanguages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No languages configured</p>
            ) : (
              <div className="space-y-2">
                {restaurantLanguages.map((restLang) => (
                  <div key={restLang.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-8 border rounded flex items-center justify-center overflow-hidden">
                        {restLang.language?.flag_url ? (
                          <img
                            src={restLang.language.flag_url}
                            alt={`${restLang.language.name} flag`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">
                            {restLang.language?.name}
                          </span>
                          {restLang.is_default && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="w-3 h-3 mr-1" />
                              Default
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {restLang.language_code}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {!restLang.is_default && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDefaultLanguage(restLang.language_code)}
                        >
                          Set Default
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeRestaurantLanguage(restLang.language_code)}
                        disabled={restaurantLanguages.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Language Flags */}
      <Card>
        <CardHeader>
          <CardTitle>Language Flags</CardTitle>
          <CardDescription>
            Upload custom flag icons for languages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {languages.map((language) => {
            const isUploading = uploading[language.code];

            return (
              <div key={language.code} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-8 border rounded flex items-center justify-center overflow-hidden">
                    {language.flag_url ? (
                      <img
                        src={language.flag_url}
                        alt={`${language.name} flag`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium">
                      {language.name}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {language.flag_url ? 'Custom flag uploaded' : 'No custom flag'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(file, language.code);
                        }
                      }}
                      disabled={isUploading}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      {isUploading ? 'Uploading...' : 'Upload'}
                    </Button>
                  </div>
                  
                  {language.flag_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteFlag(language.code)}
                      disabled={isUploading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};