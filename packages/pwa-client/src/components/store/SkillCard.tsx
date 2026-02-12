import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { CatalogEntry, InstalledSkill } from '@shared/store';

function RatingStars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span className="text-xs text-yellow-500" aria-label={`${rating} out of 5 stars`}>
      {'★'.repeat(full)}
      {half ? '½' : ''}
      {'☆'.repeat(5 - full - (half ? 1 : 0))}
    </span>
  );
}

interface SkillCardProps {
  entry: CatalogEntry;
  installed?: InstalledSkill;
  onSelect: (slug: string) => void;
  onInstall: (slug: string) => void;
}

export function SkillCard({ entry, installed, onSelect, onInstall }: SkillCardProps) {
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onSelect(entry.slug)}
    >
      <CardContent className="flex gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-lg">
          {entry.icon ? (
            <img src={entry.icon} alt="" className="h-8 w-8 rounded" />
          ) : (
            entry.name.charAt(0).toUpperCase()
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-medium">{entry.name}</h3>
            {entry.mcpServer && (
              <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-500">
                MCP
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{entry.author}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{entry.description}</p>

          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RatingStars rating={entry.rating} />
              <span className="text-xs text-muted-foreground">
                {entry.downloads.toLocaleString()} downloads
              </span>
            </div>

            {installed ? (
              <span className="rounded bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500">
                Installed
              </span>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onInstall(entry.slug);
                }}
              >
                Install
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
