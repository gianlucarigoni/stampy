// Palette delle due direzioni (chat 9). Fonte unica: la usano sia contrasts-direzioni.mjs sia build-previews.mjs,
// così i numeri scritti in 20-direzioni.md sono quelli che si vedono nelle anteprime.
// Nomi dei token: i ruoli sono gli stessi di Bootstrap (body-bg, body-color, secondary-color, border-color…).

export const BRAND = '#f16417';       // arancione attuale (D1: resta nella variante a e b)
export const BRAND_DEEP = '#c2410c';  // arancione scuro (D1: varianti b e c)

// Le 3 varianti D1 dei bottoni primari. `fill`/`fg` = fondo e testo; `deco` = arancione per elementi non testuali.
export const D1 = {
  a: { name: 'a · testo scuro su #f16417', light: { fill: BRAND, fg: '#1f1612' }, dark: { fill: BRAND, fg: '#1a1410' }, deco: BRAND },
  b: { name: 'b · due toni (#c2410c su bottoni e link, #f16417 solo decorativo)', light: { fill: BRAND_DEEP, fg: '#ffffff' }, dark: { fill: BRAND_DEEP, fg: '#ffffff' }, deco: BRAND },
  c: { name: 'c · tutto #c2410c', light: { fill: BRAND_DEEP, fg: '#ffffff' }, dark: { fill: BRAND_DEEP, fg: '#ffffff' }, deco: BRAND_DEEP },
};

export const A = {
  id: 'a',
  name: 'Carta e inchiostro',
  light: {
    bg: '#fbf5ea', surface: '#fffdf8', surface2: '#f1e7d6', text: '#2a1f18', text2: '#6a5748',
    border: '#d9cbb7', field: '#857260',            // field = bordo campi/componenti (UI >= 3:1)
    link: '#b43a0a', ring: '#1d4ed8',
    danger: { text: '#b3261e', fill: '#b3261e', fg: '#ffffff', tint: '#fbe5e1', tintText: '#7a1610' },
    success: { text: '#176b41', tint: '#e0f1e6', tintText: '#0f4a2c' },
    warning: { tint: '#fbefc8', tintText: '#5a3d00' },
    info: { tint: '#e9eef9', tintText: '#1d2f66' },
    premio: { fill: '#0b6b7c', fg: '#ffffff', tint: '#d9f0f3', tintText: '#064752' },
    stampFilled: '#e8590c', stampInk: '#7a2a06',
  },
  dark: {
    bg: '#1a1410', surface: '#251d17', surface2: '#31261e', text: '#f4e9dc', text2: '#c0ad9c',
    border: '#4a3b30', field: '#9a8878',
    link: '#f4813f', ring: '#8fb0ff',
    danger: { text: '#ff8d82', fill: '#ff8d82', fg: '#2a0a07', tint: '#3a1714', tintText: '#ffc9c3' },
    success: { text: '#7bd69e', tint: '#14301f', tintText: '#bfeed1' },
    warning: { tint: '#3d2f0a', tintText: '#ffe39a' },
    info: { tint: '#1b2540', tintText: '#c6d4ff' },
    premio: { fill: '#5fd0e0', fg: '#06222a', tint: '#0f2f35', tintText: '#bdeef5' },
    stampFilled: '#f16417', stampInk: '#1a1410',
  },
};

export const B = {
  id: 'b',
  name: 'Biglietto da bar',
  light: {
    bg: '#f2e6cf', surface: '#fff9ec', surface2: '#e8d9ba', text: '#17110d', text2: '#5b4a3a',
    border: '#17110d', field: '#17110d',
    link: '#a63306', ring: '#17110d',
    danger: { text: '#a8201a', fill: '#a8201a', fg: '#ffffff', tint: '#ffd9d3', tintText: '#5e0f0b' },
    success: { text: '#14633b', tint: '#cfeeda', tintText: '#0b3d24' },
    warning: { tint: '#ffe08a', tintText: '#3b2900' },
    info: { tint: '#d8e4f5', tintText: '#14284f' },
    premio: { fill: '#c9f23a', fg: '#17110d', tint: '#e4f9a3', tintText: '#2b3700' },
    stampFilled: '#f16417', stampInk: '#17110d',
  },
  dark: {
    bg: '#12100e', surface: '#1e1a16', surface2: '#2a241e', text: '#f6ecd8', text2: '#bfae98',
    border: '#8f8271', field: '#a89a86',
    link: '#ff9a5c', ring: '#f6ecd8',
    danger: { text: '#ff8f84', fill: '#ff6f61', fg: '#1c0605', tint: '#40130f', tintText: '#ffd0ca' },
    success: { text: '#78d9a0', tint: '#123222', tintText: '#c2f0d4' },
    warning: { tint: '#463400', tintText: '#ffe08a' },
    info: { tint: '#1a2540', tintText: '#cbd8ff' },
    premio: { fill: '#d4f53c', fg: '#17110d', tint: '#2a3200', tintText: '#e6fb8a' },
    stampFilled: '#f16417', stampInk: '#12100e',
  },
};

// ---- Seconda tornata (chat 9, richiesta del proprietario: due direzioni più audaci) ----
export const C = {
  id: 'c',
  name: 'Menù stampato',
  light: {
    bg: '#f6efe2', surface: '#fcf8ef', surface2: '#ebe1cc', text: '#1c1a17', text2: '#564f45',
    border: '#1c1a17', field: '#6b6357',
    link: '#a8340a', ring: '#0b57d0',
    danger: { text: '#a8201a', fill: '#a8201a', fg: '#ffffff', tint: '#f9dcd6', tintText: '#5e0f0b' },
    success: { text: '#14633b', tint: '#d6ecdd', tintText: '#0b3d24' },
    warning: { tint: '#f6e3a6', tintText: '#4a3300' },
    info: { tint: '#dde6f3', tintText: '#14284f' },
    premio: { fill: '#e8b923', fg: '#1c1a17', tint: '#f6e7b0', tintText: '#4a3600' },
    stampFilled: '#e8590c', stampInk: '#1c1a17',
  },
  dark: {
    bg: '#14110e', surface: '#1b1713', surface2: '#272019', text: '#f3ece0', text2: '#b9ae9d',
    border: '#f3ece0', field: '#9c917f',
    link: '#ff9a5c', ring: '#8ab4ff',
    danger: { text: '#ff8f84', fill: '#ff6f61', fg: '#1c0605', tint: '#3d120e', tintText: '#ffd0ca' },
    success: { text: '#78d9a0', tint: '#12301f', tintText: '#c2f0d4' },
    warning: { tint: '#3f2f06', tintText: '#ffe39a' },
    info: { tint: '#192238', tintText: '#cbd8ff' },
    premio: { fill: '#f2c94c', fg: '#1c1a17', tint: '#362a07', tintText: '#ffe58f' },
    stampFilled: '#f16417', stampInk: '#14110e',
  },
};

export const D = {
  id: 'd',
  name: 'Adesivo',
  light: {
    bg: '#ffe6c9', surface: '#fffaf2', surface2: '#ffd2a1', text: '#2b1408', text2: '#6a4430',
    border: '#2b1408', field: '#8a5a3c',
    link: '#a8340a', ring: '#2b1408',
    danger: { text: '#a8201a', fill: '#a8201a', fg: '#ffffff', tint: '#ffd6d0', tintText: '#5e0f0b' },
    success: { text: '#14633b', tint: '#cdeed9', tintText: '#0b3d24' },
    warning: { tint: '#ffe08a', tintText: '#3b2900' },
    info: { tint: '#d6e3f7', tintText: '#14284f' },
    premio: { fill: '#ff5fa2', fg: '#2b1408', tint: '#ffd1e5', tintText: '#6b0c37' },
    stampFilled: '#f16417', stampInk: '#2b1408',
  },
  dark: {
    bg: '#24120a', surface: '#34190d', surface2: '#4a2511', text: '#ffe9d2', text2: '#d6b79d',
    border: '#ffe9d2', field: '#b88e6f',
    link: '#ff9a5c', ring: '#ffe9d2',
    danger: { text: '#ff9a8f', fill: '#ff7466', fg: '#2a0a07', tint: '#4a1812', tintText: '#ffd3cd' },
    success: { text: '#7fdba5', tint: '#143523', tintText: '#c8f2d8' },
    warning: { tint: '#4a3606', tintText: '#ffe39a' },
    info: { tint: '#1d2a48', tintText: '#d0dcff' },
    premio: { fill: '#ff7bb5', fg: '#2b1408', tint: '#4d1634', tintText: '#ffc7e0' },
    stampFilled: '#f16417', stampInk: '#24120a',
  },
};

// ---- Terza tornata (chat 9, «sbizzarrisciti») ----
export const E = {
  id: 'e',
  name: 'Insegna',
  light: {
    bg: '#f3ece3', surface: '#fffdf9', surface2: '#e6dccf', text: '#120d0a', text2: '#55463b',
    border: '#120d0a', field: '#6a5849',
    link: '#a8340a', ring: '#120d0a',
    danger: { text: '#a8201a', fill: '#a8201a', fg: '#ffffff', tint: '#ffd9d3', tintText: '#5e0f0b' },
    success: { text: '#14633b', tint: '#d2ecdc', tintText: '#0b3d24' },
    warning: { tint: '#ffe08a', tintText: '#3b2900' },
    info: { tint: '#d9e4f4', tintText: '#14284f' },
    premio: { fill: '#27d6da', fg: '#06181a', tint: '#c7f3f4', tintText: '#06474a' },
    stampFilled: '#e8590c', stampInk: '#120d0a',
  },
  dark: {
    bg: '#0d0907', surface: '#170f0b', surface2: '#241710', text: '#fff1e0', text2: '#c9ad95',
    border: '#6b4430', field: '#b08a6e',
    link: '#ff9a5c', ring: '#fff1e0',
    danger: { text: '#ff8a7a', fill: '#ff6b5b', fg: '#240805', tint: '#3a110c', tintText: '#ffd0ca' },
    success: { text: '#78d9a0', tint: '#0f2c1c', tintText: '#c2f0d4' },
    warning: { tint: '#3d2d04', tintText: '#ffe39a' },
    info: { tint: '#14203a', tintText: '#cbd8ff' },
    premio: { fill: '#2de2e6', fg: '#06181a', tint: '#052a2c', tintText: '#a8f3f5' },
    stampFilled: '#f16417', stampInk: '#0d0907',
  },
};

export const F = {
  id: 'f',
  name: 'Scontrino',
  light: {
    bg: '#e4dfd2', surface: '#fbfaf5', surface2: '#eeeadd', text: '#1d1b18', text2: '#57534b',
    border: '#1d1b18', field: '#6a665d',
    link: '#a8340a', ring: '#1d1b18',
    danger: { text: '#a8201a', fill: '#a8201a', fg: '#ffffff', tint: '#f7dcd6', tintText: '#5e0f0b' },
    success: { text: '#14633b', tint: '#d6ecdd', tintText: '#0b3d24' },
    warning: { tint: '#f4e2a0', tintText: '#4a3300' },
    info: { tint: '#dde1f0', tintText: '#1b2450' },
    premio: { fill: '#2b3fd1', fg: '#ffffff', tint: '#dde1fb', tintText: '#141e75' },
    stampFilled: '#e8590c', stampInk: '#1d1b18',
  },
  dark: {
    bg: '#0e0b07', surface: '#17120b', surface2: '#241c10', text: '#ffcf85', text2: '#c9a265',
    border: '#ffcf85', field: '#a8803f',
    link: '#ff9a5c', ring: '#ffcf85',
    danger: { text: '#ff8f84', fill: '#ff7466', fg: '#240805', tint: '#3a110c', tintText: '#ffd0ca' },
    success: { text: '#7bd69e', tint: '#102b1b', tintText: '#bfeed1' },
    warning: { tint: '#3d2d04', tintText: '#ffe39a' },
    info: { tint: '#171f3a', tintText: '#cbd8ff' },
    premio: { fill: '#9aa8ff', fg: '#0b1030', tint: '#1a2150', tintText: '#d4daff' },
    stampFilled: '#f16417', stampInk: '#0e0b07',
  },
};

// ---- Quarta tornata (chat 9, «più pacati») ----
export const G = {
  id: 'g',
  name: 'Pietra',
  light: {
    bg: '#eeebe5', surface: '#faf8f4', surface2: '#e4e0d8', text: '#23211e', text2: '#5e5a53',
    border: '#d3cec4', field: '#7a756c',
    link: '#a8340a', ring: '#23211e',
    danger: { text: '#a8201a', fill: '#a8201a', fg: '#ffffff', tint: '#f6dcd7', tintText: '#5e0f0b' },
    success: { text: '#14633b', tint: '#d9ebe0', tintText: '#0b3d24' },
    warning: { tint: '#f3e3aa', tintText: '#4a3300' },
    info: { tint: '#dfe5ef', tintText: '#1b2a4d' },
    premio: { fill: '#5b4a99', fg: '#ffffff', tint: '#e5e0f4', tintText: '#2e2360' },
    stampFilled: '#e8590c', stampInk: '#23211e',
  },
  dark: {
    bg: '#171614', surface: '#1f1d1a', surface2: '#2a2723', text: '#ece8e1', text2: '#aaa398',
    border: '#38342f', field: '#8f887c',
    link: '#ff9a5c', ring: '#ece8e1',
    danger: { text: '#ff8f84', fill: '#ff7466', fg: '#240805', tint: '#3a1612', tintText: '#ffd0ca' },
    success: { text: '#7bd69e', tint: '#14291c', tintText: '#c2f0d4' },
    warning: { tint: '#3a2e0a', tintText: '#ffe39a' },
    info: { tint: '#1a2236', tintText: '#cbd8ff' },
    premio: { fill: '#b7a8f0', fg: '#1a1233', tint: '#2a2347', tintText: '#ddd6fa' },
    stampFilled: '#f16417', stampInk: '#171614',
  },
};

export const H = {
  id: 'h',
  name: 'Forno',
  light: {
    bg: '#f1ede0', surface: '#fbf9f1', surface2: '#dfe5d2', text: '#262d20', text2: '#576050',
    border: '#d6dac8', field: '#6f7a62',
    link: '#a8340a', ring: '#1f5a35',
    danger: { text: '#a8201a', fill: '#a8201a', fg: '#ffffff', tint: '#f6dcd6', tintText: '#5e0f0b' },
    success: { text: '#14633b', tint: '#d3ead9', tintText: '#0b3d24' },
    warning: { tint: '#f2e1a3', tintText: '#4a3300' },
    info: { tint: '#dce6ee', tintText: '#14284f' },
    premio: { fill: '#9b2c5e', fg: '#ffffff', tint: '#f6dce8', tintText: '#5c1236' },
    stampFilled: '#dc520b', stampInk: '#262d20',
  },
  dark: {
    bg: '#171a13', surface: '#1f2318', surface2: '#2b3122', text: '#ebe9dc', text2: '#b3b8a2',
    border: '#363c2b', field: '#8e987c',
    link: '#ff9a5c', ring: '#b9e3a0',
    danger: { text: '#ff9086', fill: '#ff7466', fg: '#240805', tint: '#3d1712', tintText: '#ffd0ca' },
    success: { text: '#86dca0', tint: '#14301c', tintText: '#c8f2d6' },
    warning: { tint: '#3a2f0a', tintText: '#ffe39a' },
    info: { tint: '#1a2536', tintText: '#cbd8ff' },
    premio: { fill: '#f08ab6', fg: '#2c0a1a', tint: '#40162b', tintText: '#ffd0e4' },
    stampFilled: '#f16417', stampInk: '#171a13',
  },
};

// ---- Quinta tornata (chat 9): ibrido scelto dal proprietario ----
// Sfondi chiari da H, scuri da A; premio da D (rosa); successo/avviso da H; pericolo e info da A; arancioni = Stampy.
export const I = {
  id: 'i',
  name: 'Ibrido',
  light: {
    bg: '#f1ede0', surface: '#fbf9f1', surface2: '#dfe5d2', text: '#2a1f18', text2: '#5f4e40',
    border: '#d6dac8', field: '#7d6a58',
    link: '#b43a0a', ring: '#1d4ed8',
    danger: { text: '#b3261e', fill: '#b3261e', fg: '#ffffff', tint: '#fbe5e1', tintText: '#7a1610' },
    success: { text: '#14633b', tint: '#d3ead9', tintText: '#0b3d24' },
    warning: { tint: '#f2e1a3', tintText: '#4a3300' },
    info: { tint: '#e9eef9', tintText: '#1d2f66' },
    premio: { fill: '#ff5fa2', fg: '#2b1408', tint: '#ffd1e5', tintText: '#6b0c37' },
    stampFilled: '#f16417', stampInk: '#2b1408',
  },
  dark: {
    bg: '#1a1410', surface: '#251d17', surface2: '#31261e', text: '#f4e9dc', text2: '#c0ad9c',
    border: '#4a3b30', field: '#9a8878',
    link: '#f4813f', ring: '#8fb0ff',
    danger: { text: '#ff8d82', fill: '#ff8d82', fg: '#2a0a07', tint: '#3a1714', tintText: '#ffc9c3' },
    success: { text: '#86dca0', tint: '#14301c', tintText: '#c8f2d6' },
    warning: { tint: '#3a2f0a', tintText: '#ffe39a' },
    info: { tint: '#1b2540', tintText: '#c6d4ff' },
    premio: { fill: '#ff5fa2', fg: '#2b1408', tint: '#4d1634', tintText: '#ffc7e0' },
    stampFilled: '#f16417', stampInk: '#1a1410',
  },
};
