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
  darkMode?: boolean;
}

export function DepartmentFilter({ 
  blocks, 
  onFilterByDepartment,
  onFilterByType,
  departmentFilter,
  typeFilter,
  darkMode = false
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
        <h2 className={`text-xs font-bold uppercase tracking-wide ${darkMode ? "text-white" : "text-[#0A0A0F]"}`}>Filters</h2>
        {hasActiveFilters && (
          <Button 
            size="sm" 
            onClick={clearAllFilters}
            className={`text-xs border-2 rounded-none font-bold uppercase tracking-wide transition-all ${
              darkMode 
                ? "bg-[#1e1e32] text-white border-[#3a3a5c] shadow-[2px_2px_0px_0px_#3a3a5c] hover:bg-[#FFD600] hover:text-[#0A0A0F] hover:shadow-none" 
                : "bg-white text-[#0A0A0F] border-[#0A0A0F] shadow-[2px_2px_0px_0px_#0A0A0F] hover:bg-[#FFD600] hover:shadow-none"
            }`}
          >
            Clear All
          </Button>
        )}
      </div>

      <Tabs defaultValue="departments" className="w-full">
        <TabsList className={`grid w-full grid-cols-2 mb-4 border-2 rounded-none p-0 h-auto ${darkMode ? "bg-[#1e1e32] border-[#3a3a5c]" : "bg-white border-[#0A0A0F]"}`}>
          <TabsTrigger 
            value="departments" 
            className={`rounded-none font-bold uppercase text-xs tracking-wide py-2 ${
              darkMode 
                ? "border-r border-[#3a3a5c] text-white data-[state=active]:bg-[#FFD600] data-[state=active]:text-[#0A0A0F]" 
                : "border-r border-[#0A0A0F] data-[state=active]:bg-[#FFD600] data-[state=active]:text-[#0A0A0F]"
            }`}
          >
            Departments
          </TabsTrigger>
          <TabsTrigger 
            value="types" 
            className={`rounded-none font-bold uppercase text-xs tracking-wide py-2 ${
              darkMode 
                ? "text-white data-[state=active]:bg-[#FFD600] data-[state=active]:text-[#0A0A0F]" 
                : "data-[state=active]:bg-[#FFD600] data-[state=active]:text-[#0A0A0F]"
            }`}
          >
            Block Types
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="departments">
          <ScrollArea className="h-[calc(100vh-16rem)]">
            {departments.length === 0 ? (
              <p className={`text-sm text-center p-3 border-2 rounded-none ${darkMode ? "bg-[#1e1e32] border-[#3a3a5c] text-gray-400" : "bg-gray-50 border-[#0A0A0F] text-gray-500"}`}>No departments tagged yet</p>
            ) : (
              <div className="space-y-2">
                {departments.map((department) => (
                  <Button
                    key={department}
                    className={`w-full justify-start text-sm border-2 rounded-none font-semibold transition-all ${
                      department === departmentFilter 
                        ? "bg-[#FFD600] text-[#0A0A0F] shadow-none" 
                        : (darkMode 
                            ? "bg-[#1e1e32] text-white border-[#3a3a5c] shadow-[2px_2px_0px_0px_#3a3a5c] hover:bg-[#FFD600] hover:text-[#0A0A0F] hover:shadow-none" 
                            : "bg-white text-[#0A0A0F] border-[#0A0A0F] shadow-[2px_2px_0px_0px_#0A0A0F] hover:bg-[#FFD600] hover:shadow-none")
                    }`}
                    onClick={() => onFilterByDepartment(department)}
                  >
                    {department}
                  </Button>
                ))}
                <Button
                  className={`w-full justify-start text-sm mt-4 border-2 rounded-none font-semibold transition-all ${
                    darkMode 
                      ? "bg-[#1e1e32] text-white border-[#3a3a5c] shadow-[2px_2px_0px_0px_#3a3a5c] hover:bg-[#FFD600] hover:text-[#0A0A0F] hover:shadow-none" 
                      : "bg-gray-100 text-[#0A0A0F] border-[#0A0A0F] shadow-[2px_2px_0px_0px_#0A0A0F] hover:bg-[#FFD600] hover:shadow-none"
                  }`}
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
              <p className={`text-sm text-center p-3 border-2 rounded-none ${darkMode ? "bg-[#1e1e32] border-[#3a3a5c] text-gray-400" : "bg-gray-50 border-[#0A0A0F] text-gray-500"}`}>No block types found</p>
            ) : (
              <div className="space-y-2">
                {blockTypes.map((type) => {
                  const blockType = LAYER_TYPES.find(l => l.type === type);
                  return (
                    <Button
                      key={type}
                      className={`w-full justify-start text-sm border-2 rounded-none font-semibold transition-all ${
                        type === typeFilter 
                          ? "bg-[#FFD600] text-[#0A0A0F] shadow-none" 
                          : (darkMode 
                              ? "bg-[#1e1e32] text-white border-[#3a3a5c] shadow-[2px_2px_0px_0px_#3a3a5c] hover:bg-[#FFD600] hover:text-[#0A0A0F] hover:shadow-none" 
                              : "bg-white text-[#0A0A0F] border-[#0A0A0F] shadow-[2px_2px_0px_0px_#0A0A0F] hover:bg-[#FFD600] hover:shadow-none")
                      }`}
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
                  className={`w-full justify-start text-sm mt-4 border-2 rounded-none font-semibold transition-all ${
                    darkMode 
                      ? "bg-[#1e1e32] text-white border-[#3a3a5c] shadow-[2px_2px_0px_0px_#3a3a5c] hover:bg-[#FFD600] hover:text-[#0A0A0F] hover:shadow-none" 
                      : "bg-gray-100 text-[#0A0A0F] border-[#0A0A0F] shadow-[2px_2px_0px_0px_#0A0A0F] hover:bg-[#FFD600] hover:shadow-none"
                  }`}
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
