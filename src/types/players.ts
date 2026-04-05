// -----------------------------
// 🆔 Branded ID (safer than plain string)
// -----------------------------
export type PlayerId = string & { readonly brand: 'PlayerId' };

// -----------------------------
// 👤 Player
// -----------------------------
export type Player = {
  id: PlayerId;

  /**
   * Display name
   */
  name: string;

  /**
   * Optional UI color (hex, rgb, etc.)
   */
  color?: string;

  /**
   * Creation timestamp
   */
  createdAt?: number;

  /**
   * Optional metadata for extensibility
   */
  meta?: Record<string, unknown>;
};
