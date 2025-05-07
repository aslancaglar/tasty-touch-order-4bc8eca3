
import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { UserAddress } from '@/types/database-types';

interface AddressFormProps {
  userId: string;
  existingAddress?: UserAddress;
  onSuccess: (address: UserAddress) => void;
}

const addressSchema = z.object({
  street: z.string().min(1, { message: 'Street is required' }),
  city: z.string().min(1, { message: 'City is required' }),
  postalCode: z.string().min(1, { message: 'Postal code is required' }),
  country: z.string().min(1, { message: 'Country is required' }),
  isDefault: z.boolean().default(false),
});

type AddressFormData = z.infer<typeof addressSchema>;

export default function AddressForm({ userId, existingAddress, onSuccess }: AddressFormProps) {
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      street: existingAddress?.street || '',
      city: existingAddress?.city || '',
      postalCode: existingAddress?.postal_code || '',
      country: existingAddress?.country || 'France',
      isDefault: existingAddress?.is_default || false,
    },
  });

  const onSubmit = async (data: AddressFormData) => {
    try {
      const addressData = {
        user_id: userId,
        street: data.street,
        city: data.city,
        postal_code: data.postalCode,
        country: data.country,
        is_default: data.isDefault,
      };

      let result;

      if (existingAddress) {
        // Update existing address
        const { data: updatedAddress, error } = await supabase
          .from('user_addresses')
          .update(addressData)
          .eq('id', existingAddress.id)
          .select('*')
          .single();

        if (error) throw error;
        result = updatedAddress;
      } else {
        // Create new address
        const { data: newAddress, error } = await supabase
          .from('user_addresses')
          .insert(addressData)
          .select('*')
          .single();

        if (error) throw error;
        result = newAddress;
      }

      // If this is the default address, update other addresses to not be default
      if (data.isDefault) {
        await supabase
          .from('user_addresses')
          .update({ is_default: false })
          .eq('user_id', userId)
          .neq('id', result.id);
      }

      toast({
        title: existingAddress ? 'Address updated' : 'Address added',
        description: 'Your delivery address has been saved.',
      });

      onSuccess(result);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save address',
        variant: 'destructive',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="street">Street Address</Label>
        <Input
          id="street"
          {...register('street')}
        />
        {errors.street && (
          <p className="text-sm text-red-500">{errors.street.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            {...register('city')}
          />
          {errors.city && (
            <p className="text-sm text-red-500">{errors.city.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="postalCode">Postal Code</Label>
          <Input
            id="postalCode"
            {...register('postalCode')}
          />
          {errors.postalCode && (
            <p className="text-sm text-red-500">{errors.postalCode.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="country">Country</Label>
        <Input
          id="country"
          {...register('country')}
        />
        {errors.country && (
          <p className="text-sm text-red-500">{errors.country.message}</p>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox id="isDefault" {...register('isDefault')} />
        <Label htmlFor="isDefault">Set as default address</Label>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : existingAddress ? 'Update Address' : 'Add Address'}
      </Button>
    </form>
  );
}
