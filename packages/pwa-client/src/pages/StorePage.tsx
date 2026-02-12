import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { useStoreStore } from '@/stores/store';

const PLACEHOLDER_CATEGORIES = [
  'All',
  'Code Generation',
  'DevOps',
  'Data Analysis',
  'Research',
  'Utilities',
];

export function StorePage() {
  const { searchQuery, setSearchQuery, selectedCategory, setSelectedCategory } =
    useStoreStore();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Skill Store</h1>
        <p className="text-muted-foreground">
          Browse and install skills for your OpenClaw gateway
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search skills..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {PLACEHOLDER_CATEGORIES.map((cat) => (
          <Badge
            key={cat}
            variant={
              (cat === 'All' && !selectedCategory) ||
              selectedCategory === cat
                ? 'default'
                : 'outline'
            }
            className="cursor-pointer"
            onClick={() =>
              setSelectedCategory(cat === 'All' ? null : cat)
            }
          >
            {cat}
          </Badge>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="cursor-pointer hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="text-base">Skill Placeholder {i}</CardTitle>
              <CardDescription>
                A placeholder skill card for the store UI layout.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>v1.0.0</span>
                <span>-</span>
                <span>1.2k downloads</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
