
import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import { useTranslation } from "@/utils/language-utils";

interface AdminLayoutProps {
  children: ReactNode;
  useDefaultLanguage?: boolean;
}

export function AdminLayout({ children, useDefaultLanguage = true }: AdminLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar forceDefaultLanguage={useDefaultLanguage} />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;
