
import { supabase, listenToPaymentUpdates } from "@/integrations/supabase/client";
import { Payment } from "@/types/database-types";

// Create a new payment record
export const createPayment = async (data: {
  amount: number;
  order_id: string;
  payment_method: 'card';
}): Promise<Payment> => {
  try {
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        amount: data.amount,
        status: 'pending',
        order_id: data.order_id,
        payment_method: data.payment_method
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating payment:', error);
      throw error;
    }

    return payment as Payment;
  } catch (error) {
    console.error('Error in createPayment:', error);
    throw error;
  }
};

// Get a payment by ID
export const getPaymentById = async (id: string): Promise<Payment | null> => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching payment:', error);
      return null;
    }

    return data as Payment;
  } catch (error) {
    console.error('Error in getPaymentById:', error);
    return null;
  }
};

// Update a payment status
export const updatePaymentStatus = async (
  id: string, 
  status: 'pending' | 'approved' | 'declined' | 'cancelled', 
  pos_response?: string
): Promise<Payment | null> => {
  try {
    const updateData: { 
      status: string; 
      updated_at: string; 
      pos_response?: string 
    } = {
      status,
      updated_at: new Date().toISOString()
    };

    if (pos_response) {
      updateData.pos_response = pos_response;
    }
    
    const { data, error } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating payment:', error);
      return null;
    }

    return data as Payment;
  } catch (error) {
    console.error('Error in updatePaymentStatus:', error);
    return null;
  }
};

// Get payments by order ID
export const getPaymentsByOrderId = async (orderId: string): Promise<Payment[]> => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payments by order:', error);
      return [];
    }

    return data as Payment[];
  } catch (error) {
    console.error('Error in getPaymentsByOrderId:', error);
    return [];
  }
};

// Set up a listener for payment updates
export { listenToPaymentUpdates };
