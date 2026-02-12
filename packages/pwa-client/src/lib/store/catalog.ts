import type { CatalogEntry, SearchFilters, Category } from '@shared/store';
import type { ClawHubClient } from './clawhub-client';
import type { MCPRegistryClient } from './mcp-registry-client';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export class CatalogService {
  private cache = new Map<string, CacheEntry<unknown>>();

  constructor(
    private clawhub: ClawHubClient,
    private mcpRegistry: MCPRegistryClient,
  ) {}

  async unifiedSearch(query: string, filters?: SearchFilters): Promise<CatalogEntry[]> {
    const cacheKey = `search:${query}:${JSON.stringify(filters ?? {})}`;
    const cached = this.getFromCache<CatalogEntry[]>(cacheKey);
    if (cached) return cached;

    const [clawhubResults, mcpResults] = await Promise.allSettled([
      this.clawhub.search(query, filters),
      this.mcpRegistry.search(query, filters),
    ]);

    const results: CatalogEntry[] = [];
    if (clawhubResults.status === 'fulfilled') results.push(...clawhubResults.value);
    if (mcpResults.status === 'fulfilled') results.push(...mcpResults.value);

    const deduplicated = this.deduplicate(results);
    this.setCache(cacheKey, deduplicated);
    return deduplicated;
  }

  async getPopular(limit = 20): Promise<CatalogEntry[]> {
    const cacheKey = `popular:${limit}`;
    const cached = this.getFromCache<CatalogEntry[]>(cacheKey);
    if (cached) return cached;

    const results = await this.clawhub.getPopular(limit);
    this.setCache(cacheKey, results);
    return results;
  }

  async getCategories(): Promise<Category[]> {
    const cacheKey = 'categories';
    const cached = this.getFromCache<Category[]>(cacheKey);
    if (cached) return cached;

    const results = await this.clawhub.getCategories();
    this.setCache(cacheKey, results);
    return results;
  }

  clearCache(): void {
    this.cache.clear();
  }

  private deduplicate(entries: CatalogEntry[]): CatalogEntry[] {
    const seen = new Map<string, CatalogEntry>();
    for (const entry of entries) {
      if (!seen.has(entry.slug)) {
        seen.set(entry.slug, entry);
      }
    }
    return Array.from(seen.values());
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (entry && entry.expiresAt > Date.now()) return entry.data;
    if (entry) this.cache.delete(key);
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
  }
}
