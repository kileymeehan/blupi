// Define the type for layer types
type LayerType = {
  type: string;
  label: string;
  color: string;
  icon: string;
  isDivider?: boolean;
};

export const LAYER_TYPES: LayerType[] = [
  // Standard blocks - now using border colors instead of background colors
  { type: "touchpoint", label: "UX Touchpoint", color: "border-blue-600", icon: "MousePointer" },
  { type: "email", label: "Email", color: "border-indigo-500", icon: "Mail" },
  { type: "pendo", label: "Modal", color: "border-cyan-500", icon: "Monitor" },
  { type: "role", label: "Role", color: "border-green-500", icon: "UserCircle" },
  { type: "process", label: "Process", color: "border-pink-500", icon: "Settings" },
  { type: "friction", label: "Friction", color: "border-red-500", icon: "Frown" },
  { type: "policy", label: "Policy", color: "border-orange-500", icon: "FileText" },
  { type: "technology", label: "Technology", color: "border-purple-500", icon: "Code" },
  { type: "rationale", label: "Rationale", color: "border-blue-500", icon: "BrainCircuit" },
  { type: "question", label: "Question", color: "border-violet-500", icon: "HelpCircle" },
  { type: "note", label: "Note", color: "border-cyan-400", icon: "StickyNote" },
  { type: "opportunities", label: "Opportunities", color: "border-yellow-500", icon: "Lightbulb" },
  { type: "hypothesis", label: "Hypothesis", color: "border-emerald-500", icon: "Target" },
  { type: "insight", label: "Insight", color: "border-fuchsia-500", icon: "Zap" },
  { type: "metrics", label: "Metrics", color: "border-teal-500", icon: "BarChart3" },
  { type: "experiment", label: "Experiment", color: "border-amber-500", icon: "Beaker" },
  { type: "video", label: "Video", color: "border-rose-500", icon: "Play" },
  { type: "hidden", label: "Hidden Step", color: "border-gray-500", icon: "EyeOff" },
  
  // Divider blocks
  { type: "front-stage", label: "Front-Stage", color: "bg-blue-500/75", icon: "Eye", isDivider: true },
  { type: "back-stage", label: "Back-Stage", color: "bg-purple-500/75", icon: "EyeOff", isDivider: true },
  { type: "custom-divider", label: "Custom", color: "bg-gray-600/75", icon: "Separator", isDivider: true }
];