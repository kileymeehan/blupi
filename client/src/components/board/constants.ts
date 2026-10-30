// Define the type for layer types
type LayerType = {
  type: string;
  label: string;
  color: string; // Tailwind class for the card border (or divider fill)
  hex: string;   // the same colour, for inline styles and SVG
  icon: string;
  isDivider?: boolean;
};

// Card-type colours from the reef palette (claude-sandbox/design-system):
// each keeps its old colour family, every border is at least 3:1 on white,
// and every pair differs by at least ΔE 14.
export const LAYER_TYPES: LayerType[] = [
  // Standard blocks - now using border colors instead of background colors
  { type: "touchpoint", label: "UX Touchpoint", color: "border-[#2F6A9A]", hex: "#2F6A9A", icon: "MousePointer" },
  { type: "email", label: "Email", color: "border-[#5866A8]", hex: "#5866A8", icon: "Mail" },
  { type: "pendo", label: "Modal", color: "border-[#2E8E9C]", hex: "#2E8E9C", icon: "Monitor" },
  { type: "role", label: "Role", color: "border-[#5E8838]", hex: "#5E8838", icon: "UserCircle" },
  { type: "process", label: "Process", color: "border-[#B85A80]", hex: "#B85A80", icon: "Settings" },
  { type: "friction", label: "Friction", color: "border-[#B84A35]", hex: "#B84A35", icon: "Frown" },
  { type: "policy", label: "Policy", color: "border-[#C46A2E]", hex: "#C46A2E", icon: "FileText" },
  { type: "technology", label: "Technology", color: "border-[#6B4F96]", hex: "#6B4F96", icon: "Code" },
  { type: "rationale", label: "Rationale", color: "border-[#6B97BD]", hex: "#6B97BD", icon: "BrainCircuit" },
  { type: "question", label: "Question", color: "border-[#9B7BC4]", hex: "#9B7BC4", icon: "HelpCircle" },
  { type: "note", label: "Note", color: "border-[#8A7052]", hex: "#8A7052", icon: "StickyNote" },
  { type: "opportunities", label: "Opportunities", color: "border-[#B08A1F]", hex: "#B08A1F", icon: "Lightbulb" },
  { type: "hypothesis", label: "Hypothesis", color: "border-[#2E8A6C]", hex: "#2E8A6C", icon: "Target" },
  { type: "insight", label: "Insight", color: "border-[#A35498]", hex: "#A35498", icon: "Zap" },
  { type: "metrics", label: "Metrics", color: "border-[#2A6F88]", hex: "#2A6F88", icon: "BarChart3" },
  { type: "experiment", label: "Experiment", color: "border-[#A9762A]", hex: "#A9762A", icon: "Beaker" },
  { type: "video", label: "Video", color: "border-[#C25462]", hex: "#C25462", icon: "Play" },
  { type: "hidden", label: "Hidden Step", color: "border-[#7D878D]", hex: "#7D878D", icon: "EyeOff" },
  
  // Divider blocks
  { type: "front-stage", label: "Front-Stage", color: "bg-[rgba(74,127,166,0.9)]", hex: "#4A7FA6", icon: "Eye", isDivider: true },
  { type: "back-stage", label: "Back-Stage", color: "bg-[rgba(142,122,181,0.92)]", hex: "#8E7AB5", icon: "EyeOff", isDivider: true },
  { type: "custom-divider", label: "Custom", color: "bg-[rgba(85,100,110,0.9)]", hex: "#55646E", icon: "Separator", isDivider: true }
];