import { AdminLayout } from "@/components/layout/AdminLayout";
import { SecurityMetrics } from "@/components/security/SecurityMetrics";
import { SecurityEventsList } from "@/components/security/SecurityEventsList";
import { AuditLogsList } from "@/components/security/AuditLogsList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, FileText, AlertTriangle, Activity } from "lucide-react";

export default function Security() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Security Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor security events and audit logs across your system
            </p>
          </div>
        </div>

        <SecurityMetrics />

        <Tabs defaultValue="events" className="space-y-4">
          <TabsList>
            <TabsTrigger value="events" className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Security Events</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Audit Logs</span>
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>System Monitoring</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events">
            <SecurityEventsList />
          </TabsContent>

          <TabsContent value="audit">
            <AuditLogsList />
          </TabsContent>

          <TabsContent value="monitoring">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Database Connection</span>
                      <span className="text-green-600 font-medium">Healthy</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Authentication Service</span>
                      <span className="text-green-600 font-medium">Operational</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>File Storage</span>
                      <span className="text-green-600 font-medium">Available</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Edge Functions</span>
                      <span className="text-green-600 font-medium">Running</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Security Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>SSL Certificate</span>
                      <span className="text-green-600 font-medium">Valid</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>RLS Policies</span>
                      <span className="text-green-600 font-medium">Active</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>CORS Configuration</span>
                      <span className="text-green-600 font-medium">Configured</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Rate Limiting</span>
                      <span className="text-green-600 font-medium">Enabled</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}