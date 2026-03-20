import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { X } from 'lucide-react';
import { EVENT_CATEGORIES, EventCategory } from '../config/categories';

interface CategoryFilterProps {
  selectedCategories: Set<string>;
  onToggleCategory: (categoryId: string) => void;
  onClearAll: () => void;
  eventCounts: Record<string, number>;
}

export function CategoryFilter({ selectedCategories, onToggleCategory, onClearAll, eventCounts }: CategoryFilterProps) {
  const allSelected = selectedCategories.size === EVENT_CATEGORIES.length;
  const someSelected = selectedCategories.size > 0 && selectedCategories.size < EVENT_CATEGORIES.length;

  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Filter by Category</h3>
        {someSelected && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-7 text-xs"
          >
            Clear Filters
          </Button>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2">
        {EVENT_CATEGORIES.map(category => {
          const isSelected = selectedCategories.has(category.id);
          const count = eventCounts[category.id] || 0;
          
          return (
            <button
              key={category.id}
              onClick={() => onToggleCategory(category.id)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border-2 ${
                isSelected
                  ? `${category.bgColor} ${category.color} ${category.borderColor}`
                  : 'bg-muted text-muted-foreground border-transparent opacity-50 hover:opacity-100'
              }`}
              title={category.description}
            >
              <span className={`w-2 h-2 rounded-full ${isSelected ? category.bgColor.replace('100', '500') : 'bg-muted-foreground'}`} />
              <span>{category.label}</span>
              {count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                  isSelected ? 'bg-white/50' : 'bg-muted-foreground/20'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
        <p>
          {allSelected && 'Showing all categories'}
          {someSelected && `Showing ${selectedCategories.size} of ${EVENT_CATEGORIES.length} categories`}
          {selectedCategories.size === 0 && 'No categories selected (showing none)'}
        </p>
      </div>
    </div>
  );
}
