export type StyleVaultItemType = "grooming" | "outfit";

export type StyleVaultItem = {
  id: string;
  imageUrl?: string;
  payload: Record<string, unknown>;
  savedAt: string;
  subtitle: string;
  title: string;
  type: StyleVaultItemType;
};

export const STYLE_VAULT_KEY = "style_vault";

function canUseLocalStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

export function readStyleVault(): StyleVaultItem[] {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    const value = window.localStorage.getItem(STYLE_VAULT_KEY);

    if (!value) {
      return [];
    }

    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is StyleVaultItem => {
      return (
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as StyleVaultItem).id === "string" &&
        typeof (item as StyleVaultItem).title === "string" &&
        ((item as StyleVaultItem).type === "outfit" || (item as StyleVaultItem).type === "grooming")
      );
    });
  } catch {
    return [];
  }
}

export function writeStyleVault(items: StyleVaultItem[]) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(STYLE_VAULT_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("style-vault-updated"));
}

export function upsertStyleVaultItem(item: StyleVaultItem) {
  const existingItems = readStyleVault();
  const nextItems = [
    item,
    ...existingItems.filter((existingItem) => existingItem.id !== item.id)
  ].slice(0, 60);

  writeStyleVault(nextItems);
  return nextItems;
}

export function removeStyleVaultItem(itemId: string) {
  const nextItems = readStyleVault().filter((item) => item.id !== itemId);
  writeStyleVault(nextItems);
  return nextItems;
}

export function isStyleVaultItemSaved(itemId: string) {
  return readStyleVault().some((item) => item.id === itemId);
}
