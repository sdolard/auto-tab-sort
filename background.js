const GROUP_COLORS = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];

function colorForDomain(domain) {
  let hash = 0;
  for (const char of domain) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return GROUP_COLORS[hash % GROUP_COLORS.length];
}

function getDomain(url) {
  try {
    const parsed = new URL(url);
    if (!parsed.protocol.startsWith('http')) return null;
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

let sortTimeout = null;
function scheduleSort() {
  clearTimeout(sortTimeout);
  sortTimeout = setTimeout(sortAllWindows, 500);
}

async function sortAllWindows() {
  const windows = await chrome.windows.getAll({ populate: true });
  for (const win of windows) {
    await sortWindow(win);
  }
}

async function sortWindow(win) {
  const allTabs = win.tabs;
  const pinnedCount = allTabs.filter((t) => t.pinned).length;
  const tabs = allTabs.filter((t) => !t.pinned);
  if (tabs.length < 2) return;

  const byDomain = new Map();
  const singles = [];

  for (const tab of tabs) {
    const domain = getDomain(tab.url);
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

  const existingGroups = await chrome.tabGroups.query({ windowId: win.id });
  const groupIdByTitle = new Map(existingGroups.map((g) => [g.title, g.id]));

  const sortedDomains = [...byDomain.keys()].sort((a, b) => a.localeCompare(b));
  let index = pinnedCount;

  for (const domain of sortedDomains) {
    const domainTabs = byDomain.get(domain).sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    const tabIds = domainTabs.map((t) => t.id);
    const existingId = groupIdByTitle.get(domain);

    let groupId;
    if (existingId !== undefined) {
      groupId = await chrome.tabs.group({ tabIds, groupId: existingId });
    } else {
      groupId = await chrome.tabs.group({ tabIds, createProperties: { windowId: win.id } });
      await chrome.tabGroups.update(groupId, { title: domain, color: colorForDomain(domain) });
    }
    await chrome.tabGroups.move(groupId, { index });
    index += domainTabs.length;
  }

  const sortedSingles = singles.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  for (const tab of sortedSingles) {
    if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
      await chrome.tabs.ungroup(tab.id);
    }
    await chrome.tabs.move(tab.id, { index });
    index += 1;
  }
}

chrome.tabs.onCreated.addListener(scheduleSort);
chrome.tabs.onRemoved.addListener(scheduleSort);
chrome.tabs.onAttached.addListener(scheduleSort);
chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (changeInfo.status === 'complete') scheduleSort();
});
