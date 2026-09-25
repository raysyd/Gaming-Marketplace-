/**
 * Limits for photos sent in chat — shared by the Messenger's picker, the
 * /api/messages validation and (by value) supabase/24-chat-images.sql's
 * bucket settings, so the three can't drift apart.
 */
export const CHAT_IMAGE_BUCKET = "chat-images";
export const MAX_CHAT_IMAGE_BYTES = 5 * 1024 * 1024;
export const CHAT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Why a file can't be sent, or null if it can. */
export function chatImageProblem(file: { type: string; size: number }): string | null {
  if (!CHAT_IMAGE_TYPES.includes(file.type)) return "Photos need to be JPEG, PNG, WebP or GIF.";
  if (file.size > MAX_CHAT_IMAGE_BYTES) return "That photo is over 5 MB — try a smaller one.";
  return null;
}

/** Storage path for a new photo in a conversation: <conversation id>/<uuid>.<ext>. */
export function chatImagePath(conversationId: string, type: string, id: string): string {
  return `${conversationId}/${id}.${EXT_BY_TYPE[type] ?? "jpg"}`;
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const PATH_RE = new RegExp(`^(${UUID})/${UUID}\\.(jpg|png|webp|gif)$`, "i");

/** Server-side check that a submitted path is a chat photo in *this*
 * conversation — never trust the client to point at someone else's folder. */
export function isChatImagePathFor(path: unknown, conversationId: string): boolean {
  if (typeof path !== "string") return false;
  const m = PATH_RE.exec(path);
  return Boolean(m && m[1].toLowerCase() === conversationId.toLowerCase());
}
