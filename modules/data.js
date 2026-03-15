// ─── modules/data.js ───
// Data loading from master.json and agent runtime health check.

import { DATA_URL, state } from './state.js';
import { normalizeRecord } from './utils.js';

export async function loadData() {
  const res = await fetch(DATA_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${DATA_URL}`);
  state.raw = await res.json();
  const records = Array.isArray(state.raw.records) ? state.raw.records : [];
  state.records = records.map(normalizeRecord);
}

export async function refreshAgentRuntimeInfo() {
  try {
    const res = await fetch('./api/runtime/health', { cache: 'no-store' });
    if (!res.ok) throw new Error('runtime unavailable');
    state.agentRuntime = await res.json();
  } catch (error) {
    state.agentRuntime = {
      ok: false,
      available: false,
      mode: 'unavailable',
      label: 'غير متاح',
      note: 'لا يوجد proxy runtime نشط حاليًا، وسيبقى الوكيل على الوضع المحلي فقط.',
    };
  }
}
