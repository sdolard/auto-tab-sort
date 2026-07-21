import { describe, it, expect, vi, beforeEach } from 'vitest';

function createMockChrome() {
  const groups = [];
  const store = {};
  let nextGroupId = 1;

  return {
    __groups: groups,
    __store: store,
    tabGroups: {
      TAB_GROUP_ID_NONE: -1,
      query: vi.fn(async ({ windowId }) => groups.filter((g) => g.windowId === windowId)),
      move: vi.fn(async () => {}),
      update: vi.fn(async (groupId, props) => {
        const group = groups.find((g) => g.id === groupId);
        if (group) Object.assign(group, props);
      }),
    },
    tabs: {
      group: vi.fn(async ({ tabIds, groupId, createProperties }) => {
        if (groupId !== undefined) return groupId;
        const id = nextGroupId++;
        groups.push({ id, windowId: createProperties.windowId });
        return id;
      }),
      ungroup: vi.fn(async () => {}),
      move: vi.fn(async () => {}),
      remove: vi.fn(async () => {}),
      update: vi.fn(async () => {}),
      onCreated: { addListener: vi.fn() },
      onRemoved: { addListener: vi.fn() },
      onAttached: { addListener: vi.fn() },
      onUpdated: { addListener: vi.fn() },
    },
    action: {
      onClicked: { addListener: vi.fn() },
    },
    windows: {
      getAll: vi.fn(async () => []),
    },
    storage: {
      session: {
        get: vi.fn(async (key) => (key in store ? { [key]: store[key] } : {})),
        set: vi.fn(async (obj) => Object.assign(store, obj)),
      },
    },
  };
}

let idCounter;
function makeTab(overrides = {}) {
  idCounter += 1;
  return {
    id: idCounter,
    url: '',
    pendingUrl: undefined,
    pinned: false,
    groupId: -1,
    ...overrides,
  };
}

let chromeMock;

async function loadBackground() {
  vi.resetModules();
  chromeMock = createMockChrome();
  vi.stubGlobal('chrome', chromeMock);
  return import('./background.js');
}

beforeEach(() => {
  idCounter = 0;
});

describe('getDomain', () => {
  it('extrait le hostname et retire le préfixe www.', async () => {
    const { getDomain } = await loadBackground();
    expect(getDomain('https://www.example.com/path')).toBe('example.com');
    expect(getDomain('http://github.com/foo')).toBe('github.com');
  });

  it('retourne null pour les URLs non http(s) ou invalides', async () => {
    const { getDomain } = await loadBackground();
    expect(getDomain('chrome://extensions')).toBeNull();
    expect(getDomain('about:blank')).toBeNull();
    expect(getDomain('not a url')).toBeNull();
  });
});

describe('colorForDomain', () => {
  it('est déterministe pour un même domaine', async () => {
    const { colorForDomain } = await loadBackground();
    expect(colorForDomain('github.com')).toBe(colorForDomain('github.com'));
  });

  it('retourne toujours une couleur de la palette', async () => {
    const { colorForDomain, GROUP_COLORS } = await loadBackground();
    expect(GROUP_COLORS).toContain(colorForDomain('example.com'));
    expect(GROUP_COLORS).toContain(colorForDomain('a-very-different-domain.org'));
  });
});

describe('dedupeTabs', () => {
  it('ferme les onglets en double et garde le premier de chaque URL', async () => {
    const { dedupeTabs } = await loadBackground();
    const tabs = [
      makeTab({ id: 1, url: 'https://github.com/a' }),
      makeTab({ id: 2, url: 'https://github.com/a' }),
      makeTab({ id: 3, url: 'https://github.com/b' }),
    ];

    const result = await dedupeTabs(tabs);

    expect(chromeMock.tabs.remove).toHaveBeenCalledWith([2]);
    expect(result.map((t) => t.id)).toEqual([1, 3]);
  });

  it("ne fait rien s'il n'y a pas de doublon", async () => {
    const { dedupeTabs } = await loadBackground();
    const tabs = [makeTab({ id: 1, url: 'https://github.com/a' }), makeTab({ id: 2, url: 'https://github.com/b' })];

    const result = await dedupeTabs(tabs);

    expect(chromeMock.tabs.remove).not.toHaveBeenCalled();
    expect(chromeMock.tabs.update).not.toHaveBeenCalled();
    expect(result).toEqual(tabs);
  });

  it("sélectionne l'onglet original AVANT de fermer le doublon actif, pour éviter toute course avec la réassignation native de Chrome", async () => {
    const { dedupeTabs } = await loadBackground();
    const tabs = [
      makeTab({ id: 1, url: 'https://github.com/a' }),
      makeTab({ id: 2, url: 'https://github.com/a', active: true }),
    ];

    await dedupeTabs(tabs);

    expect(chromeMock.tabs.update).toHaveBeenCalledWith(1, { active: true });
    expect(chromeMock.tabs.remove).toHaveBeenCalledWith([2]);
    const updateOrder = chromeMock.tabs.update.mock.invocationCallOrder[0];
    const removeOrder = chromeMock.tabs.remove.mock.invocationCallOrder[0];
    expect(updateOrder).toBeLessThan(removeOrder);
  });

  it("ne change pas la sélection si l'onglet actif n'est pas un doublon", async () => {
    const { dedupeTabs } = await loadBackground();
    const tabs = [
      makeTab({ id: 1, url: 'https://github.com/a', active: true }),
      makeTab({ id: 2, url: 'https://github.com/b' }),
      makeTab({ id: 3, url: 'https://github.com/b' }),
    ];

    await dedupeTabs(tabs);

    expect(chromeMock.tabs.remove).toHaveBeenCalledWith([3]);
    expect(chromeMock.tabs.update).not.toHaveBeenCalled();
  });

  it("sélectionne l'original si le doublon fermé vient d'être créé, même s'il n'est pas actif (favori ouvert en arrière-plan)", async () => {
    const { dedupeTabs } = await loadBackground();
    const tabs = [
      makeTab({ id: 1, url: 'https://github.com/a', active: true }),
      makeTab({ id: 2, url: 'https://github.com/b' }),
      makeTab({ id: 3, url: 'https://github.com/b' }),
    ];

    await dedupeTabs(tabs, new Set([3]));

    expect(chromeMock.tabs.remove).toHaveBeenCalledWith([3]);
    expect(chromeMock.tabs.update).toHaveBeenCalledWith(2, { active: true });
  });

  it("sélectionne l'original nouvellement créé lui-même s'il devient le survivant du groupe", async () => {
    const { dedupeTabs } = await loadBackground();
    const tabs = [
      makeTab({ id: 1, url: 'https://github.com/b', active: true }),
      makeTab({ id: 2, url: 'https://github.com/a' }),
      makeTab({ id: 3, url: 'https://github.com/a' }),
    ];

    await dedupeTabs(tabs, new Set([2]));

    expect(chromeMock.tabs.remove).toHaveBeenCalledWith([3]);
    expect(chromeMock.tabs.update).toHaveBeenCalledWith(2, { active: true });
  });

  it("ne sélectionne rien pour un groupe de doublons anciens, sans lien avec la création en cours", async () => {
    const { dedupeTabs } = await loadBackground();
    const tabs = [
      makeTab({ id: 1, url: 'https://github.com/a' }),
      makeTab({ id: 2, url: 'https://github.com/a' }),
    ];

    await dedupeTabs(tabs, new Set([99]));

    expect(chromeMock.tabs.remove).toHaveBeenCalledWith([2]);
    expect(chromeMock.tabs.update).not.toHaveBeenCalled();
  });
});

describe('sortWindow', () => {
  it('déduplique avant de regrouper par domaine', async () => {
    const { sortWindow } = await loadBackground();
    const win = {
      id: 1,
      tabs: [
        makeTab({ id: 1, url: 'https://github.com/a' }),
        makeTab({ id: 2, url: 'https://github.com/a' }),
        makeTab({ id: 3, url: 'https://github.com/b' }),
      ],
    };

    await sortWindow(win);

    expect(chromeMock.tabs.remove).toHaveBeenCalledWith([2]);
    expect(chromeMock.tabs.group).toHaveBeenCalledWith(expect.objectContaining({ tabIds: [1, 3] }));
  });

  it('regroupe les onglets de même domaine et laisse les singles hors groupe', async () => {
    const { sortWindow } = await loadBackground();
    const win = {
      id: 1,
      tabs: [
        makeTab({ id: 1, url: 'https://github.com/a' }),
        makeTab({ id: 2, url: 'https://github.com/b' }),
        makeTab({ id: 3, url: 'https://example.com/only' }),
      ],
    };

    await sortWindow(win);

    expect(chromeMock.tabs.group).toHaveBeenCalledWith(
      expect.objectContaining({ tabIds: [1, 2] })
    );
    expect(chromeMock.tabGroups.update).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({ title: 'github.com' })
    );
    expect(chromeMock.tabs.move).toHaveBeenCalledWith(3, expect.objectContaining({ index: expect.any(Number) }));
  });

  it('place les onglets isolés avant les groupes de domaine', async () => {
    const { sortWindow } = await loadBackground();
    const win = {
      id: 1,
      tabs: [
        makeTab({ id: 1, url: 'https://github.com/a' }),
        makeTab({ id: 2, url: 'https://github.com/b' }),
        makeTab({ id: 3, url: 'https://example.com/only' }),
      ],
    };

    await sortWindow(win);

    const singleMoveIndex = chromeMock.tabs.move.mock.calls.find(([tabId]) => tabId === 3)[1].index;
    const groupMoveIndex = chromeMock.tabGroups.move.mock.calls[0][1].index;
    expect(singleMoveIndex).toBeLessThan(groupMoveIndex);
  });

  it('utilise pendingUrl quand url n\'est pas encore chargée', async () => {
    const { sortWindow } = await loadBackground();
    const win = {
      id: 1,
      tabs: [
        makeTab({ id: 1, url: 'about:blank', pendingUrl: 'https://github.com/a' }),
        makeTab({ id: 2, url: 'https://github.com/b' }),
      ],
    };

    await sortWindow(win);

    expect(chromeMock.tabs.group).toHaveBeenCalledWith(expect.objectContaining({ tabIds: [1, 2] }));
  });

  it('ignore les onglets épinglés', async () => {
    const { sortWindow } = await loadBackground();
    const win = {
      id: 1,
      tabs: [
        makeTab({ id: 1, url: 'https://github.com/a', pinned: true }),
        makeTab({ id: 2, url: 'https://github.com/b' }),
      ],
    };

    await sortWindow(win);

    expect(chromeMock.tabs.group).not.toHaveBeenCalled();
    expect(chromeMock.tabs.move).toHaveBeenCalledTimes(1);
    expect(chromeMock.tabs.move).toHaveBeenCalledWith(2, expect.anything());
  });

  it("ne touche pas à un groupe existant que l'extension n'a pas créé (groupe manuel)", async () => {
    const { sortWindow } = await loadBackground();
    chromeMock.__groups.push({ id: 99, windowId: 1 });
    const win = {
      id: 1,
      tabs: [
        makeTab({ id: 1, url: 'https://a.com', groupId: 99 }),
        makeTab({ id: 2, url: 'https://b.com', groupId: 99 }),
        makeTab({ id: 3, url: 'https://github.com/x' }),
        makeTab({ id: 4, url: 'https://github.com/y' }),
      ],
    };

    await sortWindow(win);

    expect(chromeMock.tabs.ungroup).not.toHaveBeenCalled();
    expect(chromeMock.tabs.move).not.toHaveBeenCalledWith(1, expect.anything());
    expect(chromeMock.tabs.move).not.toHaveBeenCalledWith(2, expect.anything());
    expect(chromeMock.tabs.group).toHaveBeenCalledWith(expect.objectContaining({ tabIds: [3, 4] }));
  });

  it('fusionne des groupes dupliqués du même domaine retrouvés par titre+couleur (suivi de session perdu)', async () => {
    const { sortWindow, colorForDomain } = await loadBackground();
    const color = colorForDomain('github.com');
    chromeMock.__groups.push({ id: 10, windowId: 1, title: 'github.com', color });
    chromeMock.__groups.push({ id: 20, windowId: 1, title: 'github.com', color });
    // Pas d'entrée dans chrome.storage.session : on simule une extension ayant perdu le suivi.

    const win = {
      id: 1,
      tabs: [
        makeTab({ id: 1, url: 'https://github.com/a', groupId: 10 }),
        makeTab({ id: 2, url: 'https://github.com/b', groupId: 20 }),
        makeTab({ id: 3, url: 'https://github.com/c', groupId: 20 }),
      ],
    };

    await sortWindow(win);

    expect(chromeMock.tabs.group).toHaveBeenCalledTimes(1);
    const call = chromeMock.tabs.group.mock.calls[0][0];
    expect(call.tabIds).toEqual([1, 2, 3]);
    expect([10, 20]).toContain(call.groupId);
  });

  it('ne fusionne pas un groupe dont la couleur ne correspond pas au hash du domaine (probable groupe manuel)', async () => {
    const { sortWindow, colorForDomain, GROUP_COLORS } = await loadBackground();
    const wrongColor = GROUP_COLORS.find((c) => c !== colorForDomain('github.com'));
    chromeMock.__groups.push({ id: 10, windowId: 1, title: 'github.com', color: wrongColor });

    const win = {
      id: 1,
      tabs: [
        makeTab({ id: 1, url: 'https://github.com/a', groupId: 10 }),
        makeTab({ id: 2, url: 'https://github.com/b', groupId: 10 }),
        makeTab({ id: 3, url: 'https://github.com/x' }),
        makeTab({ id: 4, url: 'https://github.com/y' }),
      ],
    };

    await sortWindow(win);

    expect(chromeMock.tabs.move).not.toHaveBeenCalledWith(1, expect.anything());
    expect(chromeMock.tabs.move).not.toHaveBeenCalledWith(2, expect.anything());
    expect(chromeMock.tabs.group).toHaveBeenCalledWith(expect.objectContaining({ tabIds: [3, 4] }));
  });

  it('réutilise un groupe de domaine déjà géré au lieu d\'en créer un doublon', async () => {
    const { sortWindow } = await loadBackground();
    chromeMock.__groups.push({ id: 5, windowId: 1 });
    await chromeMock.storage.session.set({ managed_1: { 'github.com': 5 } });

    const win = {
      id: 1,
      tabs: [
        makeTab({ id: 1, url: 'https://github.com/a', groupId: 5 }),
        makeTab({ id: 2, url: 'https://github.com/b', groupId: 5 }),
      ],
    };

    await sortWindow(win);

    expect(chromeMock.tabs.group).toHaveBeenCalledWith({ tabIds: [1, 2], groupId: 5 });
    expect(chromeMock.tabGroups.update).not.toHaveBeenCalled();
  });

  it('dégroupe un onglet dont le groupe de domaine géré est tombé à 1 seul onglet', async () => {
    const { sortWindow } = await loadBackground();
    chromeMock.__groups.push({ id: 7, windowId: 1 });
    await chromeMock.storage.session.set({ managed_1: { 'github.com': 7 } });

    const win = {
      id: 1,
      tabs: [makeTab({ id: 1, url: 'https://github.com/a', groupId: 7 })],
    };

    await sortWindow(win);

    expect(chromeMock.tabs.ungroup).toHaveBeenCalledWith(1);
  });

  it("continue le tri des autres domaines si le groupement d'un domaine échoue", async () => {
    const { sortWindow } = await loadBackground();
    chromeMock.tabs.group.mockImplementation(async ({ tabIds, groupId, createProperties }) => {
      if (createProperties && tabIds.includes(1)) throw new Error('Tabs cannot be edited right now');
      if (groupId !== undefined) return groupId;
      return 42;
    });

    const win = {
      id: 1,
      tabs: [
        makeTab({ id: 1, url: 'https://a.com/x' }),
        makeTab({ id: 2, url: 'https://a.com/y' }),
        makeTab({ id: 3, url: 'https://b.com/x' }),
        makeTab({ id: 4, url: 'https://b.com/y' }),
      ],
    };

    await expect(sortWindow(win)).resolves.not.toThrow();
    expect(chromeMock.tabs.group).toHaveBeenCalledWith(expect.objectContaining({ tabIds: [3, 4] }));
  });
});

describe('sortAllWindows', () => {
  it('ne demande que les fenêtres de type normal (pas les popups)', async () => {
    const { sortAllWindows } = await loadBackground();
    chromeMock.windows.getAll.mockResolvedValue([]);

    await sortAllWindows();

    expect(chromeMock.windows.getAll).toHaveBeenCalledWith(
      expect.objectContaining({ windowTypes: ['normal'] })
    );
  });

  it("continue sur les autres fenêtres si le tri de l'une d'elles échoue", async () => {
    const { sortAllWindows } = await loadBackground();
    chromeMock.windows.getAll.mockResolvedValue([
      { id: 1, tabs: [] },
      {
        id: 2,
        tabs: [
          makeTab({ id: 10, url: 'https://x.com/a' }),
          makeTab({ id: 11, url: 'https://x.com/b' }),
        ],
      },
    ]);
    chromeMock.tabGroups.query.mockImplementation(async ({ windowId }) => {
      if (windowId === 1) throw new Error('boom');
      return [];
    });

    await expect(sortAllWindows()).resolves.not.toThrow();
    expect(chromeMock.tabs.group).toHaveBeenCalledWith(expect.objectContaining({ tabIds: [10, 11] }));
  });
});

describe("clic sur l'icône de l'extension", () => {
  it('déclenche un tri immédiat', async () => {
    await loadBackground();

    const onClickedHandler = chromeMock.action.onClicked.addListener.mock.calls[0][0];
    onClickedHandler();
    await Promise.resolve();
    await Promise.resolve();

    expect(chromeMock.windows.getAll).toHaveBeenCalledWith(
      expect.objectContaining({ windowTypes: ['normal'] })
    );
  });
});

describe('runSort (garde de réentrance)', () => {
  it('ne chevauche pas deux tris et en replanifie un après la fin du premier', async () => {
    const { runSort } = await loadBackground();
    let resolveFirst;
    const first = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    let callCount = 0;
    chromeMock.windows.getAll.mockImplementation(async () => {
      callCount += 1;
      if (callCount === 1) await first;
      return [];
    });

    const p1 = runSort();
    await Promise.resolve();
    await Promise.resolve();
    const p2 = runSort();

    expect(callCount).toBe(1);

    resolveFirst();
    await p1;
    await p2;

    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(callCount).toBe(2);
  }, 2000);
});

describe('onCreated → réactivation des doublons ouverts en arrière-plan', () => {
  it("remonte jusqu'à dedupeTabs les onglets créés depuis le dernier tri (ex. favori ouvert en arrière-plan via Cmd+clic)", async () => {
    vi.useFakeTimers();
    try {
      const { runSort } = await loadBackground();
      chromeMock.windows.getAll.mockResolvedValue([
        {
          id: 1,
          tabs: [
            makeTab({ id: 1, url: 'https://github.com/a', active: true }),
            makeTab({ id: 2, url: 'https://github.com/b' }),
            makeTab({ id: 3, url: 'https://github.com/b' }),
          ],
        },
      ]);

      const onCreatedHandler = chromeMock.tabs.onCreated.addListener.mock.calls[0][0];
      onCreatedHandler({ id: 3 });

      await runSort();

      expect(chromeMock.tabs.remove).toHaveBeenCalledWith([3]);
      expect(chromeMock.tabs.update).toHaveBeenCalledWith(2, { active: true });
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });
});

describe('onCreated → focus sur tout nouvel onglet', () => {
  it("active immédiatement un onglet créé en arrière-plan (ex. Cmd+clic sur un favori)", async () => {
    vi.useFakeTimers();
    try {
      await loadBackground();
      const onCreatedHandler = chromeMock.tabs.onCreated.addListener.mock.calls[0][0];

      onCreatedHandler({ id: 42, active: false });

      expect(chromeMock.tabs.update).toHaveBeenCalledWith(42, { active: true });
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  it("ne fait rien si l'onglet créé est déjà actif", async () => {
    vi.useFakeTimers();
    try {
      await loadBackground();
      const onCreatedHandler = chromeMock.tabs.onCreated.addListener.mock.calls[0][0];

      onCreatedHandler({ id: 42, active: true });

      expect(chromeMock.tabs.update).not.toHaveBeenCalled();
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });
});
