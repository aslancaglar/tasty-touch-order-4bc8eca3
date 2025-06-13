
-- Check if RLS is enabled on orders table and create proper policies
-- First, let's see the current state and then create the necessary policies

-- Enable RLS on orders table if not already enabled
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users (kiosk) to create orders
CREATE POLICY "Allow anonymous order creation" ON public.orders
FOR INSERT 
TO anon
WITH CHECK (true);

-- Allow authenticated users to create orders for any restaurant
CREATE POLICY "Allow authenticated order creation" ON public.orders
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Allow restaurant owners to view their restaurant's orders
CREATE POLICY "Restaurant owners can view their orders" ON public.orders
FOR SELECT 
TO authenticated
USING (
  restaurant_id IN (
    SELECT restaurant_id 
    FROM public.restaurant_owners 
    WHERE user_id = auth.uid()
  )
);

-- Allow admins to view all orders
CREATE POLICY "Admins can view all orders" ON public.orders
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  )
);

-- Allow restaurant owners to update their restaurant's orders
CREATE POLICY "Restaurant owners can update their orders" ON public.orders
FOR UPDATE 
TO authenticated
USING (
  restaurant_id IN (
    SELECT restaurant_id 
    FROM public.restaurant_owners 
    WHERE user_id = auth.uid()
  )
);

-- Allow admins to update all orders
CREATE POLICY "Admins can update all orders" ON public.orders
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  )
);

-- Now let's check and fix RLS policies for order_items table
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to create order items
CREATE POLICY "Allow anonymous order item creation" ON public.order_items
FOR INSERT 
TO anon
WITH CHECK (true);

-- Allow authenticated users to create order items
CREATE POLICY "Allow authenticated order item creation" ON public.order_items
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Allow viewing order items for restaurant owners and admins
CREATE POLICY "Restaurant owners can view their order items" ON public.order_items
FOR SELECT 
TO authenticated
USING (
  order_id IN (
    SELECT id 
    FROM public.orders 
    WHERE restaurant_id IN (
      SELECT restaurant_id 
      FROM public.restaurant_owners 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Admins can view all order items" ON public.order_items
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  )
);

-- Fix RLS policies for order_item_options table
ALTER TABLE public.order_item_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous order item options creation" ON public.order_item_options
FOR INSERT 
TO anon
WITH CHECK (true);

CREATE POLICY "Allow authenticated order item options creation" ON public.order_item_options
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Fix RLS policies for order_item_toppings table
ALTER TABLE public.order_item_toppings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous order item toppings creation" ON public.order_item_toppings
FOR INSERT 
TO anon
WITH CHECK (true);

CREATE POLICY "Allow authenticated order item toppings creation" ON public.order_item_toppings
FOR INSERT 
TO authenticated
WITH CHECK (true);
