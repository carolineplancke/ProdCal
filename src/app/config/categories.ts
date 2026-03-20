// Event category definitions with colors
export interface EventCategory {
  id: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

export const EVENT_CATEGORIES: EventCategory[] = [
  {
    id: 'product',
    label: 'Product',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    description: 'Product launches, roadmap planning, feature reviews'
  },
    {
    id: 'release',
    label: 'Product Release',
    color: 'text-lime-700',
    bgColor: 'bg-lime-100',
    borderColor: 'border-lime-300',
    description: 'Product releases'
  },
  {
    id: 'health',
    label: 'Health',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
    description: 'Health meetings, wellness initiatives'
  },
  {
    id: 'insurance',
    label: 'Insurance',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-300',
    description: 'Insurance-related meetings and planning'
  },
  {
    id: 'engineering',
    label: 'Engineering',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
    description: 'Engineering sprints, technical reviews, deployments'
  },
  {
    id: 'marketing',
    label: 'Marketing',
    color: 'text-pink-700',
    bgColor: 'bg-pink-100',
    borderColor: 'border-pink-300',
    description: 'Marketing campaigns, brand events, launches'
  },
  {
    id: 'sales',
    label: 'Sales',
    color: 'text-teal-700',
    bgColor: 'bg-teal-100',
    borderColor: 'border-teal-300',
    description: 'Sales meetings, pipeline reviews, customer calls'
  },
  {
    id: 'general',
    label: 'General',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    description: 'General meetings and uncategorized events'
  }
];

export function getCategoryById(categoryId: string | null | undefined): EventCategory {
  if (!categoryId) {
    return EVENT_CATEGORIES.find(c => c.id === 'general')!;
  }
  return EVENT_CATEGORIES.find(c => c.id === categoryId) || EVENT_CATEGORIES.find(c => c.id === 'general')!;
}

export function getCategoryColors(categoryId: string | null | undefined) {
  const category = getCategoryById(categoryId);
  return {
    color: category.color,
    bgColor: category.bgColor,
    borderColor: category.borderColor
  };
}
