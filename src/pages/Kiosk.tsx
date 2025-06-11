
import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Coffee, Utensils } from 'lucide-react';

const Kiosk = () => {
  const { slug } = useParams<{ slug: string }>();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Welcome to {slug}</h1>
          <p className="text-lg text-gray-600">Self-Service Kiosk</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="text-center">
              <Coffee className="h-12 w-12 mx-auto mb-2 text-brown-600" />
              <CardTitle>Beverages</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-600">Coffee, Tea, Juices & More</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="text-center">
              <Utensils className="h-12 w-12 mx-auto mb-2 text-orange-600" />
              <CardTitle>Food</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-600">Sandwiches, Salads & Snacks</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="text-center">
              <ShoppingBag className="h-12 w-12 mx-auto mb-2 text-purple-600" />
              <CardTitle>Special Offers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-600">Daily Deals & Combos</p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-xl">
            Start Your Order
          </Button>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Touch the screen to begin • For assistance, please ask a team member</p>
        </div>
      </div>
    </div>
  );
};

export default Kiosk;
