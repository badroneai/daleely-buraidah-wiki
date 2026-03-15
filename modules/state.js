// ─── modules/state.js ───
// Global mutable application state and data URL constant.

export const DATA_URL = './master.json';

export const state = {
  raw: null,
  records: [],
  filters: {
    status: '',
    district: '',
    confidence: '',
    specialty: '',
    desserts: '',
    work: '',
    groups: '',
    late: '',
  },
  issues: [],
  editMode: false,
  currentSlug: null,
  draftMessage: '',
  agentRunState: null,
  agentBatchState: null,
  agentRuntime: null,
  importDraftText: '',
  importRawText: '',
  isNewCafe: false,
  queueMessage: '',
  queueSort: 'default',
  queuePriority: 'default',
};
