import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ChevronLeft, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrganizationSettings } from "@/components/organization-settings";
import TeamManagement from "@/components/team/team-management";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Users } from "lucide-react";

function SettingsPageSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#302E87]" />
                Organization
              </CardTitle>
              <CardDescription className="mt-1.5">
                Manage your organization settings and switch between workspaces
              </CardDescription>
            </div>
            <div className="h-9 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Your Organizations</h3>
            {[1, 2].map((i) => (
              <div key={i} className="p-4 rounded-lg border border-gray-200 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-12 w-12 bg-gray-200 rounded-lg animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                      <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="h-9 w-20 bg-gray-200 rounded animate-pulse flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team Management
              </CardTitle>
              <CardDescription>
                Invite team members and manage permissions for your organization
              </CardDescription>
            </div>
            <div className="h-9 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 rounded border border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-48 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'team' | 'other'>('team');
  const [isInitialRender, setIsInitialRender] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialRender(false), 50);
    return () => clearTimeout(timer);
  }, []);

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
          isInitialRender ? (
            <SettingsPageSkeleton />
          ) : (
            <div className="space-y-6">
              <OrganizationSettings />
              <TeamManagement />
            </div>
          )
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
