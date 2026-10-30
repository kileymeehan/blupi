import type { Department } from "@shared/schema";

export interface DepartmentInfo {
  name: string;
  color: string;
}

export const DEPARTMENT_COLORS: Record<Department, DepartmentInfo> = {
  // Reef palette; white text meets 4.5:1 on each
  Engineering: { name: "Engineering", color: "#3B72A3" },
  Marketing: { name: "Marketing", color: "#B8563F" },
  Product: { name: "Product", color: "#457F55" },
  Design: { name: "Design", color: "#8C6F1A" },
  Brand: { name: "Brand", color: "#7E62AB" },
  Support: { name: "Support", color: "#2C7F8C" },
  Sales: { name: "Sales", color: "#B0577C" },
  Custom: { name: "Custom", color: "#66717A" }
};

export function getDepartmentInfo(department: Department | undefined): DepartmentInfo {
  if (!department) {
    return { name: "Unknown", color: "#66717A" };
  }
  return DEPARTMENT_COLORS[department] || { name: department, color: "#66717A" };
}