import { config } from '../../../config/environment';

export function EnvironmentBanner() {
  // Only show banner in staging environment
  if (!config.isStaging || !config.features.stagingBanner) {
    return null;
  }

  return (
    <div className="bg-orange-500 text-white text-center py-1 text-sm font-medium z-50 relative">
      🔧 STAGING ENVIRONMENT - Test data only
    </div>
  );
}

export function EnvironmentBadge() {
  if (!config.ui.showEnvironmentBadge) {
    return null;
  }

  const getBadgeStyle = () => {
    if (config.isStaging) {
      return "bg-orange-500 text-white";
    }
    if (config.isDevelopment) {
      return "bg-blue-500 text-white";
    }
    return "bg-gray-500 text-white";
  };

  return (
    <div className={`fixed top-4 left-4 px-2 py-1 rounded text-xs font-medium z-50 ${getBadgeStyle()}`}>
      {config.name.toUpperCase()}
    </div>
  );
}