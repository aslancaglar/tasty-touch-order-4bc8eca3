
import { supabase } from "@/integrations/supabase/client";
import { PaymentStatus, PaymentRecord } from "@/types/database-types";

/**
 * Creates a new payment record for a card transaction
 */
export const createCardPaymentRecord = async (
  orderId: string,
  restaurantId: string,
  amount: number
): Promise<PaymentRecord> => {
  try {
    const { data, error } = await supabase
      .from('payment_records')
      .insert({
        order_id: orderId,
        restaurant_id: restaurantId,
        amount,
        payment_method: 'card',
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating payment record:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createCardPaymentRecord:', error);
    throw error;
  }
};

/**
 * Creates a payment record for a cash transaction and automatically marks it as completed
 */
export const createCashPaymentRecord = async (
  orderId: string,
  restaurantId: string,
  amount: number
): Promise<PaymentRecord> => {
  try {
    const { data, error } = await supabase
      .from('payment_records')
      .insert({
        order_id: orderId,
        restaurant_id: restaurantId,
        amount,
        payment_method: 'cash',
        status: 'completed'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating cash payment record:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createCashPaymentRecord:', error);
    throw error;
  }
};

/**
 * Updates the payment status of a payment record
 */
export const updatePaymentStatus = async (
  paymentId: string,
  status: PaymentStatus,
  transactionId?: string
): Promise<PaymentRecord> => {
  try {
    const updateData: Partial<PaymentRecord> = { status };
    if (transactionId) {
      updateData.transaction_id = transactionId;
    }

    const { data, error } = await supabase
      .from('payment_records')
      .update(updateData)
      .eq('id', paymentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updatePaymentStatus:', error);
    throw error;
  }
};

/**
 * Updates the order's payment status and links it to a payment record
 */
export const updateOrderPaymentInfo = async (
  orderId: string,
  paymentId: string,
  status: PaymentStatus
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('orders')
      .update({
        payment_id: paymentId,
        payment_status: status
      })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating order payment info:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in updateOrderPaymentInfo:', error);
    throw error;
  }
};

/**
 * Gets a payment record by ID
 */
export const getPaymentRecord = async (paymentId: string): Promise<PaymentRecord | null> => {
  try {
    const { data, error } = await supabase
      .from('payment_records')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (error) {
      console.error('Error getting payment record:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getPaymentRecord:', error);
    return null;
  }
};

/**
 * Subscribes to updates for a specific payment record
 */
export const subscribeToPaymentUpdates = (
  paymentId: string,
  callback: (payment: PaymentRecord) => void
) => {
  const channel = supabase
    .channel(`payment-${paymentId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'payment_records',
        filter: `id=eq.${paymentId}`
      },
      (payload) => {
        callback(payload.new as PaymentRecord);
      }
    )
    .subscribe();

  return channel;
};
