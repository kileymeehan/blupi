import type { Department } from "@shared/schema";

export interface DepartmentInfo {
  name: string;
  color: string;
}

export const DEPARTMENT_COLORS: Record<Department, DepartmentInfo> = {
  Engineering: { name: "Engineering", color: "#3B82F6" },
  Marketing: { name: "Marketing", color: "#EF4444" },
  Product: { name: "Product", color: "#10B981" },
  Design: { name: "Design", color: "#F59E0B" },
  Brand: { name: "Brand", color: "#8B5CF6" },
  Support: { name: "Support", color: "#06B6D4" },
  Sales: { name: "Sales", color: "#EC4899" },
  Custom: { name: "Custom", color: "#6B7280" }
};

export function getDepartmentInfo(department: Department | undefined): DepartmentInfo {
  if (!department) {
    return { name: "Unknown", color: "#6B7280" };
  }
  return DEPARTMENT_COLORS[department] || { name: department, color: "#6B7280" };
}