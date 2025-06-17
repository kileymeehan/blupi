import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { projectStatuses, boardStatuses } from "@shared/schema";

interface StatusSelectorProps {
  value: string;
  onChange: (value: string) => void;
  type: 'project' | 'board';
  disabled?: boolean;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-700';
    case 'in-progress':
      return 'bg-blue-100 text-blue-700';
    case 'review':
      return 'bg-yellow-100 text-yellow-700';
    case 'complete':
      return 'bg-green-100 text-green-700';
    case 'archived':
      return 'bg-red-100 text-red-700';
    case 'active':
      return 'bg-green-100 text-green-700';
    case 'Active':
      return 'bg-green-100 text-green-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

export function StatusSelector({ value, onChange, type, disabled = false }: StatusSelectorProps) {
  // Add archived status only for projects
  const statuses = type === 'project' 
    ? [...projectStatuses, 'archived']
    : boardStatuses;

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="Status">
          {value && (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(value)}`}>
              {value}
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {statuses.map((status) => (
          <SelectItem 
            key={status} 
            value={status}
            className="flex items-center space-x-2"
          >
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
              {status}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}