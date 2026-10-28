/**
 * Chat list update when the visitor sends (or retries) a message.
 * A retry reuses the same request id (so the server never answers it twice). The earlier copy of that user message and its
 * error bubble are replaced, never duplicated: every message in the list keeps a unique id.
 */
type ChatItem = { id: string; error?: unknown; requestId?: string };
export function withUserMessage<T extends ChatItem>(list: T[], requestId: string, item: T): T[] {
  return [...list.filter(x => x.id !== item.id && !(x.error && x.requestId === requestId)), item];
}
