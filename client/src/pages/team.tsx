import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Folder, LayoutGrid, LogOut, User, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-simple-auth";
import TeamManagement from "@/components/team/team-management";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { CreateBlueprintDialog } from "@/components/create-blueprint-dialog";

export default function TeamPage() {
  const { user, signOut } = useAuth();
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createBlueprintOpen, setCreateBlueprintOpen] = useState(false);

  const handleLogout = () => {
    signOut();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <img 
                src="/blupi-logomark-blue.png" 
                alt="Blupi" 
                className="h-8 w-auto cursor-pointer"
              />
            </Link>
            <nav className="flex items-center space-x-6">
              <Link 
                href="/projects" 
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Projects
              </Link>
              <Link 
                href="/boards" 
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Blueprints
              </Link>
              <Link 
                href="/team" 
                className="text-sm font-medium text-blue-600 font-semibold"
              >
                Team
              </Link>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Create</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setCreateProjectOpen(true)}>
                  <Folder className="w-4 h-4 mr-2" />
                  New Project
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCreateBlueprintOpen(true)}>
                  <LayoutGrid className="w-4 h-4 mr-2" />
                  New Blueprint
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-sm">
                    {user?.photoURL || '👤'}
                  </div>
                  <span className="hidden sm:inline text-sm">{user?.displayName || user?.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center w-full">
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/team" className="flex items-center w-full">
                    <Users className="w-4 h-4 mr-2" />
                    Team
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <TeamManagement />
      </main>

      {/* Dialogs */}
      <CreateProjectDialog 
        open={createProjectOpen} 
        onOpenChange={setCreateProjectOpen} 
      />
      <CreateBlueprintDialog 
        open={createBlueprintOpen} 
        onOpenChange={setCreateBlueprintOpen} 
      />
    </div>
  );
}