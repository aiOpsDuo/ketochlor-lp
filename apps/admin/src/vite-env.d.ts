/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
  /** Opcional — default `"images"` (ver `lib/media-upload.ts`). */
  readonly VITE_SUPABASE_STORAGE_BUCKET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
