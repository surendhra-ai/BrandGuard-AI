import React from 'react';
import { DiscrepancySeverity } from '../types';

export const StatusBadge: React.FC<{ status: string | DiscrepancySeverity }> = ({ status }) => {
  let colorClass = "bg-gray-100 text-gray-800";

  switch (status) {
    case DiscrepancySeverity.CRITICAL:
    case 'NON_COMPLIANT':
      colorClass = "bg-red-100 text-red-800 border border-red-200";
      break;
    case DiscrepancySeverity.MAJOR:
      colorClass = "bg-orange-100 text-orange-800 border border-orange-200";
      break;
    case DiscrepancySeverity.MINOR:
      colorClass = "bg-yellow-100 text-yellow-800 border border-yellow-200";
      break;
    case 'COMPLIANT':
    case 'MATCH':
      colorClass = "bg-green-100 text-green-800 border border-green-200";
      break;
    case 'ANALYZING':
      colorClass = "bg-blue-100 text-blue-800 animate-pulse";
      break;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {status}
    </span>
  );
};