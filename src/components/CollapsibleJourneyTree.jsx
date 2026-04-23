import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Clock, ExternalLink } from 'lucide-react';

const TreeNode = ({ node, level = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels

  const hasChildren = node.children && node.children.length > 0;
  const domain = node.url ? extractDomain(node.url) : 'Unknown';
  const path = node.url ? extractPath(node.url) : '';
  const dwellSeconds = node.dwell_time_ms ? (node.dwell_time_ms / 1000).toFixed(1) : '0';

  function extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return 'Unknown';
    }
  }

  function extractPath(url) {
    try {
      const path = new URL(url).pathname;
      return path === '/' ? '' : path;
    } catch {
      return '';
    }
  }

  return (
    <div className="select-none">
      {/* Node Header */}
      <div
        className={`
          flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 cursor-pointer
          transition-all duration-200 border-l-4
          ${level === 0 ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
        `}
        style={{ marginLeft: `${level * 24}px` }}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        {/* Expand/Collapse Icon */}
        {hasChildren && (
          <button className="text-gray-500 hover:text-gray-700">
            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
        )}

        {!hasChildren && <div className="w-[18px]" />}

        {/* Icon */}
        {level === 0 ? (
          <span className="text-xl">📄</span>
        ) : (
          <span className="text-lg">↳</span>
        )}

        {/* Domain and Path */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 text-sm">{domain}</span>
            {node.transition_type && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {node.transition_type}
              </span>
            )}
          </div>
          {path && (
            <p className="text-xs text-gray-500 truncate max-w-[500px]" title={path}>{path}</p>
          )}
        </div>

        {/* Dwell Time */}
        <div className="flex items-center gap-1 text-gray-600">
          <Clock size={14} />
          <span className="text-sm font-medium">{dwellSeconds}s</span>
        </div>

        {/* Visit Link */}
        {node.url && (
          <a
            href={node.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 p-1"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={16} />
          </a>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="mt-1">
          {node.children.map((child, idx) => (
            <TreeNode key={idx} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const CollapsibleJourneyTree = ({ journeyData }) => {
  if (!journeyData || !journeyData.navigation_tree) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No journey data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-xs text-gray-500">Pages</p>
          <p className="text-2xl font-bold text-blue-600">
            {journeyData.summary?.total_pages_visited || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-xs text-gray-500">Max Depth</p>
          <p className="text-2xl font-bold text-purple-600">
            {journeyData.summary?.max_depth || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-xs text-gray-500">Domains</p>
          <p className="text-2xl font-bold text-green-600">
            {journeyData.summary?.unique_domains_count || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-xs text-gray-500">Total Time</p>
          <p className="text-2xl font-bold text-orange-600">
            {journeyData.summary?.total_journey_time_ms
              ? Math.round(journeyData.summary.total_journey_time_ms / 1000) + 's'
              : '0s'}
          </p>
        </div>
      </div>

      {/* Tree */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Navigation Path
        </h3>
        <TreeNode node={journeyData.navigation_tree} level={0} />
      </div>
    </div>
  );
};

export default CollapsibleJourneyTree;
