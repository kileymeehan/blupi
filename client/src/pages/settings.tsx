import { useState } from "react";
import { Link } from "wouter";
import { ChevronLeft, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrganizationSettings } from "@/components/organization-settings";
import TeamManagement from "@/components/team/team-management";
import { ExtensionSettings } from "@/components/extension-settings";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'team' | 'extension'>(
    () => (new URLSearchParams(window.location.search).get('tab') === 'extension' ? 'extension' : 'team')
  );

  return (
    <div className="min-h-screen bauhaus-halftone-bg">
      <header className="border-b-2 border-[#1976D2] bg-[#0A0A0F] shadow-lg">
        <div className="max-w-[1440px] mx-auto flex h-20 items-center px-6">
          <Button asChild className="bg-white text-[#0A0A0F] border-2 border-[color:var(--card-border)] rounded shadow-[2px_2px_0px_0px_#FFD600] hover:bg-[#FFD600] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] font-bold uppercase tracking-wide transition-all">
            <Link href="/">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-[#0A0A0F] uppercase tracking-tight flex items-center gap-3">
            <SettingsIcon className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your organization and team settings
          </p>
        </div>

        {/* Sub-navigation */}
        <div className="mb-8 border-b-2 border-[color:var(--card-border)]">
          <div className="flex gap-0">
            <button
              onClick={() => setActiveTab('team')}
              className={`py-3 px-6 font-bold text-sm uppercase tracking-wider transition-all ${
                activeTab === 'team'
                  ? 'bg-[#0A0A0F] text-white'
                  : 'bg-transparent text-[#0A0A0F] hover:bg-[#FFD600]'
              }`}
            >
              Team
            </button>
            <button
              onClick={() => setActiveTab('extension')}
              className={`py-3 px-6 font-bold text-sm uppercase tracking-wider transition-all ${
                activeTab === 'extension'
                  ? 'bg-[#0A0A0F] text-white'
                  : 'bg-transparent text-[#0A0A0F] hover:bg-[#FFD600]'
              }`}
            >
              Chrome Extension
            </button>
          </div>
        </div>

        {/* Team Tab */}
        {activeTab === 'team' && (
          <div className="space-y-6">
            <OrganizationSettings />
            <TeamManagement />
          </div>
        )}

        {/* Chrome Extension Tab */}
        {activeTab === 'extension' && <ExtensionSettings />}
      </main>
    </div>
  );
}
