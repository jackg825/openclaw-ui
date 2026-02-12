import { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SkillCard } from './SkillCard';
import { useStoreStore } from '@/stores/store';
import type { Category } from '@shared/store';

interface StoreHomeProps {
  onSelectSkill: (slug: string) => void;
  onInstallSkill: (slug: string) => void;
  onSearch: (query: string) => void;
  onLoadPopular: () => void;
  onLoadCategories: () => void;
}

function CategoryChip({
  category,
  selected,
  onClick,
}: {
  category: Category;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant={selected ? 'default' : 'outline'}
      size="sm"
      onClick={onClick}
      className="shrink-0"
    >
      {category.icon} {category.name}
      <span className="ml-1 text-xs opacity-60">{category.count}</span>
    </Button>
  );
}

export function StoreHome({
  onSelectSkill,
  onInstallSkill,
  onSearch,
  onLoadPopular,
  onLoadCategories,
}: StoreHomeProps) {
  const {
    catalog,
    categories,
    installed,
    searchQuery,
    selectedCategory,
    isLoading,
    setSearchQuery,
    setSelectedCategory,
  } = useStoreStore();

  useEffect(() => {
    onLoadPopular();
    onLoadCategories();
  }, [onLoadPopular, onLoadCategories]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.length >= 2) {
      onSearch(value);
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    const newCategory = selectedCategory === categoryId ? null : categoryId;
    setSelectedCategory(newCategory);
    if (newCategory) {
      onSearch(searchQuery || '*');
    }
  };

  const filteredCatalog = selectedCategory
    ? catalog.filter((entry) => entry.category === selectedCategory)
    : catalog;

  const featured = filteredCatalog.slice(0, 3);
  const popular = filteredCatalog.slice(3);

  return (
    <div className="space-y-6">
      <div>
        <Input
          placeholder="Search skills and MCP servers..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="max-w-md"
        />
      </div>

      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <CategoryChip
              key={cat.id}
              category={cat}
              selected={selectedCategory === cat.id}
              onClick={() => handleCategoryClick(cat.id)}
            />
          ))}
        </div>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

      {featured.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Featured</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((entry) => (
              <SkillCard
                key={entry.slug}
                entry={entry}
                installed={installed.find((i) => i.slug === entry.slug)}
                onSelect={onSelectSkill}
                onInstall={onInstallSkill}
              />
            ))}
          </div>
        </section>
      )}

      {popular.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Popular</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {popular.map((entry) => (
              <SkillCard
                key={entry.slug}
                entry={entry}
                installed={installed.find((i) => i.slug === entry.slug)}
                onSelect={onSelectSkill}
                onInstall={onInstallSkill}
              />
            ))}
          </div>
        </section>
      )}

      {!isLoading && filteredCatalog.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          {searchQuery ? 'No results found.' : 'No skills available.'}
        </p>
      )}
    </div>
  );
}
