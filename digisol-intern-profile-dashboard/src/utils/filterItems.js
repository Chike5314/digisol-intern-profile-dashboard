export function filterItems(items, { query = "", visibility = "ALL" } = {}) {
  const q = query.trim().toLowerCase();
  return items.filter((item) => {
    if (visibility !== "ALL" && item.visibility !== visibility) return false;
    if (!q) return true;
    const haystack = [item.name, item.department, item.caption, item.field, item.school]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}
