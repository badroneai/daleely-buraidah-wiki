// ─── modules/router.js ───
// Main application router, event bindings, and initialization.

import { state } from './state.js';
import { esc } from './utils.js';
import { app, searchInput, searchButton } from './dom.js';
import { setMeta, badge } from './display.js';
import { STATUS_AR } from './constants.js';
import {
  getEntity, getDraft, saveDraft, emptyNewCafeRecord,
  editorialReadiness, registerPatchExportRecord, registerImportRecord,
  agentDraftEntries, verificationDraftEntries, savedAgentBatchEntries,
  missionStatusLabel, missionAttemptOutcomeLabel, missionSessionStatusLabel,
} from './storage.js';
import {
  registerVerificationDecision, addEvidenceEntry,
  sourceVerificationState, districtVerificationState, confidenceVerificationState,
  verificationQueues, startOrOpenVerificationSession,
} from './verification.js';
import {
  attentionQueues, parseHashRoute, entityHref, queueHref, queueTitleByKey,
} from './queues.js';
import { filterRecords } from './filters.js';
import {
  runRecordCompletionAgent, runVerificationSupportAgent,
  runAgentBatchScoped, updateAgentProposalStatus, acceptAgentProposalToDraft,
  agentDefinitions, derivedAgentScopes, agentDefinitionByKey,
  runAgentBatch, saveAgentBatchTemplate, scopeAgentRecommendation,
  recordsForAgentScope, agentScopeKindLabel, agentProposalStatusLabel,
} from './agents.js';
import {
  updateMissionState, addMissionAttempt, setMissionSessionStatus,
  exportMissionSession, seedMissionFromSuggestion, missionPlan,
  suggestedRecordMissions, startOrOpenMissionSession,
} from './missions.js';
import {
  saveFinalPatchDecision, savePatchSignoffDecision, exportFinalPatchBundle,
  exportPatchSignoffOutput, exportReleasePack, finalPatchDecisionLabel, patchSignoffLabel,
} from './patches.js';
import {
  renderDashboard, renderAttentionQueuePage, renderEntityPage,
  renderEditorialControlCenter, renderAgentDraftsHub, renderAgentOpsConsole,
  renderVerificationWorkspace, renderVerificationProgramHub,
  renderReleaseReadinessHub, renderBulkWorkspace, renderReviewOperationsHub,
  renderStatusPage, renderDistrictsPage, renderFiltersPage,
  renderDiscoveryPage, renderReviewPage, renderSearch,
  renderBlueprintPage, renderSectorsIndexPage, renderSectorPage,
  renderPipelinePage, renderGovernancePage, renderEntitiesPage, renderSectorDecisionBoard, renderExecutionQueue, renderFocusWorkbench,
  renderFilterBar, renderEditForm,
} from './rendering.js';
import { bindSidebar, bindMobileNavSections, closeSidebar, syncMobileNavSections,
  loadData, refreshAgentRuntimeInfo,
  collectFormData, downloadJson, downloadText,
  exportableBatchPayload, exportableBatchCsv, exportableBatchSummary,
  pushExportHistoryEntry, makeQueueRequest, appendQueueRequestToProject,
  diffRecord, extractGoogleMapsDraft, applyImportedDraftToForm,
  queueFileRelativePath,
} from './ui-helpers.js';
import {
  getReviewSession, saveReviewSession, bulkWorkspaceState, bulkDecisionEntry,
} from './bulk-review.js';
import { sectorLabelByKey } from './analytics.js';

export function bindFilters() {
  document.querySelectorAll('[data-filter]').forEach(el => {
    el.addEventListener('change', () => {
      state.filters[el.getAttribute('data-filter')] = el.value;
      router();
    });
  });
  document.querySelectorAll('[data-action="clear-filter"]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.filters[btn.dataset.filterKey] = '';
      router();
    });
  });
  document.querySelectorAll('[data-action="clear-filters"]').forEach(btn => {
    btn.addEventListener('click', () => {
      Object.keys(state.filters).forEach(key => { state.filters[key] = ''; });
      router();
    });
  });
  // ── Ops filter buttons (sector page quick actions) ──
  document.querySelectorAll('[data-action="eq-sector"]').forEach(btn => {
    btn.addEventListener('click', () => {
      state._eqFilter = btn.dataset.eqVal || 'all';
      router();
    });
  });
  document.querySelectorAll('[data-action="eq-type"]').forEach(btn => {
    btn.addEventListener('click', () => {
      state._eqType = btn.dataset.eqVal || 'all';
      router();
    });
  });

  document.querySelectorAll('[data-action="ops-filter"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.opsKey;
      if (key === 'clear') {
        delete state._opsFilter;
      } else {
        state._opsFilter = state._opsFilter === key ? undefined : key;
      }
      router();
    });
  });
}


export function bindEditorActions() {
  document.querySelectorAll('[data-action="toggle-edit"]').forEach(btn => btn.addEventListener('click', () => {
    state.editMode = true;
    state.currentSlug = btn.dataset.slug;
    state.draftMessage = '';
    router();
  }));
  document.querySelectorAll('[data-action="cancel-edit"]').forEach(btn => btn.addEventListener('click', () => {
    state.editMode = false;
    state.currentSlug = null;
    state.draftMessage = '';
    router();
  }));
  document.querySelectorAll('[data-action="import-draft"]').forEach(btn => btn.addEventListener('click', () => {
    const form = document.getElementById('editForm');
    const input = document.getElementById('googleMapsImport');
    const rawInput = document.getElementById('googleMapsRawText');
    state.importDraftText = input?.value || '';
    state.importRawText = rawInput?.value || '';
    const imported = extractGoogleMapsDraft(state.importDraftText, state.importRawText);
    applyImportedDraftToForm(form, imported);
    registerImportRecord({
      id: `import-result-${btn.dataset.slug}-${Date.now()}`,
      slug: btn.dataset.slug,
      name: imported.name || getEntity(btn.dataset.slug)?.name || '',
      type: 'result',
      status: Object.keys(imported).length ? 'imported-to-form' : 'follow-up-needed',
      note: Object.keys(imported).length ? 'تمت تعبئة draft أولي داخل النموذج.' : 'لم تُستخرج حقول كافية من المدخلات الحالية.',
      source: 'maps-parse',
    });
    state.draftMessage = Object.keys(imported).length
      ? (btn.dataset.slug === 'new-cafe-draft' ? 'تم جلب البيانات الأساسية الأولية داخل النموذج.' : 'تم تعبئة draft أولي من الرابط والنص الخام داخل النموذج.')
      : 'لم أستخرج حقولًا كافية من المدخلات الحالية.';
  }));
  document.querySelectorAll('[data-action="queue-import"]').forEach(btn => btn.addEventListener('click', async () => {
    const form = document.getElementById('editForm');
    const payload = collectFormData(form);
    const request = makeQueueRequest({
      maps_url: document.getElementById('googleMapsImport')?.value || payload.reference_url || '',
      raw_text: document.getElementById('googleMapsRawText')?.value || '',
      notes: `New Cafe draft: ${payload.name || 'unnamed'}`
    });
    try {
      await appendQueueRequestToProject(request);
      registerImportRecord({
        id: request.id,
        slug: btn.dataset.slug,
        name: payload.name || '',
        type: 'request',
        status: 'queued',
        note: 'تمت إضافة طلب الاستيراد إلى queue محلية.',
        source: 'new-cafe-workbench',
      });
      state.queueMessage = `Queued successfully: ${request.id} -> agent_queue/import_queue.json`;
    } catch (err) {
      downloadJson(`${request.id}.queue-request.json`, request);
      registerImportRecord({
        id: request.id,
        slug: btn.dataset.slug,
        name: payload.name || '',
        type: 'request',
        status: 'fallback-exported',
        note: `تعذرت الكتابة المباشرة، وتم تنزيل ملف يمكن إضافته لاحقًا إلى ${queueFileRelativePath()}`,
        source: 'new-cafe-workbench',
      });
      state.queueMessage = `Direct write unavailable. Downloaded JSON request; add it later to ${queueFileRelativePath()}`;
    }
  }));
  document.querySelectorAll('[data-action="save-draft"]').forEach(btn => btn.addEventListener('click', () => {
    const slug = btn.dataset.slug;
    const form = document.getElementById('editForm');
    const payload = collectFormData(form);
    saveDraft(slug, payload);
    state.draftMessage = 'تم حفظ الـ draft محليًا على هذا الجهاز.';
    router();
  }));
  document.querySelectorAll('[data-action="export-patch"]').forEach(btn => btn.addEventListener('click', () => {
    const slug = btn.dataset.slug;
    const form = document.getElementById('editForm');
    const entity = getEntity(slug);
    const payload = collectFormData(form);
    const isNew = !entity && slug === 'new-cafe-draft';
    const patch = isNew ? payload : diffRecord(entity, payload);
    downloadJson(`${slug}.patch.json`, {
      slug,
      exported_at: new Date().toISOString(),
      mode: isNew ? 'create_draft' : 'update',
      patch
    });
    registerPatchExportRecord({
      id: `patch-${slug}-${Date.now()}`,
      slug,
      name: payload.name || entity?.name || slug,
      exportedAt: new Date().toISOString(),
      mode: isNew ? 'create_draft' : 'update',
      changeCount: Object.keys(patch).length,
      readiness: editorialReadiness(payload).key,
      note: Object.keys(patch).length ? `يتضمن ${Object.keys(patch).length} تغييرًا.` : 'لا توجد تغييرات جوهرية واضحة في التصدير الحالي.',
      status: editorialReadiness(payload).key === 'export-ready' ? 'ready-for-follow-up' : 'pending-review',
    });
    state.draftMessage = `تم تصدير patch للسجل ${slug}.`;
    saveDraft(slug, payload);
    router();
  }));
  // ── Rapid Update Assist bindings ──
  document.querySelectorAll('[data-action="rua-save-draft"]').forEach(btn => btn.addEventListener('click', () => {
    const slug = btn.dataset.slug;
    const form = document.getElementById('ruaForm');
    if (!form) return;
    const entity = getEntity(slug) || {};
    const existingDraft = getDraft(slug) || {};
    const formData = Object.fromEntries(new FormData(form).entries());
    const merged = { ...entity, ...existingDraft };
    Object.entries(formData).forEach(([k, v]) => {
      if (String(v).trim()) merged[k] = v;
    });
    saveDraft(slug, merged, { source: 'rua-quick-update' });
    state.draftMessage = '\u062a\u0645 \u062d\u0641\u0638 \u0627\u0644\u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0633\u0631\u064a\u0639 \u0643\u0645\u0633\u0648\u062f\u0629.';
    router();
  }));
  document.querySelectorAll('[data-action="rua-export-patch"]').forEach(btn => btn.addEventListener('click', () => {
    const slug = btn.dataset.slug;
    const form = document.getElementById('ruaForm');
    if (!form) return;
    const entity = getEntity(slug) || {};
    const formData = Object.fromEntries(new FormData(form).entries());
    const patch = {};
    Object.entries(formData).forEach(([k, v]) => {
      const trimmed = String(v).trim();
      if (trimmed && trimmed !== String(entity[k] || '').trim()) patch[k] = trimmed;
    });
    if (Object.keys(patch).length === 0) {
      alert('\u0644\u0627 \u062a\u0648\u062c\u062f \u062a\u063a\u064a\u064a\u0631\u0627\u062a \u0644\u062a\u0635\u062f\u064a\u0631\u0647\u0627.');
      return;
    }
    downloadJson(`${slug}.rua-patch.json`, {
      slug,
      exported_at: new Date().toISOString(),
      mode: 'rua-quick-update',
      patch,
      change_count: Object.keys(patch).length,
    });
    registerPatchExportRecord({
      id: `rua-${slug}-${Date.now()}`,
      slug,
      name: entity.name || slug,
      exportedAt: new Date().toISOString(),
      mode: 'rua-quick-update',
      changeCount: Object.keys(patch).length,
      note: `\u062a\u062d\u062f\u064a\u062b \u0633\u0631\u064a\u0639: ${Object.keys(patch).length} \u062d\u0642\u0648\u0644.`,
      status: 'ready-for-follow-up',
    });
    const existingDraft = getDraft(slug) || {};
    saveDraft(slug, { ...entity, ...existingDraft, ...patch }, { source: 'rua-export' });
    state.draftMessage = `\u062a\u0645 \u062a\u0635\u062f\u064a\u0631 ${Object.keys(patch).length} \u062a\u063a\u064a\u064a\u0631\u0627\u062a \u0644\u0640 ${slug}.`;
    router();
  }));
  document.querySelectorAll('[data-action="rua-skip"]').forEach(btn => btn.addEventListener('click', () => {
    const nextBtn = document.querySelector('.fw-nav .fw-nav-btn[href*="/focus/"]');
    if (nextBtn && !nextBtn.classList.contains('fw-nav-disabled')) {
      const href = nextBtn.getAttribute('href');
      if (href) window.location.hash = href.replace('#', '');
    } else {
      window.location.hash = '/exec-queue';
    }
  }));
  document.querySelectorAll('.rua-copy-btn').forEach(btn => btn.addEventListener('click', () => {
    const text = btn.dataset.copy;
    if (text && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        const orig = btn.textContent;
        btn.textContent = '\u2714';
        setTimeout(() => btn.textContent = orig, 1200);
      });
    }
  }));
  document.querySelectorAll('[data-action="verification-session-start"]').forEach(btn => btn.addEventListener('click', () => {
    const scopeType = btn.dataset.sessionType || 'queue';
    const scopeKey = btn.dataset.sessionScope || 'source-review';
    const recordSlugs = scopeType === 'queue'
      ? (verificationQueues()[scopeKey]?.records().map(item => item.slug) || [])
      : [scopeKey];
    startOrOpenVerificationSession({
      scopeType,
      scopeKey,
      title: btn.dataset.sessionTitle || '',
      queueKey: scopeType === 'queue' ? scopeKey : '',
      recordSlugs,
    });
    state.draftMessage = scopeType === 'queue'
      ? 'تم فتح أو تحديث جلسة التحقق لهذا الصف.'
      : 'تم فتح أو تحديث جلسة التحقق لهذا السجل.';
    router();
  }));
  document.querySelectorAll('[data-action="verification-decision"]').forEach(btn => btn.addEventListener('click', () => {
    const noteId = btn.dataset.noteId || '';
    const note = noteId ? (document.getElementById(noteId)?.value || '') : '';
    const entry = registerVerificationDecision({
      scopeType: btn.dataset.sessionType || 'queue',
      scopeKey: btn.dataset.sessionScope || 'source-review',
      queueKey: btn.dataset.queue || '',
      slug: btn.dataset.slug || '',
      decision: btn.dataset.decision || 'review',
      note,
    });
    state.draftMessage = entry
      ? `تم تسجيل قرار تحقق: ${entry.decisionLabel}.`
      : 'تعذر تسجيل قرار التحقق لهذا السجل.';
    router();
  }));
  document.querySelectorAll('[data-action="mission-status"]').forEach(btn => btn.addEventListener('click', () => {
    const mission = updateMissionState({
      missionId: btn.dataset.missionId || '',
      status: btn.dataset.status || 'in_progress',
    });
    state.draftMessage = mission
      ? `تم تحديث المهمة إلى: ${missionStatusLabel(mission.status)}.`
      : 'تعذر تحديث المهمة الحالية.';
    router();
  }));
  document.querySelectorAll('[data-action="mission-session-start"]').forEach(btn => btn.addEventListener('click', () => {
    const session = startOrOpenMissionSession(btn.dataset.missionId || '');
    state.draftMessage = session
      ? 'تم فتح أو استكمال جلسة التنفيذ لهذه المهمة.'
      : 'تعذر فتح جلسة التنفيذ الحالية.';
    router();
  }));
  document.querySelectorAll('[data-action="mission-attempt"]').forEach(btn => btn.addEventListener('click', () => {
    const noteId = btn.dataset.noteId || '';
    const note = noteId ? (document.getElementById(noteId)?.value || '') : '';
    const attempt = addMissionAttempt({
      missionId: btn.dataset.missionId || '',
      slug: btn.dataset.slug || '',
      outcome: btn.dataset.outcome || 'partial',
      note,
    });
    state.draftMessage = attempt
      ? `تم تسجيل محاولة تنفيذ: ${missionAttemptOutcomeLabel(attempt.outcome)}.`
      : 'تعذر تسجيل محاولة التنفيذ الحالية.';
    router();
  }));
  document.querySelectorAll('[data-action="mission-session-status"]').forEach(btn => btn.addEventListener('click', () => {
    const session = setMissionSessionStatus(btn.dataset.missionId || '', btn.dataset.status || 'active');
    state.draftMessage = session
      ? `تم تحديث الجلسة إلى: ${missionSessionStatusLabel(session.status)}.`
      : 'تعذر تحديث حالة الجلسة الحالية.';
    router();
  }));
  document.querySelectorAll('[data-action="mission-session-export"]').forEach(btn => btn.addEventListener('click', () => {
    const ok = exportMissionSession(btn.dataset.missionId || '', btn.dataset.format || 'json');
    state.draftMessage = ok
      ? 'تم تصدير مخرجات الجلسة الحالية.'
      : 'تعذر تصدير مخرجات الجلسة الحالية.';
    router();
  }));
  document.querySelectorAll('[data-action="release-pack-export"]').forEach(btn => btn.addEventListener('click', () => {
    const ok = exportReleasePack(btn.dataset.packId || '', btn.dataset.format || 'json');
    state.draftMessage = ok
      ? 'تم تصدير حزمة الجاهزية الحالية.'
      : 'تعذر تصدير حزمة الجاهزية الحالية.';
    router();
  }));
  document.querySelectorAll('[data-action="final-patch-decision"]').forEach(btn => btn.addEventListener('click', () => {
    const note = document.getElementById(btn.dataset.noteId || '')?.value || '';
    const entry = saveFinalPatchDecision({
      slug: btn.dataset.slug || '',
      decision: btn.dataset.decision || 'rereview',
      note,
    });
    state.draftMessage = entry
      ? `تم تحديث القرار النهائي للسجل إلى: ${finalPatchDecisionLabel(entry.decision)}.`
      : 'تعذر تحديث قرار final patch لهذا السجل.';
    router();
  }));
  document.querySelectorAll('[data-action="final-patch-export"]').forEach(btn => btn.addEventListener('click', () => {
    const ok = exportFinalPatchBundle(btn.dataset.format || 'json');
    state.draftMessage = ok
      ? 'تم تصدير Final Patch Candidate Bundle الحالية.'
      : 'تعذر تصدير Final Patch Candidate Bundle.';
    router();
  }));
  document.querySelectorAll('[data-action="patch-signoff-decision"]').forEach(btn => btn.addEventListener('click', () => {
    const note = document.getElementById(btn.dataset.noteId || '')?.value || '';
    const entry = savePatchSignoffDecision({
      slug: btn.dataset.slug || '',
      decision: btn.dataset.decision || 'ready-for-signoff',
      note,
    });
    state.draftMessage = entry
      ? `تم تحديث حالة التوقيع إلى: ${patchSignoffLabel(entry.decision)}.`
      : 'تعذر تحديث حالة التوقيع النهائي لهذا السجل.';
    router();
  }));
  document.querySelectorAll('[data-action="patch-signoff-export"]').forEach(btn => btn.addEventListener('click', () => {
    const ok = exportPatchSignoffOutput(btn.dataset.kind || 'simulation', btn.dataset.format || 'json');
    state.draftMessage = ok
      ? 'تم تصدير مخرجات simulation / sign-off الحالية.'
      : 'تعذر تصدير مخرجات simulation / sign-off.';
    router();
  }));
  document.querySelectorAll('[data-action="run-record-agent"]').forEach(btn => btn.addEventListener('click', () => {
    const slug = btn.dataset.slug || '';
    state.agentRunState = {
      slug,
      agentType: 'completion',
      status: 'loading',
      message: 'جارٍ تشغيل وكيل استكمال السجل وتحليل الحقول المؤهلة...',
    };
    router();
    window.setTimeout(async () => {
      try {
        const result = await runRecordCompletionAgent(slug);
        await refreshAgentRuntimeInfo();
        state.agentRunState = {
          slug,
          agentType: 'completion',
          status: result.status,
          message: result.message,
        };
        state.draftMessage = result.message;
      } catch (error) {
        state.agentRunState = {
          slug,
          agentType: 'completion',
          status: 'error',
          message: 'حدث خطأ أثناء تشغيل الوكيل.',
        };
        state.draftMessage = 'حدث خطأ أثناء تشغيل الوكيل.';
      }
      router();
    }, 120);
  }));
  document.querySelectorAll('[data-action="run-verification-agent"]').forEach(btn => btn.addEventListener('click', () => {
    const slug = btn.dataset.slug || '';
    state.agentRunState = {
      slug,
      agentType: 'verification',
      status: 'loading',
      message: 'جارٍ تشغيل وكيل دعم التحقق وتحليل سياق الأدلة والقرار الحالي...',
    };
    router();
    window.setTimeout(async () => {
      try {
        const result = await runVerificationSupportAgent(slug);
        await refreshAgentRuntimeInfo();
        state.agentRunState = {
          slug,
          agentType: 'verification',
          status: result.status,
          message: result.message,
        };
        state.draftMessage = result.message;
      } catch (error) {
        state.agentRunState = {
          slug,
          agentType: 'verification',
          status: 'error',
          message: 'حدث خطأ أثناء تشغيل وكيل التحقق.',
        };
        state.draftMessage = 'حدث خطأ أثناء تشغيل وكيل التحقق.';
      }
      router();
    }, 120);
  }));
  document.querySelectorAll('[data-action="agent-batch-run"]').forEach(btn => btn.addEventListener('click', () => {
    const agentKey = btn.dataset.agentKey || 'completion';
    const agent = agentDefinitionByKey(agentKey);
    const eligibleCount = agent.eligibleRecords().length;
    const batchCount = agent.batchRecords().length;
    state.agentBatchState = {
      agentKey,
      title: agent.title,
      scopeLabel: `دفعة تشغيل (${batchCount})`,
      status: 'running',
      summary: null,
    };
    state.draftMessage = `جارٍ تشغيل ${agent.title} على ${batchCount} سجلًا، منها ${eligibleCount} مؤهلة مبدئيًا.`;
    router();
    window.setTimeout(async () => {
      try {
        const run = await runAgentBatch(agentKey);
        await refreshAgentRuntimeInfo();
        state.agentBatchState = run;
        state.draftMessage = `اكتمل تشغيل ${agent.title}: ${run.summary.generated} سجلات أنتجت proposals، و${run.summary.noEligible} بلا أهلية، و${run.summary.failed} فشلت.`;
        location.hash = `#/agent-ops?run=${encodeURIComponent(run.id)}`;
        return;
      } catch (error) {
        state.agentBatchState = {
          agentKey,
          title: agent.title,
          scopeLabel: 'دفعة السجلات المؤهلة',
          status: 'failed',
          summary: { total: batchCount, generated: 0, noEligible: 0, failed: batchCount, proposals: 0, manualReview: 0 },
        };
        state.draftMessage = `فشل تشغيل ${agent.title} على الدفعة الحالية.`;
      }
      router();
    }, 120);
  }));
  document.querySelectorAll('[data-action="agent-scope-save"]').forEach(btn => btn.addEventListener('click', () => {
    const scope = {
      kind: btn.dataset.scopeKind || 'queue',
      key: btn.dataset.scopeKey || 'quick-complete',
      label: btn.dataset.scopeLabel || 'دفعة محفوظة',
    };
    const batch = saveAgentBatchTemplate({
      agentKey: btn.dataset.agentKey || scopeAgentRecommendation(scope),
      scope,
      title: `${agentDefinitionByKey(btn.dataset.agentKey || scopeAgentRecommendation(scope)).title} • ${scope.label}`,
    });
    state.draftMessage = `تم حفظ دفعة وكيل جديدة: ${batch.title}.`;
    router();
  }));
  document.querySelectorAll('[data-action="agent-scope-run"]').forEach(btn => btn.addEventListener('click', () => {
    const scope = {
      kind: btn.dataset.scopeKind || 'queue',
      key: btn.dataset.scopeKey || 'quick-complete',
      label: btn.dataset.scopeLabel || 'دفعة scoped',
    };
    const agentKey = btn.dataset.agentKey || scopeAgentRecommendation(scope);
    const agent = agentDefinitionByKey(agentKey);
    const scopedRecords = recordsForAgentScope(scope);
    state.agentBatchState = {
      agentKey,
      title: agent.title,
      scopeLabel: `${agentScopeKindLabel(scope.kind)}: ${scope.label}`,
      status: 'running',
      summary: null,
    };
    state.draftMessage = `جارٍ تشغيل ${agent.title} على نطاق ${scope.label} (${scopedRecords.length} سجل).`;
    router();
    window.setTimeout(async () => {
      try {
        const run = await runAgentBatchScoped(agentKey, scope);
        await refreshAgentRuntimeInfo();
        state.agentBatchState = run;
        state.draftMessage = `اكتمل تشغيل ${agent.title} على ${scope.label}: ${run.summary.generated} سجلات أنتجت proposals، و${run.summary.noEligible} بلا أهلية، و${run.summary.failed} فشلت.`;
        location.hash = `#/agent-ops?run=${encodeURIComponent(run.id)}`;
        return;
      } catch (error) {
        state.agentBatchState = {
          agentKey,
          title: agent.title,
          scopeLabel: `${agentScopeKindLabel(scope.kind)}: ${scope.label}`,
          status: 'failed',
          summary: { total: scopedRecords.length, generated: 0, noEligible: 0, failed: scopedRecords.length, proposals: 0, manualReview: 0, editorialHandoff: 0, verificationHandoff: 0 },
        };
        state.draftMessage = `فشل تشغيل ${agent.title} على نطاق ${scope.label}.`;
      }
      router();
    }, 120);
  }));
  document.querySelectorAll('[data-action="saved-agent-batch-run"]').forEach(btn => btn.addEventListener('click', () => {
    const batch = savedAgentBatchEntries().find(item => item.id === (btn.dataset.batchId || ''));
    if (!batch) {
      state.draftMessage = 'تعذر العثور على الدفعة المحفوظة.';
      router();
      return;
    }
    const agent = agentDefinitionByKey(batch.agentKey);
    const scopedRecords = recordsForAgentScope(batch.scope);
    state.agentBatchState = {
      agentKey: batch.agentKey,
      title: agent.title,
      scopeLabel: `${agentScopeKindLabel(batch.scope.kind)}: ${batch.scope.label}`,
      status: 'running',
      summary: null,
    };
    state.draftMessage = `جارٍ إعادة تشغيل ${agent.title} على الدفعة المحفوظة "${batch.title}" (${scopedRecords.length} سجل).`;
    router();
    window.setTimeout(async () => {
      try {
        const run = await runAgentBatchScoped(batch.agentKey, batch.scope);
        await refreshAgentRuntimeInfo();
        state.agentBatchState = run;
        state.draftMessage = `اكتمل تشغيل الدفعة المحفوظة "${batch.title}".`;
        location.hash = `#/agent-ops?run=${encodeURIComponent(run.id)}`;
        return;
      } catch (error) {
        state.agentBatchState = {
          agentKey: batch.agentKey,
          title: agent.title,
          scopeLabel: `${agentScopeKindLabel(batch.scope.kind)}: ${batch.scope.label}`,
          status: 'failed',
          summary: { total: scopedRecords.length, generated: 0, noEligible: 0, failed: scopedRecords.length, proposals: 0, manualReview: 0, editorialHandoff: 0, verificationHandoff: 0 },
        };
        state.draftMessage = `فشل تشغيل الدفعة المحفوظة "${batch.title}".`;
      }
      router();
    }, 120);
  }));
  document.querySelectorAll('[data-action="agent-proposal-status"]').forEach(btn => btn.addEventListener('click', () => {
    const proposal = updateAgentProposalStatus(btn.dataset.proposalId || '', btn.dataset.status || 'in_review');
    state.draftMessage = proposal
      ? `تم تحديث الاقتراح إلى: ${agentProposalStatusLabel(proposal.status)}.`
      : 'تعذر تحديث حالة الاقتراح.';
    router();
  }));
  document.querySelectorAll('[data-action="agent-proposal-accept"]').forEach(btn => btn.addEventListener('click', () => {
    const proposal = acceptAgentProposalToDraft(btn.dataset.proposalId || '');
    state.draftMessage = proposal
      ? proposal.handoffTarget === 'verification_draft'
        ? 'تم قبول الاقتراح وحفظه داخل draft التحقق فقط.'
        : 'تم قبول الاقتراح وحفظه داخل draft التحريرية فقط.'
      : 'تعذر قبول الاقتراح الحالي.';
    router();
  }));
  document.querySelectorAll('[data-action="mission-seed"]').forEach(btn => btn.addEventListener('click', () => {
    const record = getEntity(btn.dataset.slug || state.currentSlug || '');
    const suggestion = suggestedRecordMissions(record).find(item => item.id === btn.dataset.missionId);
    const seeded = seedMissionFromSuggestion(suggestion || {});
    state.draftMessage = seeded
      ? 'تم فتح مهمة جديدة لهذا السجل.'
      : 'تعذر فتح مهمة جديدة لهذا السجل.';
    router();
  }));
  document.querySelectorAll('[data-action="add-evidence"]').forEach(btn => btn.addEventListener('click', () => {
    const slug = btn.dataset.slug || '';
    const record = getEntity(slug);
    addEvidenceEntry({
      slug,
      name: record?.name || slug,
      category: document.getElementById('evidenceCategory')?.value || 'general',
      outcome: document.getElementById('evidenceOutcome')?.value || 'pending',
      note: document.getElementById('evidenceNote')?.value || '',
      rationale: document.getElementById('evidenceNote')?.value || '',
      sourceState: sourceVerificationState(record || {}).key,
      districtState: districtVerificationState(record || {}).key,
      confidenceState: confidenceVerificationState(record || {}).key,
    });
    state.draftMessage = 'تمت إضافة دليل جديد إلى evidence trail لهذا السجل.';
    router();
  }));
}


export function applyDashboardPreset(preset = '') {
  Object.keys(state.filters).forEach(key => { state.filters[key] = ''; });
  switch (preset) {
    case 'review':
      location.hash = queueHref('needs-review');
      return;
    case 'unverified':
      location.hash = queueHref('new-incomplete');
      return;
    case 'missing-district':
      location.hash = queueHref('missing-district');
      return;
    case 'low-confidence':
      location.hash = queueHref('low-confidence');
      return;
    default:
      return;
  }
}


export function bindDashboardActions() {
  document.querySelectorAll('[data-action="dashboard-preset"]').forEach(btn => {
    btn.addEventListener('click', () => {
      applyDashboardPreset(btn.dataset.preset);
    });
  });
  document.querySelectorAll('[data-action="queue-sort"]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.queueSort = btn.dataset.sort || 'default';
      const { parts } = parseHashRoute();
      const [, queueId] = parts;
      if (parts[0] === 'ops') {
        location.hash = queueHref(decodeURIComponent(queueId || 'needs-review'), { priority: state.queuePriority, sort: state.queueSort });
        return;
      }
      if (parts[0] === 'bulk') {
        location.hash = `#/bulk/${encodeURIComponent(decodeURIComponent(queueId || 'needs-review'))}?priority=${encodeURIComponent(state.queuePriority)}&sort=${encodeURIComponent(state.queueSort)}`;
        return;
      }
      router();
    });
  });
  document.querySelectorAll('[data-action="queue-priority"]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.queuePriority = btn.dataset.priority || 'default';
      const { parts } = parseHashRoute();
      const [, queueId] = parts;
      if (parts[0] === 'ops') {
        location.hash = queueHref(decodeURIComponent(queueId || 'needs-review'), { priority: state.queuePriority, sort: state.queueSort });
        return;
      }
      if (parts[0] === 'bulk') {
        location.hash = `#/bulk/${encodeURIComponent(decodeURIComponent(queueId || 'needs-review'))}?priority=${encodeURIComponent(state.queuePriority)}&sort=${encodeURIComponent(state.queueSort)}`;
        return;
      }
      router();
    });
  });
  document.querySelectorAll('[data-action="bulk-select"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const queueKey = btn.dataset.queue || 'needs-review';
      const session = getReviewSession(queueKey);
      session.currentSlug = btn.dataset.slug || '';
      session.startedAt ||= new Date().toISOString();
      saveReviewSession(queueKey, session);
      router();
    });
  });
  document.querySelectorAll('[data-action="bulk-nav"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const queueKey = btn.dataset.queue || 'needs-review';
      const workspace = bulkWorkspaceState(queueKey);
      if (!workspace.items.length) return;
      const nextIndex = btn.dataset.direction === 'prev'
        ? Math.max(workspace.currentIndex - 1, 0)
        : Math.min(workspace.currentIndex + 1, workspace.items.length - 1);
      const session = getReviewSession(queueKey);
      session.startedAt ||= new Date().toISOString();
      session.currentSlug = workspace.items[nextIndex]?.slug || session.currentSlug;
      saveReviewSession(queueKey, session);
      router();
    });
  });
  document.querySelectorAll('[data-action="bulk-decision"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const queueKey = btn.dataset.queue || 'needs-review';
      const slug = btn.dataset.slug || '';
      const decision = btn.dataset.decision || 'done';
      const workspace = bulkWorkspaceState(queueKey);
      const record = workspace.items.find(item => item.slug === slug);
      const session = getReviewSession(queueKey);
      session.decisions ||= {};
      session.startedAt ||= new Date().toISOString();
      const note = document.getElementById('bulkDecisionNote')?.value || '';
      session.decisions[slug] = bulkDecisionEntry(record, queueKey, decision, note);
      const currentIndex = workspace.items.findIndex(item => item.slug === slug);
      const nextIndex = Math.min(currentIndex + 1, Math.max(workspace.items.length - 1, 0));
      session.currentSlug = workspace.items[nextIndex]?.slug || slug;
      saveReviewSession(queueKey, session);
      router();
    });
  });
  document.querySelectorAll('[data-action="bulk-finish"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const queueKey = btn.dataset.queue || 'needs-review';
      const session = getReviewSession(queueKey);
      session.startedAt ||= new Date().toISOString();
      session.finishedAt = new Date().toISOString();
      saveReviewSession(queueKey, session);
      router();
    });
  });
  document.querySelectorAll('[data-action="bulk-export"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const queueKey = btn.dataset.queue || 'needs-review';
      const format = btn.dataset.format || 'json';
      const session = getReviewSession(queueKey);
      session.startedAt ||= new Date().toISOString();
      session.exportedAt = new Date().toISOString();
      saveReviewSession(queueKey, session);
      if (format === 'csv') {
        downloadText(`${queueKey}-bulk-review.csv`, exportableBatchCsv(queueKey), 'text/csv;charset=utf-8');
      } else if (format === 'summary') {
        downloadText(`${queueKey}-review-summary.txt`, exportableBatchSummary(queueKey));
      } else {
        downloadJson(`${queueKey}-batch-decisions.json`, exportableBatchPayload(queueKey));
      }
      pushExportHistoryEntry(queueKey, format);
      router();
    });
  });
}


export function router() {
  const hash = location.hash || '#/dashboard';
  const { parts, query } = parseHashRoute(hash);
  const [section, id] = parts;
  if (section !== 'sector') { delete state._opsFilter; delete state._opsSector; }
  let html = '';
  switch(section) {
    case 'dashboard': setMeta('نظرة عامة', 'دليل بريدة / نظرة عامة'); html = renderDashboard(); break;
    case 'blueprint': setMeta('طريقة التنظيم', 'عن الدليل / طريقة التنظيم'); html = renderBlueprintPage(); break;
    case 'sectors': setMeta('فهرس القطاعات', 'الرئيسية / فهرس القطاعات'); html = renderSectorsIndexPage(); break;
    case 'sector': {
      const targetSector = decodeURIComponent(id || 'cafes');
      if (state._opsSector !== targetSector) { delete state._opsFilter; state._opsSector = targetSector; }
      const sectorTitle = sectorLabelByKey(targetSector);
      setMeta(sectorTitle, `القطاعات / ${sectorTitle}`);
      html = renderSectorPage(targetSector);
      break;
    }
    case 'entities':
      if (id) {
        const entitySlug = decodeURIComponent(id);
        const entity = getEntity(entitySlug);
        const entitySectorLabel = entity?.sector ? sectorLabelByKey(entity.sector) : '';
        const entityBreadcrumb = entitySectorLabel
          ? `${entitySectorLabel} / ${entity?.name || entitySlug}`
          : `الكيانات / ${entity?.name || entitySlug}`;
        setMeta(entity?.name || 'صفحة الكيان', entityBreadcrumb);
        html = renderEntityPage(entitySlug);
      }
      else { setMeta('الكيانات', 'الرئيسية / الكيانات'); html = renderEntitiesPage(); }
      break;
    case 'districts': setMeta(id ? `حي ${decodeURIComponent(id)}` : 'تصفح بالأحياء', id ? `الأحياء / ${decodeURIComponent(id)}` : 'الرئيسية / الأحياء'); html = renderDistrictsPage(id ? decodeURIComponent(id) : ''); break;
    case 'filters': setMeta('بحث متقدم', 'الرئيسية / بحث متقدم'); html = renderFiltersPage(); break;
    case 'pipeline': setMeta('مصادر المعلومات', 'عن الدليل / مصادر المعلومات'); html = renderPipelinePage(); break;
    case 'discovery': setMeta('الاكتشاف', 'عن الدليل / الاكتشاف'); html = renderDiscoveryPage(); break;
    case 'ops-hub': setMeta('مركز تشغيل المراجعة', 'التشغيل / مركز المراجعة'); html = renderReviewOperationsHub(); break;
    case 'editorial-hub': setMeta('مركز التحكم التحريري', 'التشغيل / مركز التحرير'); html = renderEditorialControlCenter(); break;
    case 'agent-drafts': setMeta('مسودات الوكلاء', 'التشغيل / مسودات الوكلاء'); html = renderAgentDraftsHub(); break;
    case 'agent-ops': setMeta('مركز عمليات الوكلاء', 'التشغيل / عمليات الوكلاء'); html = renderAgentOpsConsole(query.get('run') || ''); break;
    case 'verification-program': setMeta('مركز عمليات التحقق والمهام', 'التشغيل / مركز عمليات التحقق والمهام'); html = renderVerificationProgramHub(); break;
    case 'focus': {
      const focusSlug = decodeURIComponent(id || '');
      const focusEntity = getEntity(focusSlug);
      setMeta(focusEntity?.name || 'تنفيذ مركّز', 'التنفيذ / ' + (focusEntity?.name || focusSlug));
      html = renderFocusWorkbench(focusSlug);
      break;
    }
    case 'exec-queue': setMeta('قائمة التنفيذ اليومي', 'إدارة الدليل / التنفيذ اليومي'); html = renderExecutionQueue(); break;
    case 'sector-board': setMeta('لوحة قرار القطاعات', 'إدارة الدليل / لوحة القطاعات'); html = renderSectorDecisionBoard(); break;
    case 'release-readiness': setMeta('الجاهزية للنشر', 'إدارة الدليل / الجاهزية للنشر'); html = renderReleaseReadinessHub(); break;
    case 'verification':
      setMeta('نظام التحقق', `التشغيل / التحقق / ${verificationQueues()[decodeURIComponent(id || 'source-review')]?.title || 'نظام التحقق'}`);
      html = renderVerificationWorkspace(decodeURIComponent(id || 'source-review'));
      break;
    case 'ops':
      state.queueSort = query.get('sort') || state.queueSort || 'default';
      state.queuePriority = query.get('priority') || state.queuePriority || 'default';
      setMeta(queueTitleByKey(decodeURIComponent(id || 'needs-review')), `التشغيل / ${queueTitleByKey(decodeURIComponent(id || 'needs-review'))}`);
      html = renderAttentionQueuePage(decodeURIComponent(id || 'needs-review'));
      break;
    case 'bulk':
      state.queueSort = query.get('sort') || state.queueSort || 'default';
      state.queuePriority = query.get('priority') || state.queuePriority || 'default';
      setMeta(`جلسة ${queueTitleByKey(decodeURIComponent(id || 'needs-review'))}`, `التشغيل / bulk review / ${queueTitleByKey(decodeURIComponent(id || 'needs-review'))}`);
      html = renderBulkWorkspace(decodeURIComponent(id || 'needs-review'));
      break;
    case 'review': setMeta('المراجعة', 'التشغيل / المراجعة'); html = renderReviewPage(); break;
    case 'sources': setMeta('الحالات', 'المعرفة / الحالات'); html = renderStatusPage(); break;
    case 'governance': setMeta('معايير الجودة', 'عن الدليل / معايير الجودة'); html = renderGovernancePage(); break;
    case 'search': setMeta('نتائج البحث', 'البحث'); html = renderSearch(decodeURIComponent(id || '')); break;
    default: setMeta('نظرة عامة', 'دليل بريدة / نظرة عامة'); html = renderDashboard(); break;
  }
  app.innerHTML = html;
  bindFilters();
  bindEditorActions();
  bindDashboardActions();
  syncMobileNavSections();
}

searchInput?.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    location.hash = `#/search/${encodeURIComponent(searchInput.value.trim())}`;
  }
});
searchButton?.addEventListener('click', () => {
  location.hash = `#/search/${encodeURIComponent(searchInput.value.trim())}`;
});

window.addEventListener('hashchange', () => {
  closeSidebar();
  router();
});

(async function init(){
  try {
    await loadData();
    await refreshAgentRuntimeInfo();
    bindSidebar();
    bindMobileNavSections();
    router();
  } catch (err) {
    app.innerHTML = `<div class="empty">فشل تحميل master.json مباشرة. افتح الواجهة عبر خادم محلي بسيط بدل فتح الملف مباشرة من النظام.<br><br>${esc(err.message)}</div>`;
  }
})();

