import { useState } from "react";
import { Link } from "wouter";
import { ChevronLeft, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrganizationSettings } from "@/components/organization-settings";
import TeamManagement from "@/components/team/team-management";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'team' | 'other'>('team');

  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      <header className="border-b bg-[#302E87] shadow-sm">
        <div className="max-w-[1440px] mx-auto flex h-16 items-center px-6">
          <Button variant="ghost" asChild className="text-white hover:bg-white/10">
            <Link href="/">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#302E87] flex items-center gap-3">
            <SettingsIcon className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your organization and team settings
          </p>
        </div>

        {/* Sub-navigation */}
        <div className="mb-8 border-b border-gray-200">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('team')}
              className={`pb-3 px-1 font-medium transition-colors ${
                activeTab === 'team'
                  ? 'text-[#302E87] border-b-2 border-[#302E87]'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Team
            </button>
            <button
              onClick={() => setActiveTab('other')}
              className={`pb-3 px-1 font-medium transition-colors ${
                activeTab === 'other'
                  ? 'text-[#302E87] border-b-2 border-[#302E87]'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Other Settings
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

        {/* Other Settings Tab */}
        {activeTab === 'other' && (
          <div className="text-center py-12">
            <p className="text-gray-600">Coming soon</p>
          </div>
        )}
      </main>
    </div>
  );
}
