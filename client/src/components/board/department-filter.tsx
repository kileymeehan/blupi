import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import type { Block, Department } from "@shared/schema";

interface DepartmentFilterProps {
  blocks: Block[];
  onFilterByDepartment: (department: Department | undefined) => void;
}

export function DepartmentFilter({ blocks, onFilterByDepartment }: DepartmentFilterProps) {
  // Get unique departments from blocks
  const departments = Array.from(new Set(blocks
    .map(block => block.department)
    .filter((dept): dept is Department => !!dept)));

  return (
    <div className="p-4 bg-gray-50 h-full">
      <div className="flex items-center mb-4">
        <h2 className="font-semibold text-gray-700">Department Tags</h2>
      </div>

      <ScrollArea className="h-[calc(100vh-12rem)]">
        {departments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center">No departments tagged yet</p>
        ) : (
          <div className="space-y-2">
            {departments.map((department) => (
              <Button
                key={department}
                variant="outline"
                className="w-full justify-start text-sm"
                onClick={() => onFilterByDepartment(department)}
              >
                {department}
              </Button>
            ))}
            <Button
              variant="outline"
              className="w-full justify-start text-sm mt-4"
              onClick={() => onFilterByDepartment(undefined)}
            >
              Clear Filter
            </Button>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}