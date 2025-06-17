import { LAYER_TYPES } from './constants';

// Helper function to get the icon name for a block type
export function getIconForBlockType(blockType: string): string {
  const layerType = LAYER_TYPES.find(layer => layer.type === blockType);
  return layerType?.icon || 'Square';
}