export function isValidRoomId(id: unknown): id is string {
  if (typeof id !== "string") {
    return false;
  }

  const normalized = id.trim();
  return (
    normalized.length > 0 &&
    normalized.toLowerCase() !== "undefined" &&
    normalized.toLowerCase() !== "null"
  );
}

export function normalizeRoomId(id: unknown) {
  return typeof id === "string" ? id.trim().toUpperCase() : "";
}
