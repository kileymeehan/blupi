import { useState } from "react";
import { Search, Filter, SortAsc, SortDesc, Calendar, User, LayoutGrid } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface SearchFilterProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sortConfig: {
    key: 'name' | 'date' | 'status' | 'project';
    direction: 'ascending' | 'descending';
  };
  onSortChange: (config: { key: 'name' | 'date' | 'status' | 'project'; direction: 'ascending' | 'descending' }) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  projectFilter: string;
  onProjectFilterChange: (project: string) => void;
  availableProjects: Array<{ id: number; name: string }>;
  totalResults: number;
  filteredResults: number;
}

export function SearchFilter({
  searchTerm,
  onSearchChange,
  sortConfig,
  onSortChange,
  statusFilter,
  onStatusFilterChange,
  projectFilter,
  onProjectFilterChange,
  availableProjects,
  totalResults,
  filteredResults,
}: SearchFilterProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const activeFilters = [
    statusFilter !== 'all' && statusFilter,
    projectFilter !== 'all' && projectFilter,
  ].filter(Boolean);

  const clearAllFilters = () => {
    onStatusFilterChange('all');
    onProjectFilterChange('all');
    onSearchChange('');
  };

  return (
    <div className="space-y-4">
      {/* Search and Sort Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search projects and blueprints..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-4"
          />
        </div>

        {/* Sort Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              {sortConfig.direction === 'ascending' ? (
                <SortAsc className="h-4 w-4" />
              ) : (
                <SortDesc className="h-4 w-4" />
              )}
              Sort by {sortConfig.key}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onSortChange({ key: 'name', direction: 'ascending' })}
              className="flex items-center gap-2"
            >
              <SortAsc className="h-4 w-4" />
              Name (A-Z)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onSortChange({ key: 'name', direction: 'descending' })}
              className="flex items-center gap-2"
            >
              <SortDesc className="h-4 w-4" />
              Name (Z-A)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onSortChange({ key: 'date', direction: 'descending' })}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Newest First
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onSortChange({ key: 'date', direction: 'ascending' })}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Oldest First
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onSortChange({ key: 'status', direction: 'ascending' })}
              className="flex items-center gap-2"
            >
              <LayoutGrid className="h-4 w-4" />
              Status
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Filter Dropdown */}
        <DropdownMenu open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter
              {activeFilters.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                  {activeFilters.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => onStatusFilterChange('all')}
              className={statusFilter === 'all' ? 'bg-gray-100' : ''}
            >
              All Statuses
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onStatusFilterChange('draft')}
              className={statusFilter === 'draft' ? 'bg-gray-100' : ''}
            >
              Draft
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onStatusFilterChange('in-progress')}
              className={statusFilter === 'in-progress' ? 'bg-gray-100' : ''}
            >
              In Progress
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onStatusFilterChange('completed')}
              className={statusFilter === 'completed' ? 'bg-gray-100' : ''}
            >
              Completed
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onStatusFilterChange('archived')}
              className={statusFilter === 'archived' ? 'bg-gray-100' : ''}
            >
              Archived
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Filter by Project</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => onProjectFilterChange('all')}
              className={projectFilter === 'all' ? 'bg-gray-100' : ''}
            >
              All Projects
            </DropdownMenuItem>
            {availableProjects.slice(0, 8).map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => onProjectFilterChange(project.name)}
                className={projectFilter === project.name ? 'bg-gray-100' : ''}
              >
                {project.name}
              </DropdownMenuItem>
            ))}
            {availableProjects.length > 8 && (
              <DropdownMenuItem disabled className="text-xs text-gray-500">
                + {availableProjects.length - 8} more projects
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Active Filters and Results */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Active Filters */}
        <div className="flex items-center gap-2">
          {activeFilters.length > 0 && (
            <>
              <span className="text-sm text-gray-600">Active filters:</span>
              {statusFilter !== 'all' && (
                <Badge variant="outline" className="flex items-center gap-1">
                  Status: {statusFilter}
                  <button
                    onClick={() => onStatusFilterChange('all')}
                    className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {projectFilter !== 'all' && (
                <Badge variant="outline" className="flex items-center gap-1">
                  Project: {projectFilter}
                  <button
                    onClick={() => onProjectFilterChange('all')}
                    className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                  >
                    ×
                  </button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-xs h-6 px-2"
              >
                Clear all
              </Button>
            </>
          )}
        </div>

        {/* Results Count */}
        <div className="text-sm text-gray-600">
          {searchTerm || activeFilters.length > 0 ? (
            <>
              Showing {filteredResults} of {totalResults} results
              {searchTerm && (
                <span className="ml-1">
                  for "{searchTerm}"
                </span>
              )}
            </>
          ) : (
            `${totalResults} total items`
          )}
        </div>
      </div>
    </div>
  );
}