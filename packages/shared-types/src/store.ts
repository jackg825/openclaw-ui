// Skill/MCP catalog types

export interface CatalogEntry {
  slug: string;
  name: string;
  description: string;
  author: string;
  version: string;
  category: string;
  tags: string[];
  downloads: number;
  rating: number;
  icon?: string;
  screenshots?: string[];
  permissions?: string[];
  mcpServer?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VersionEntry {
  version: string;
  changelog: string;
  publishedAt: string;
  minGatewayVersion?: string;
}

export interface InstalledSkill {
  slug: string;
  name: string;
  version: string;
  enabled: boolean;
  installedAt: string;
  config?: Record<string, string>;
}

export interface SearchFilters {
  category?: string;
  tags?: string[];
  minRating?: number;
  mcpOnly?: boolean;
  sortBy?: 'downloads' | 'rating' | 'updated' | 'name';
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
}
