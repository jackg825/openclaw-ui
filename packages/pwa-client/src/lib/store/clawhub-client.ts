import type { CatalogEntry, VersionEntry, SearchFilters, Category } from '@shared/store';

export class ClawHubClient {
  private baseUrl: string;

  constructor(baseUrl = 'https://api.clawhub.dev') {
    this.baseUrl = baseUrl;
  }

  async search(query: string, filters?: SearchFilters): Promise<CatalogEntry[]> {
    const params = new URLSearchParams({ q: query });
    if (filters?.category) params.set('category', filters.category);
    if (filters?.tags?.length) params.set('tags', filters.tags.join(','));
    if (filters?.minRating) params.set('minRating', String(filters.minRating));
    if (filters?.mcpOnly) params.set('mcpOnly', 'true');
    if (filters?.sortBy) params.set('sortBy', filters.sortBy);
    return this._fetch<CatalogEntry[]>(`/search?${params}`);
  }

  async getSkill(slug: string): Promise<CatalogEntry> {
    return this._fetch<CatalogEntry>(`/skills/${encodeURIComponent(slug)}`);
  }

  async getVersions(slug: string): Promise<VersionEntry[]> {
    return this._fetch<VersionEntry[]>(`/skills/${encodeURIComponent(slug)}/versions`);
  }

  async getPopular(limit = 20): Promise<CatalogEntry[]> {
    return this._fetch<CatalogEntry[]>(`/popular?limit=${limit}`);
  }

  async getCategories(): Promise<Category[]> {
    return this._fetch<Category[]>('/categories');
  }

  private async _fetch<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`);
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`ClawHub API error ${response.status}: ${body}`);
    }
    return response.json();
  }
}
