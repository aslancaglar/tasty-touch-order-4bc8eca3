
import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import { useTranslation } from "@/utils/language-utils";
import { LanguageSelector } from "@/components/kiosk/LanguageSelector";
import { LanguageProvider } from "@/contexts/LanguageContext";

interface AdminLayoutProps {
  children: ReactNode;
  useDefaultLanguage?: boolean;
}

export function AdminLayout({ children, useDefaultLanguage = true }: AdminLayoutProps) {
  return (
    <LanguageProvider>
      <div className="flex h-screen bg-gray-50">
        <Sidebar forceDefaultLanguage={useDefaultLanguage} />
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header with language selector */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-end">
            <LanguageSelector />
          </div>
          
          {/* Main content */}
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>
    </LanguageProvider>
  );
}

export default AdminLayout;
