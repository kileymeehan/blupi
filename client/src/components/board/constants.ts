export const LAYER_TYPES = [
  { type: 'touchpoint', label: 'Touchpoint', color: 'bg-blue-600/20' },
  { type: 'email', label: 'Email Touchpoint', color: 'bg-indigo-500/20' },
  { type: 'pendo', label: 'Pendo Touchpoint', color: 'bg-cyan-600/20' },
  { type: 'role', label: 'Role', color: 'bg-green-200' },
  { type: 'process', label: 'Process', color: 'bg-pink-200' },
  { type: 'friction', label: 'Friction', color: 'bg-red-200' },
  { type: 'policy', label: 'Policy', color: 'bg-orange-200' },
  { type: 'technology', label: 'Technology', color: 'bg-purple-200' },
  { type: 'rationale', label: 'Rationale', color: 'bg-blue-200' },
  { type: 'question', label: 'Question', color: 'bg-violet-200' },
  { type: 'note', label: 'Note', color: 'bg-cyan-200' },
  { type: 'hidden', label: 'Hidden Step', color: 'bg-gray-400' }
] as const;
