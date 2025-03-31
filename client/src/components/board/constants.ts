// Define the type for layer types
type LayerType = {
  type: string;
  label: string;
  color: string;
  isDivider?: boolean;
};

export const LAYER_TYPES: LayerType[] = [
  // Standard blocks
  { type: "touchpoint", label: "UX Touchpoint", color: "bg-blue-600/20" },
  { type: "email", label: "Email", color: "bg-indigo-500/20" },
  { type: "pendo", label: "Modal", color: "bg-cyan-300" },
  { type: "role", label: "Role", color: "bg-green-200" },
  { type: "process", label: "Process", color: "bg-pink-200" },
  { type: "friction", label: "Friction", color: "bg-red-300" },
  { type: "policy", label: "Policy", color: "bg-orange-200" },
  { type: "technology", label: "Technology", color: "bg-purple-300" },
  { type: "rationale", label: "Rationale", color: "bg-blue-200" },
  { type: "question", label: "Question", color: "bg-violet-200" },
  { type: "note", label: "Note", color: "bg-cyan-200" },
  { type: "opportunities", label: "Opportunities", color: "bg-yellow-300" },
  { type: "hidden", label: "Hidden Step", color: "bg-gray-400" },
  
  // Divider blocks
  { type: "front-stage", label: "Front-Stage Divider", color: "bg-blue-500/75", isDivider: true },
  { type: "back-stage", label: "Back-Stage Divider", color: "bg-purple-500/75", isDivider: true },
  { type: "custom-divider", label: "Custom Divider", color: "bg-gray-600/75", isDivider: true },
];
