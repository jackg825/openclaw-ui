import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CatalogEntry, VersionEntry, InstalledSkill } from '@shared/store';

interface SkillDetailProps {
  skill: CatalogEntry;
  versions: VersionEntry[];
  installed?: InstalledSkill;
  onInstall: (slug: string) => void;
  onUninstall: (slug: string) => void;
  onBack: () => void;
}

export function SkillDetail({
  skill,
  versions,
  installed,
  onInstall,
  onUninstall,
  onBack,
}: SkillDetailProps) {
  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="mb-2">
        &larr; Back to Store
      </Button>

      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl">
          {skill.icon ? (
            <img src={skill.icon} alt="" className="h-12 w-12 rounded-lg" />
          ) : (
            skill.name.charAt(0).toUpperCase()
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{skill.name}</h1>
            {skill.mcpServer && (
              <span className="rounded bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-500">
                MCP Server
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">by {skill.author}</p>
          <p className="mt-2 text-sm">{skill.description}</p>
        </div>

        <div>
          {installed ? (
            <Button variant="destructive" onClick={() => onUninstall(skill.slug)}>
              Uninstall
            </Button>
          ) : (
            <Button onClick={() => onInstall(skill.slug)}>Install</Button>
          )}
        </div>
      </div>

      {skill.screenshots && skill.screenshots.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Screenshots</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {skill.screenshots.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`Screenshot ${i + 1}`}
                className="h-48 rounded-lg border object-cover"
              />
            ))}
          </div>
        </section>
      )}

      {skill.permissions && skill.permissions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {skill.permissions.map((perm) => (
                <li key={perm} className="flex items-center gap-2 text-sm">
                  <span className="text-yellow-500">&#9888;</span>
                  {perm}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {versions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Version History</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {versions.map((v) => (
                <li key={v.version} className="border-b pb-2 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">v{v.version}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(v.publishedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{v.changelog}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <dl className="grid grid-cols-2 gap-2">
            <dt className="text-muted-foreground">Category</dt>
            <dd>{skill.category}</dd>
            <dt className="text-muted-foreground">Version</dt>
            <dd>{skill.version}</dd>
            <dt className="text-muted-foreground">Downloads</dt>
            <dd>{skill.downloads.toLocaleString()}</dd>
            <dt className="text-muted-foreground">Tags</dt>
            <dd>{skill.tags.join(', ') || 'None'}</dd>
            <dt className="text-muted-foreground">Updated</dt>
            <dd>{new Date(skill.updatedAt).toLocaleDateString()}</dd>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
