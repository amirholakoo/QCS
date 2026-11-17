/**
 * Utility for production line color coding
 * Each production line gets a distinct color for easy visual identification
 */

interface ProductionLineColors {
  bg: string;
  text: string;
  label: string;
}

/**
 * Get color classes for a production line badge
 * @param productionLine - The production line number (0 for shared, 2-4 for PM2-PM4)
 * @returns Object with background and text color classes
 */
export const getProductionLineColors = (productionLine: number | null | undefined): ProductionLineColors => {
  switch (productionLine) {
    case 0:
      // Shared/مشترک - Orange
      return {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        label: 'مشترک'
      };
    case 2:
      // PM2 - Blue
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        label: 'PM2'
      };
    case 3:
      // PM3 - Green
      return {
        bg: 'bg-green-100',
        text: 'text-green-700',
        label: 'PM3'
      };
    case 4:
      // PM4 - Purple
      return {
        bg: 'bg-purple-100',
        text: 'text-purple-700',
        label: 'PM4'
      };
    default:
      // Default - Gray
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        label: productionLine ? `PM${productionLine}` : '-'
      };
  }
};

