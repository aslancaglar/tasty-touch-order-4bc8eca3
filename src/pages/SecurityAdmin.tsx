
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SecurityDashboard from '@/components/security/SecurityDashboard';
import SecurityMetrics from '@/components/security/SecurityMetrics';
import AuditLogViewer from '@/components/security/AuditLogViewer';
import { Shield, BarChart3, Eye, Settings } from 'lucide-react';

const SecurityAdmin = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-red-600" />
        <div>
          <h1 className="text-3xl font-bold">Security Administration</h1>
          <p className="text-muted-foreground">
            Monitor, manage, and analyze security events across the platform
          </p>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Metrics
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="monitor" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Monitor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <SecurityDashboard />
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          <SecurityMetrics />
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <AuditLogViewer />
        </TabsContent>

        <TabsContent value="monitor" className="space-y-6">
          <div className="text-center py-12">
            <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Real-time Security Monitoring</h3>
            <p className="text-muted-foreground">
              Advanced monitoring features coming soon. This will include real-time threat detection,
              automated response systems, and detailed security analytics.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SecurityAdmin;
