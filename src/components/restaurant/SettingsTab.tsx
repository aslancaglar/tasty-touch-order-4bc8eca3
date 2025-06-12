
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Printer, Shield, BarChart } from "lucide-react";
import PrintNodeIntegration from "./PrintNodeIntegration";
import QZTrayIntegration from "./QZTrayIntegration";
import PrintNodeDiagnostics from "./PrintNodeDiagnostics";
import SecurityDashboard from "../security/SecurityDashboard";

interface SettingsTabProps {
  restaurant: {
    id: string;
    name: string;
  };
  onRestaurantUpdated?: (updatedRestaurant: any) => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ restaurant, onRestaurantUpdated }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Settings</h2>
      </div>

      <Tabs defaultValue="printing" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="printing" className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Printing
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="diagnostics" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            Diagnostics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="printing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Printing Configuration</CardTitle>
              <CardDescription>
                Configure your printing setup for receipt printing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <PrintNodeIntegration restaurantId={restaurant.id} />
              <QZTrayIntegration restaurantId={restaurant.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <SecurityDashboard restaurantId={restaurant.id} />
        </TabsContent>

        <TabsContent value="diagnostics" className="space-y-6">
          <PrintNodeDiagnostics restaurantId={restaurant.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsTab;
