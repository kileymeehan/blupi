// Define the type for layer types
export type LayerType = {
  type: string;
  label: string;
  color: string;
  isDivider?: boolean;
  isCustom?: boolean;
};

export const LAYER_TYPES: LayerType[] = [
  // Standard blocks
  { type: "touchpoint", label: "UX Touchpoint", color: "#3B82F633" }, // blue-600/20
  { type: "email", label: "Email", color: "#6366F133" }, // indigo-500/20
  { type: "pendo", label: "Modal", color: "#67E8F9" }, // cyan-300
  { type: "role", label: "Role", color: "#A7F3D0" }, // green-200
  { type: "process", label: "Process", color: "#FBCFE8" }, // pink-200
  { type: "friction", label: "Friction", color: "#FCA5A5" }, // red-300
  { type: "policy", label: "Policy", color: "#FED7AA" }, // orange-200
  { type: "technology", label: "Technology", color: "#D8B4FE" }, // purple-300
  { type: "rationale", label: "Rationale", color: "#BFDBFE" }, // blue-200
  { type: "question", label: "Question", color: "#DDD6FE" }, // violet-200
  { type: "note", label: "Note", color: "#A5F3FC" }, // cyan-200
  { type: "opportunities", label: "Opportunities", color: "#FDE047" }, // yellow-300
  { type: "hidden", label: "Hidden Step", color: "#9CA3AF" }, // gray-400
  { type: "custom", label: "Custom", color: "#6EE7B7", isCustom: true }, // emerald-300
  
  // Divider blocks
  { type: "front-stage", label: "Front-Stage Divider", color: "#3B82F6BF", isDivider: true }, // blue-500/75
  { type: "back-stage", label: "Back-Stage Divider", color: "#8B5CF6BF", isDivider: true }, // purple-500/75
  { type: "custom-divider", label: "Custom Divider", color: "#4B5563BF", isDivider: true }, // gray-600/75
];
