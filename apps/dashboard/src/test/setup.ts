import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= "sb_publishable_demo";

// jsdom ships no layout engine, so anything that scrolls or asks about motion
// preferences throws unless it is stubbed here.
Element.prototype.scrollIntoView ??= vi.fn();

window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
})) as typeof window.matchMedia;

vi.mock("next/navigation", () => ({
  redirect: (href: string) => {
    throw new Error(`NEXT_REDIRECT:${href}`);
  },
  usePathname: () => "/",
  useRouter: () => ({
    prefetch: vi.fn(),
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));
