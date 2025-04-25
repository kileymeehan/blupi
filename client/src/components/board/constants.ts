// Define the type for layer types
type LayerType = {
  type: string;
  label: string;
  color: string;
  icon: string;
  isDivider?: boolean;
};

export const LAYER_TYPES: LayerType[] = [
  // Standard blocks
  { type: "touchpoint", label: "UX Touchpoint", color: "bg-blue-600/20", icon: "MousePointer" },
  { type: "email", label: "Email", color: "bg-indigo-500/20", icon: "Mail" },
  { type: "pendo", label: "Modal", color: "bg-cyan-300", icon: "Monitor" },
  { type: "role", label: "Role", color: "bg-green-200", icon: "UserCircle" },
  { type: "process", label: "Process", color: "bg-pink-200", icon: "Settings" },
  { type: "friction", label: "Friction", color: "bg-red-300", icon: "Frown" },
  { type: "policy", label: "Policy", color: "bg-orange-200", icon: "FileText" },
  { type: "technology", label: "Technology", color: "bg-purple-300", icon: "Code" },
  { type: "rationale", label: "Rationale", color: "bg-blue-200", icon: "BrainCircuit" },
  { type: "question", label: "Question", color: "bg-violet-200", icon: "HelpCircle" },
  { type: "note", label: "Note", color: "bg-cyan-200", icon: "StickyNote" },
  { type: "opportunities", label: "Opportunities", color: "bg-yellow-300", icon: "Lightbulb" },
  { type: "metrics", label: "Metrics", color: "bg-teal-300", icon: "BarChart3" },
  { type: "hidden", label: "Hidden Step", color: "bg-gray-400", icon: "EyeOff" },
  
  // Divider blocks
  { type: "front-stage", label: "Front-Stage Divider", color: "bg-blue-500/75", icon: "Eye", isDivider: true },
  { type: "back-stage", label: "Back-Stage Divider", color: "bg-purple-500/75", icon: "EyeOff", isDivider: true },
  { type: "custom-divider", label: "Custom Divider", color: "bg-gray-600/75", icon: "Separator", isDivider: true }
];