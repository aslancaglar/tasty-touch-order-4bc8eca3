import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function GeneralSettingsPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">General Settings</h1>
          <p className="text-muted-foreground">
            Manage general application settings and configurations
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Language Management</CardTitle>
            <CardDescription>
              Global language settings will be available here. Currently, language flags are managed per restaurant.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This page will contain system-wide settings that affect all restaurants and users.
              Language flag management is currently handled at the restaurant level.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}