import React from 'react';
import { config } from '../../../config/environment';
import { AlertTriangle } from 'lucide-react';

export function EnvironmentBanner() {
  // Only show banner in staging environment
  if (!config.isStaging || !config.features.stagingBanner) {
    return null;
  }

  return (
    <div className="bg-orange-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 relative z-50">
      <AlertTriangle className="w-4 h-4" />
      <span>STAGING ENVIRONMENT - Test data only</span>
      <AlertTriangle className="w-4 h-4" />
    </div>
  );
}

export function EnvironmentBadge() {
  if (!config.ui.showEnvironmentBadge) {
    return null;
  }

  const badgeColor = config.isStaging 
    ? 'bg-orange-500 text-white' 
    : config.isDevelopment 
    ? 'bg-blue-500 text-white'
    : 'bg-green-500 text-white';

  return (
    <div className={`fixed top-4 right-4 px-2 py-1 rounded text-xs font-bold z-50 ${badgeColor}`}>
      {config.name.toUpperCase()}
    </div>
  );
}