import { create } from 'zustand';
import type { CatalogEntry, InstalledSkill, Category } from '@shared/store';

interface StoreState {
  catalog: CatalogEntry[];
  installed: InstalledSkill[];
  categories: Category[];
  searchQuery: string;
  selectedCategory: string | null;
  isLoading: boolean;

  setCatalog: (catalog: CatalogEntry[]) => void;
  setInstalled: (installed: InstalledSkill[]) => void;
  setCategories: (categories: Category[]) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string | null) => void;
  setLoading: (loading: boolean) => void;
  addInstalled: (skill: InstalledSkill) => void;
  removeInstalled: (slug: string) => void;
  toggleSkill: (slug: string) => void;
}

export const useStoreStore = create<StoreState>((set) => ({
  catalog: [],
  installed: [],
  categories: [],
  searchQuery: '',
  selectedCategory: null,
  isLoading: false,

  setCatalog: (catalog) => set({ catalog }),
  setInstalled: (installed) => set({ installed }),
  setCategories: (categories) => set({ categories }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setLoading: (isLoading) => set({ isLoading }),
  addInstalled: (skill) =>
    set((state) => ({ installed: [...state.installed, skill] })),
  removeInstalled: (slug) =>
    set((state) => ({
      installed: state.installed.filter((s) => s.slug !== slug),
    })),
  toggleSkill: (slug) =>
    set((state) => ({
      installed: state.installed.map((s) =>
        s.slug === slug ? { ...s, enabled: !s.enabled } : s,
      ),
    })),
}));
