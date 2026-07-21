export const GROUP_COLORS = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];

export function colorForDomain(domain) {
  let hash = 0;
  for (const char of domain) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return GROUP_COLORS[hash % GROUP_COLORS.length];
}

export function getDomain(url) {
  try {
    const parsed = new URL(url);
    if (!parsed.protocol.startsWith('http')) return null;
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

let sortTimeout = null;
let isSorting = false;
let sortAgain = false;

export function scheduleSort() {
  clearTimeout(sortTimeout);
  sortTimeout = setTimeout(runSort, 500);
}

export async function runSort() {
  if (isSorting) {
    sortAgain = true;
    return;
  }
  isSorting = true;
  try {
    await sortAllWindows();
  } finally {
    isSorting = false;
  }
  if (sortAgain) {
    sortAgain = false;
    scheduleSort();
  }
}

export async function sortAllWindows() {
  const windows = await chrome.windows.getAll({ populate: true, windowTypes: ['normal'] });
  for (const win of windows) {
    try {
      await sortWindow(win);
    } catch (err) {
      console.warn(`auto-tab-sort: failed to sort window ${win.id}`, err);
    }
  }
}

export async function getManagedGroups(windowId) {
  const key = `managed_${windowId}`;
  const stored = await chrome.storage.session.get(key);
  return stored[key] || {};
}

export async function setManagedGroups(windowId, map) {
  const key = `managed_${windowId}`;
  await chrome.storage.session.set({ [key]: map });
}

export async function sortWindow(win) {
  const existingGroups = await chrome.tabGroups.query({ windowId: win.id });
  const existingGroupIds = new Set(existingGroups.map((g) => g.id));

  const managedGroups = await getManagedGroups(win.id);
  for (const domain of Object.keys(managedGroups)) {
    if (!existingGroupIds.has(managedGroups[domain])) delete managedGroups[domain];
  }

  // Groupes déjà présents dont le titre et la couleur correspondent exactement à ce que
  // l'extension aurait produit pour ce domaine : on les considère comme les nôtres, même
  // si on en a perdu la trace (le stockage de session est vidé à la fermeture du
  // navigateur). Ça fusionne aussi les doublons déjà créés pendant cette perte de suivi.
  const groupRedirect = new Map();
  const groupsByRecognizedTitle = new Map();
  for (const group of existingGroups) {
    if (!group.title || group.color !== colorForDomain(group.title)) continue;
    if (!groupsByRecognizedTitle.has(group.title)) groupsByRecognizedTitle.set(group.title, []);
    groupsByRecognizedTitle.get(group.title).push(group.id);
  }
  for (const [domain, ids] of groupsByRecognizedTitle) {
    const canonical = ids.includes(managedGroups[domain]) ? managedGroups[domain] : ids[0];
    managedGroups[domain] = canonical;
    for (const id of ids) {
      if (id !== canonical) groupRedirect.set(id, canonical);
    }
  }

  const knownGroupIds = new Set([...Object.values(managedGroups), ...groupRedirect.keys()]);

  const allTabs = win.tabs;
  const pinnedCount = allTabs.filter((t) => t.pinned).length;
  // Onglets déjà dans un groupe que l'extension n'a pas créé : on n'y touche pas,
  // comme pour les onglets épinglés, afin de ne jamais démanteler un groupe manuel.
  const tabs = allTabs.filter((t) => {
    if (t.pinned) return false;
    if (t.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE && !knownGroupIds.has(t.groupId)) return false;
    return true;
  });

  const byDomain = new Map();
  const singles = [];

  for (const tab of tabs) {
    const domain = getDomain(tab.pendingUrl || tab.url);
    if (!domain) {
      singles.push(tab);
      continue;
    }
    if (!byDomain.has(domain)) byDomain.set(domain, []);
    byDomain.get(domain).push(tab);
  }

  for (const [domain, domainTabs] of [...byDomain]) {
    if (domainTabs.length < 2) {
      byDomain.delete(domain);
      singles.push(...domainTabs);
    }
  }

  let index = pinnedCount;

  // Les onglets isolés (hors groupe) sont affichés avant les groupes de domaine.
  const sortedSingles = singles.sort((a, b) => (a.url || '').localeCompare(b.url || ''));
  for (const tab of sortedSingles) {
    try {
      if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE && knownGroupIds.has(tab.groupId)) {
        await chrome.tabs.ungroup(tab.id);
      }
      await chrome.tabs.move(tab.id, { index });
      index += 1;
    } catch (err) {
      console.warn(`auto-tab-sort: failed to place tab ${tab.id}`, err);
    }
  }

  const sortedDomains = [...byDomain.keys()].sort((a, b) => a.localeCompare(b));
  for (const domain of sortedDomains) {
    const domainTabs = byDomain.get(domain).sort((a, b) => (a.url || '').localeCompare(b.url || ''));
    const tabIds = domainTabs.map((t) => t.id);
    const existingId = managedGroups[domain];

    try {
      let groupId;
      if (existingId !== undefined) {
        groupId = await chrome.tabs.group({ tabIds, groupId: existingId });
      } else {
        groupId = await chrome.tabs.group({ tabIds, createProperties: { windowId: win.id } });
        await chrome.tabGroups.update(groupId, { title: domain, color: colorForDomain(domain) });
      }
      managedGroups[domain] = groupId;
      await chrome.tabGroups.move(groupId, { index });
      index += domainTabs.length;
    } catch (err) {
      console.warn(`auto-tab-sort: failed to group domain "${domain}"`, err);
    }
  }

  await setManagedGroups(win.id, managedGroups);
}

chrome.tabs.onCreated.addListener(scheduleSort);
chrome.tabs.onRemoved.addListener(scheduleSort);
chrome.tabs.onAttached.addListener(scheduleSort);
chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (changeInfo.status === 'complete') scheduleSort();
});

chrome.action.onClicked.addListener(() => {
  clearTimeout(sortTimeout);
  runSort();
});
