/**
 * global-tracker.js — Vanguard Social Multi-Page Task Persistence & Floating Status Widget
 * Automatically re-attaches running intelligence jobs across page navigations,
 * provides live queue tracking, and surfaces instant result downloads from any page.
 * Strictly zero emojis. Vanguard institutional standard.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'vanguard_active_task';
  let pollTimer = null;
  let widgetContainer = null;

  function getStoredTask() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const task = JSON.parse(raw);
      // Auto-expire tasks older than 45 minutes
      if (Date.now() - (task.startTime || 0) > 45 * 60 * 1000) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return task;
    } catch (_) {
      return null;
    }
  }

  function setStoredTask(task) {
    try {
      if (!task) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(task));
      }
    } catch (_) {}
  }

  function isCurrentToolPage(task) {
    if (!task || !task.toolUrl) return false;
    const currentPath = window.location.pathname.replace(/\/+$/, '');
    const toolPath = task.toolUrl.split('?')[0].replace(/\/+$/, '');
    return currentPath === toolPath || (task.tool && window.location.search.includes(task.tool));
  }

  function renderFloatingWidget(task) {
    if (!task) {
      if (widgetContainer) {
        widgetContainer.remove();
        widgetContainer = null;
      }
      return;
    }

    // If user is currently on the tool page itself, hide the floating widget to avoid visual duplication
    if (isCurrentToolPage(task)) {
      if (widgetContainer) {
        widgetContainer.style.display = 'none';
      }
      return;
    }

    if (!widgetContainer) {
      widgetContainer = document.createElement('div');
      widgetContainer.id = 'vanguardGlobalTrackerWidget';
      widgetContainer.className = 'fixed bottom-4 right-4 z-[9999] w-[calc(100vw-2rem)] sm:w-96 max-w-sm rounded-2xl bg-white border border-slate-200 shadow-2xl p-4 font-sans text-slate-900 transition-all duration-300';
      document.body.appendChild(widgetContainer);
    } else {
      widgetContainer.style.display = 'block';
    }

    const isQueued = task.status === 'queued';
    const isCompleted = task.status === 'completed';
    const isFailed = task.status === 'failed' || task.status === 'stopped';
    const progress = Math.max(5, Math.min(100, task.progress || 5));

    let dotColor = 'bg-blue-600 animate-pulse';
    let badgeText = 'RUNNING';
    let badgeBg = 'bg-blue-50 text-blue-700 border-blue-200';

    if (isQueued) {
      dotColor = 'bg-amber-500 animate-pulse';
      badgeText = `QUEUED (#${task.queuePosition || 1})`;
      badgeBg = 'bg-amber-50 text-amber-700 border-amber-200';
    } else if (isCompleted) {
      dotColor = 'bg-emerald-500';
      badgeText = 'READY';
      badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else if (isFailed) {
      dotColor = 'bg-rose-500';
      badgeText = 'STOPPED';
      badgeBg = 'bg-rose-50 text-rose-700 border-rose-200';
    }

    let statusMsg = task.lastLog || 'Processing request...';
    if (isQueued) {
      statusMsg = `Waiting for engine slot (Position #${task.queuePosition || 1}). Will start automatically.`;
    } else if (isCompleted) {
      statusMsg = 'Extraction complete. Single-sheet Excel workbook ready for download.';
    }

    const actionUrl = task.toolUrl || '/tools';

    widgetContainer.innerHTML = `
      <div class="flex items-center justify-between pb-2 border-b border-slate-100">
        <div class="flex items-center gap-2">
          <span class="h-2.5 w-2.5 rounded-full ${dotColor}"></span>
          <span class="font-display text-xs font-bold uppercase tracking-wider text-slate-800">Engine Active</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${badgeBg}">${badgeText}</span>
          <button type="button" id="vanguardDismissTrackerBtn" class="text-slate-400 hover:text-slate-600 p-1 text-xs font-bold leading-none cursor-pointer" title="Dismiss Widget"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
      </div>

      <div class="pt-3">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-bold text-slate-900 truncate">${task.toolName || 'Intelligence Tool'}</span>
          <span class="text-xs font-mono font-bold text-slate-600">${isQueued ? 'In Queue' : progress + '%'}</span>
        </div>
        
        <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
          <div class="h-full ${isQueued ? 'bg-amber-500' : (isCompleted ? 'bg-emerald-500' : 'bg-blue-600')} transition-all duration-300" style="width: ${isQueued ? '100%' : progress + '%'}"></div>
        </div>

        <p class="text-[11px] text-slate-500 line-clamp-1 mb-3">${statusMsg}</p>

        <div class="flex items-center gap-2">
          <a href="${actionUrl}" class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl ${isCompleted ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-900 hover:bg-slate-800'} text-white text-xs font-semibold py-2 px-3 shadow-sm transition">
            <span>${isCompleted ? 'View & Download Report' : 'Open Live Workspace'}</span>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
          </a>
        </div>
      </div>
    `;

    const dismissBtn = widgetContainer.querySelector('#vanguardDismissTrackerBtn');
    if (dismissBtn) {
      dismissBtn.onclick = function () {
        if (isCompleted || isFailed) {
          setStoredTask(null);
        }
        if (widgetContainer) {
          widgetContainer.style.display = 'none';
        }
      };
    }
  }

  async function pollActiveTask() {
    const task = getStoredTask();
    if (!task || !task.taskId) {
      renderFloatingWidget(null);
      if (pollTimer) clearInterval(pollTimer);
      return;
    }

    if (task.status === 'completed' || task.status === 'failed' || task.status === 'stopped') {
      renderFloatingWidget(task);
      if (pollTimer) clearInterval(pollTimer);
      return;
    }

    try {
      const res = await fetch(`/api/task?id=${encodeURIComponent(task.taskId)}`);
      if (!res.ok) {
        if (res.status === 404) {
          setStoredTask(null);
          renderFloatingWidget(null);
          if (pollTimer) clearInterval(pollTimer);
        }
        return;
      }

      const remote = await res.json();
      task.status = remote.status || task.status;
      task.progress = remote.progress !== undefined ? remote.progress : task.progress;
      task.queuePosition = remote.queue_position !== undefined ? remote.queue_position : task.queuePosition;
      if (remote.logs && remote.logs.length) {
        const last = remote.logs[remote.logs.length - 1];
        task.lastLog = last.replace(/^\[.*?\]\s*/, '');
      }
      if (remote.excel_file) {
        task.excelFile = remote.excel_file;
      }
      if (remote.result) {
        task.result = remote.result;
      }
      if (remote.error) {
        task.error = remote.error;
      }

      task.lastPoll = Date.now();
      setStoredTask(task);
      renderFloatingWidget(task);

      if (task.status === 'completed' || task.status === 'failed' || task.status === 'stopped') {
        if (pollTimer) clearInterval(pollTimer);
      }
    } catch (_) {}
  }

  function initTracker() {
    const task = getStoredTask();
    if (task) {
      renderFloatingWidget(task);
      if (task.status === 'running' || task.status === 'queued') {
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = setInterval(pollActiveTask, 3000);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTracker);
  } else {
    initTracker();
  }

  // Cross-tab synchronization via storage event
  window.addEventListener('storage', function (e) {
    if (e.key === STORAGE_KEY) {
      const updatedTask = getStoredTask();
      renderFloatingWidget(updatedTask);
      if (updatedTask && (updatedTask.status === 'running' || updatedTask.status === 'queued')) {
        if (!pollTimer) pollTimer = setInterval(pollActiveTask, 3000);
      }
    }
  });

  // Global helper on window object for pages to trigger sync
  window.vanguardTaskTracker = {
    register: function (taskData) {
      setStoredTask(taskData);
      renderFloatingWidget(taskData);
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = setInterval(pollActiveTask, 3000);
    },
    update: function (updates) {
      const current = getStoredTask() || {};
      const merged = Object.assign({}, current, updates);
      setStoredTask(merged);
      renderFloatingWidget(merged);
    },
    clear: function () {
      setStoredTask(null);
      renderFloatingWidget(null);
      if (pollTimer) clearInterval(pollTimer);
    },
    get: getStoredTask
  };
})();
