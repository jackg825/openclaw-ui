import type { CatalogEntry, VersionEntry, SearchFilters } from '@shared/store';

export class MCPRegistryClient {
  private baseUrl: string;

  constructor(baseUrl = 'https://registry.mcp.run') {
    this.baseUrl = baseUrl;
  }

  async search(query: string, filters?: SearchFilters): Promise<CatalogEntry[]> {
    const params = new URLSearchParams({ q: query });
    if (filters?.category) params.set('category', filters.category);
    if (filters?.tags?.length) params.set('tags', filters.tags.join(','));
    if (filters?.sortBy) params.set('sortBy', filters.sortBy);
    return this._fetch<CatalogEntry[]>(`/search?${params}`);
  }

  async getServer(slug: string): Promise<CatalogEntry> {
    return this._fetch<CatalogEntry>(`/servers/${encodeURIComponent(slug)}`);
  }

  async getVersions(slug: string): Promise<VersionEntry[]> {
    return this._fetch<VersionEntry[]>(`/servers/${encodeURIComponent(slug)}/versions`);
  }

  private async _fetch<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`);
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`MCP Registry error ${response.status}: ${body}`);
    }
    return response.json();
  }
}
