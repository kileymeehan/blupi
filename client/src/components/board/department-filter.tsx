import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import type { Block, Department } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LAYER_TYPES } from "./constants";
import * as Icons from "lucide-react";
import { getIconForBlockType } from "./type-utils";

interface FiltersProps {
  blocks: Block[];
  onFilterByDepartment: (department: Department | undefined) => void;
  onFilterByType: (type: string | undefined) => void;
  departmentFilter?: Department;
  typeFilter?: string;
}

export function DepartmentFilter({ 
  blocks, 
  onFilterByDepartment,
  onFilterByType,
  departmentFilter,
  typeFilter
}: FiltersProps) {
  // Get unique departments from blocks
  const departments = Array.from(new Set(blocks
    .map(block => block.department)
    .filter((dept): dept is Department => !!dept)));

  // Get unique block types from blocks (excluding dividers)
  const blockTypes = Array.from(new Set(blocks
    .map(block => block.type)
    .filter(type => type !== "front-stage" && type !== "back-stage" && type !== "custom-divider")));

  // Function to render icon for the block type
  const renderIcon = (blockType: string) => {
    const iconName = getIconForBlockType(blockType);
    const IconComponent = (Icons as any)[iconName] || Icons.Square;
    return <IconComponent className="w-4 h-4 mr-2" />;
  };

  // Function to clear all filters
  const clearAllFilters = () => {
    onFilterByDepartment(undefined);
    onFilterByType(undefined);
  };
  
  // Check if any filters are active
  const hasActiveFilters = departmentFilter !== undefined || typeFilter !== undefined;

  return (
    <div className="p-4 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-700">Filters</h2>
        {hasActiveFilters && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearAllFilters}
            className="text-xs bg-white"
          >
            Clear All
          </Button>
        )}
      </div>

      <Tabs defaultValue="departments" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="types">Block Types</TabsTrigger>
        </TabsList>
        
        <TabsContent value="departments">
          <ScrollArea className="h-[calc(100vh-16rem)]">
            {departments.length === 0 ? (
              <p className="text-sm text-gray-500 text-center">No departments tagged yet</p>
            ) : (
              <div className="space-y-2">
                {departments.map((department) => (
                  <Button
                    key={department}
                    variant={department === departmentFilter ? "default" : "outline"}
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
                  Clear Department Filter
                </Button>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="types">
          <ScrollArea className="h-[calc(100vh-16rem)]">
            {blockTypes.length === 0 ? (
              <p className="text-sm text-gray-500 text-center">No block types found</p>
            ) : (
              <div className="space-y-2">
                {blockTypes.map((type) => {
                  const blockType = LAYER_TYPES.find(l => l.type === type);
                  return (
                    <Button
                      key={type}
                      variant={type === typeFilter ? "default" : "outline"}
                      className={`w-full justify-start text-sm`}
                      onClick={() => onFilterByType(type)}
                    >
                      <div className="flex items-center">
                        {renderIcon(type)}
                        <span>{blockType?.label || type}</span>
                      </div>
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  className="w-full justify-start text-sm mt-4"
                  onClick={() => onFilterByType(undefined)}
                >
                  Clear Type Filter
                </Button>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
