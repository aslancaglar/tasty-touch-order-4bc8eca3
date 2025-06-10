
import React from 'react';
import { useSecureForm } from '@/hooks/useSecureForm';
import { SecureInput } from '@/components/ui/secure-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface SecureFormField {
  name: string;
  label: string;
  type: 'text' | 'name' | 'description' | 'email' | 'url' | 'number';
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  allowDecimals?: boolean;
}

interface SecureFormProps {
  fields: SecureFormField[];
  onSubmit: (data: Record<string, any>) => Promise<void> | void;
  submitLabel?: string;
  enableCSRF?: boolean;
  className?: string;
}

const SecureForm: React.FC<SecureFormProps> = ({
  fields,
  onSubmit,
  submitLabel = "Submit",
  enableCSRF = true,
  className = ""
}) => {
  const [formData, setFormData] = React.useState<Record<string, any>>({});

  // Create schema from fields
  const schema = React.useMemo(() => {
    const schemaObj: Record<string, any> = {};
    fields.forEach(field => {
      schemaObj[field.name] = {
        type: field.type,
        required: field.required,
        min: field.min,
        max: field.max,
        allowDecimals: field.allowDecimals,
      };
    });
    return schemaObj;
  }, [fields]);

  const {
    csrfToken,
    isSubmitting,
    errors,
    validateField,
    handleSubmit,
  } = useSecureForm({
    schema,
    onSubmit,
    enableCSRF,
  });

  const handleInputChange = (name: string, value: string, isValid: boolean) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Validate field on change
    const error = validateField(name, value);
    if (error) {
      console.log(`Validation error for ${name}:`, error);
    }
  };

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = { ...formData };
    if (enableCSRF) {
      submitData.csrfToken = csrfToken;
    }
    
    handleSubmit(submitData);
  };

  return (
    <form onSubmit={onFormSubmit} className={`space-y-4 ${className}`}>
      {enableCSRF && (
        <input type="hidden" name="csrfToken" value={csrfToken} />
      )}
      
      {fields.map((field) => (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          
          {field.type === 'number' ? (
            <SecureInput
              id={field.name}
              name={field.name}
              type="number"
              validationType="text"
              required={field.required}
              placeholder={field.placeholder}
              onSecureChange={(value, isValid) => handleInputChange(field.name, value, isValid)}
              showValidation={true}
              className="w-full"
            />
          ) : (
            <SecureInput
              id={field.name}
              name={field.name}
              validationType={field.type}
              required={field.required}
              placeholder={field.placeholder}
              onSecureChange={(value, isValid) => handleInputChange(field.name, value, isValid)}
              showValidation={true}
              className="w-full"
            />
          )}
          
          {errors[field.name] && (
            <p className="text-sm text-red-600">{errors[field.name]}</p>
          )}
        </div>
      ))}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  );
};

export default SecureForm;
