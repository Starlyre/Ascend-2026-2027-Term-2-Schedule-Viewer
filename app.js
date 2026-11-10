/**
 * Organization ASCEND - NU Fairview
 * Academic Society of Computer Engineering Discipline
 * Schedule Availability Checker Engine
 */

// State Management
const state = {
  selectedOfficers: OFFICERS_DATA.map(o => o.id), // All 10 officers selected by default
  activeTab: 'meeting-finder',
  currentTheme: 'dark',
  viewingOfficerId: OFFICERS_DATA[0].id,
  compareOfficerIds: [OFFICERS_DATA[0].id, OFFICERS_DATA[1].id],
  meetingFilter: {
    duration: 60, // in minutes
    day: 'all',
    window: 'all', // all, morning, afternoon, evening
    threshold: 1.0 // 1.0 = 100%, 0.9 = 90%+, 0.8 = 80%+
  },
  instantCheck: {
    day: 'Monday',
    time: '11:00'
  }
};

// Utilities: Time Conversion
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(totalMins) {
  const h24 = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

function minutesTo24h(totalMins) {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Check if an officer is busy in a time range [startMins, endMins] on a given day
function getOfficerConflict(officer, dayName, startMins, endMins) {
  return officer.classes.find(c => {
    if (c.day.toLowerCase() !== dayName.toLowerCase()) return false;
    const cStart = timeToMinutes(c.startTime);
    const cEnd = timeToMinutes(c.endTime);
    // Overlap condition
    return cStart < endMins && cEnd > startMins;
  });
}

// Get all officers who are busy during [startMins, endMins]
function getSlotAvailability(officerIds, dayName, startMins, endMins) {
  const available = [];
  const busy = [];

  officerIds.forEach(id => {
    const officer = OFFICERS_DATA.find(o => o.id === id);
    if (!officer) return;
    const conflict = getOfficerConflict(officer, dayName, startMins, endMins);
    if (conflict) {
      busy.push({ officer, conflict });
    } else {
      available.push(officer);
    }
  });

  return {
    day: dayName,
    startMins,
    endMins,
    available,
    busy,
    ratio: available.length / (officerIds.length || 1),
    totalCount: officerIds.length,
    freeCount: available.length
  };
}

// Find continuous free meeting windows
function findMeetingSlots() {
  const selected = state.selectedOfficers;
  if (selected.length === 0) return [];

  const targetDurationMins = parseInt(state.meetingFilter.duration, 10);
  const selectedDay = state.meetingFilter.day;
  const selectedWindow = state.meetingFilter.window;
  const threshold = parseFloat(state.meetingFilter.threshold);

  const daysToTest = selectedDay === 'all' ? DAYS_OF_WEEK : [selectedDay];
  const step = 30; // 30-minute atomic resolution

  let windowStart = 7 * 60; // 7:00 AM
  let windowEnd = 20 * 60;  // 8:00 PM

  if (selectedWindow === 'morning') {
    windowStart = 7 * 60;
    windowEnd = 12 * 60;
  } else if (selectedWindow === 'afternoon') {
    windowStart = 12 * 60;
    windowEnd = 17 * 60;
  } else if (selectedWindow === 'evening') {
    windowStart = 17 * 60;
    windowEnd = 20 * 60;
  }

  const results = [];

  daysToTest.forEach(day => {
    // Generate atomic 30-min blocks
    const blocks = [];
    for (let m = windowStart; m < windowEnd; m += step) {
      const slot = getSlotAvailability(selected, day, m, m + step);
      blocks.push(slot);
    }

    // Merge consecutive blocks that meet threshold with same available officers
    let currentSpan = null;
    blocks.forEach(b => {
      const meetsThreshold = b.ratio >= threshold;
      if (!meetsThreshold) {
        if (currentSpan) {
          if (currentSpan.endMins - currentSpan.startMins >= targetDurationMins) {
            results.push(currentSpan);
          }
          currentSpan = null;
        }
        return;
      }

      // Check if can merge with currentSpan
      if (currentSpan) {
        const sameOfficers = currentSpan.available.length === b.available.length &&
          currentSpan.available.every(o => b.available.some(x => x.id === o.id));

        if (sameOfficers) {
          currentSpan.endMins = b.endMins;
          return;
        } else {
          // Finish previous span if long enough
          if (currentSpan.endMins - currentSpan.startMins >= targetDurationMins) {
            results.push(currentSpan);
          }
        }
      }

      currentSpan = {
        day: b.day,
        startMins: b.startMins,
        endMins: b.endMins,
        available: [...b.available],
        busy: [...b.busy],
        ratio: b.ratio,
        totalCount: b.totalCount,
        freeCount: b.freeCount
      };
    });

    if (currentSpan && currentSpan.endMins - currentSpan.startMins >= targetDurationMins) {
      results.push(currentSpan);
    }
  });

  // Sort: highest availability ratio first, then longest duration, then chronological
  results.sort((a, b) => {
    if (b.ratio !== a.ratio) return b.ratio - a.ratio;
    const durA = a.endMins - a.startMins;
    const durB = b.endMins - b.startMins;
    if (durB !== durA) return durB - durA;
    return a.startMins - b.startMins;
  });

  return results;
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every(x => setB.has(x));
}

// ==========================================================================
// DOM Rendering & UI Updates
// ==========================================================================

function initUI() {
  const totalOfficersEl = document.getElementById('totalOfficersStat');
  if (totalOfficersEl) {
    totalOfficersEl.textContent = `${OFFICERS_DATA.length} Leaders`;
  }
  renderOfficerSelectorChips();
  setupEventListeners();
  renderMeetingFinder();
  renderHeatmap();
  renderInstantChecker();
  renderOfficerProfile();
  renderComparison();
  updateLiveTracker();
  setInterval(updateLiveTracker, 30000); // Check every 30s
}

// 1. Officer Selection Chips
function renderOfficerSelectorChips() {
  const container = document.getElementById('officerChipsContainer');
  if (!container) return;

  container.innerHTML = OFFICERS_DATA.map(officer => {
    const isSelected = state.selectedOfficers.includes(officer.id);
    return `
      <div class="officer-toggle-chip ${isSelected ? 'active' : ''}" data-id="${officer.id}">
        <span class="chip-avatar">${officer.name.charAt(0)}</span>
        <span>${officer.name}</span>
        <span class="chip-check">${isSelected ? '✓' : '+'}</span>
      </div>
    `;
  }).join('');

  document.getElementById('selectedCountLabel').textContent = `${state.selectedOfficers.length} / ${OFFICERS_DATA.length} Officers Selected`;
}

// 2. Meeting Finder Tab
function renderMeetingFinder() {
  const container = document.getElementById('meetingSlotsContainer');
  if (!container) return;

  const slots = findMeetingSlots();

  if (state.selectedOfficers.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">
        <p>⚠️ No officers selected. Please select at least one officer above to find availability.</p>
      </div>
    `;
    return;
  }

  if (slots.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted); background: var(--bg-secondary); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
        <p style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem;">No meeting slots found matching your criteria</p>
        <p style="font-size: 0.85rem;">Try shortening the meeting duration or lowering the availability threshold to 90% or 80% to allow minor conflicts.</p>
      </div>
    `;
    return;
  }

  // Highlight banner for Wednesday if included
  const recBanner = document.getElementById('topRecommendationBanner');
  if (recBanner) {
    const wednesdayIncluded = state.meetingFilter.day === 'all' || state.meetingFilter.day === 'Wednesday';
    if (wednesdayIncluded && state.selectedOfficers.length > 0) {
      recBanner.style.display = 'flex';
      const count = state.selectedOfficers.length;
      recBanner.innerHTML = `
        <div class="rec-left">
          <div class="rec-star-badge">🌟</div>
          <div>
            <div class="rec-title">Optimal Organization Window: Wednesday (All Day)</div>
            <div class="rec-desc">Zero class conflicts for all ${count} officers! Recommended for General Assemblies, Executive Meetings, and Organization Workshops.</div>
          </div>
        </div>
        <button class="btn-primary" onclick="copySlotText('Wednesday', '07:00 AM - 08:00 PM', 'All Day', ${count}, ${count})">
          📋 Copy Wednesday Slot
        </button>
      `;
    } else {
      recBanner.style.display = 'none';
    }
  }

  container.innerHTML = slots.map(slot => {
    const isPerfect = slot.ratio === 1.0;
    const durationMins = slot.endMins - slot.startMins;
    const hours = Math.floor(durationMins / 60);
    const mins = durationMins % 60;
    const durationLabel = `${hours > 0 ? hours + ' hr ' : ''}${mins > 0 ? mins + ' min' : ''}`.trim();
    const timeDisplay = `${minutesToTime(slot.startMins)} - ${minutesToTime(slot.endMins)}`;

    return `
      <div class="slot-card ${isPerfect ? 'perfect' : 'near-perfect'}">
        <div class="slot-header">
          <div class="slot-day-time">
            <span class="slot-day">${slot.day}</span>
            <span class="slot-time">${timeDisplay}</span>
            <span class="slot-duration">⏱️ Duration: ${durationLabel}</span>
          </div>
          <span class="slot-badge ${isPerfect ? 'green' : 'amber'}">
            ${slot.freeCount}/${slot.totalCount} Free (${Math.round(slot.ratio * 100)}%)
          </span>
        </div>

        <div class="slot-body">
          <div style="font-weight: 600; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">
            Available (${slot.available.length}):
          </div>
          <div class="officer-list-pill">
            ${slot.available.map(o => `<span class="officer-mini-tag">✓ ${o.name}</span>`).join('')}
          </div>

          ${slot.busy.length > 0 ? `
            <div style="font-weight: 600; font-size: 0.75rem; color: #f87171; text-transform: uppercase; margin-top: 0.6rem;">
              Conflicts (${slot.busy.length}):
            </div>
            <div class="officer-list-pill">
              ${slot.busy.map(b => `<span class="officer-mini-tag conflict" title="${b.conflict.name} (${b.conflict.room})">✕ ${b.officer.name} (${b.conflict.code || b.conflict.name.substring(0, 10)})</span>`).join('')}
            </div>
          ` : ''}
        </div>

        <div class="slot-footer">
          <span style="font-size: 0.75rem; color: var(--text-dim);">${isPerfect ? '✨ Zero conflicts' : '⚠️ Minor conflict'}</span>
          <button class="btn-copy-slot" onclick="copySlotText('${slot.day}', '${timeDisplay}', '${durationLabel}', ${slot.freeCount}, ${slot.totalCount})">
            <span>📋</span> Copy Proposal
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// 3. Weekly Heatmap Matrix
function renderHeatmap() {
  const container = document.getElementById('heatmapTableContainer');
  if (!container) return;

  const selected = state.selectedOfficers;
  const timeSlots = [];
  for (let m = 7 * 60; m < 20 * 60; m += 60) {
    timeSlots.push(m);
  }

  let html = `
    <table class="heatmap-table">
      <thead>
        <tr>
          <th>Day / Time</th>
          ${timeSlots.map(t => `<th>${minutesToTime(t)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
  `;

  DAYS_OF_WEEK.forEach(day => {
    html += `<tr><td class="day-col">${day}</td>`;

    timeSlots.forEach(startMins => {
      const endMins = startMins + 60;
      const slot = getSlotAvailability(selected, day, startMins, endMins);
      const ratio = slot.ratio;
      let heatClass = 'heat-level-0';

      if (ratio === 1.0) heatClass = 'heat-level-5';
      else if (ratio >= 0.8) heatClass = 'heat-level-4';
      else if (ratio >= 0.6) heatClass = 'heat-level-3';
      else if (ratio >= 0.4) heatClass = 'heat-level-2';
      else if (ratio > 0.0) heatClass = 'heat-level-1';

      html += `
        <td class="heatmap-cell ${heatClass}" 
            onclick="openCellDetailModal('${day}', ${startMins}, ${endMins})"
            title="Click to view details: ${slot.freeCount}/${slot.totalCount} free">
          ${slot.freeCount}/${slot.totalCount}
        </td>
      `;
    });

    html += `</tr>`;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

// 4. Instant Checker Tab
function renderInstantChecker() {
  const day = state.instantCheck.day;
  const timeStr = state.instantCheck.time;
  const targetMins = timeToMinutes(timeStr);
  const endMins = targetMins + 1; // Instant point check

  const selected = state.selectedOfficers;
  const slot = getSlotAvailability(selected, day, targetMins, endMins);

  const freeCountEl = document.getElementById('instantFreeCount');
  const busyCountEl = document.getElementById('instantBusyCount');
  const freeListEl = document.getElementById('instantFreeList');
  const busyListEl = document.getElementById('instantBusyList');

  if (freeCountEl) freeCountEl.textContent = `${slot.available.length} Free`;
  if (busyCountEl) busyCountEl.textContent = `${slot.busy.length} In Class`;

  if (freeListEl) {
    if (slot.available.length === 0) {
      freeListEl.innerHTML = `<div style="color: var(--text-dim); font-size: 0.85rem; padding: 0.5rem;">No officers free at this time.</div>`;
    } else {
      freeListEl.innerHTML = slot.available.map(o => `
        <div class="officer-status-item">
          <div class="name-box">
            <span style="color: #34d399;">●</span>
            <span>${o.fullName || o.name}</span>
          </div>
          <span class="pill-badge" style="background: var(--status-free-bg); color: #34d399; border-color: var(--status-free-border);">Available</span>
        </div>
      `).join('');
    }
  }

  if (busyListEl) {
    if (slot.busy.length === 0) {
      busyListEl.innerHTML = `<div style="color: var(--text-dim); font-size: 0.85rem; padding: 0.5rem;">No officers in class! All selected officers are free.</div>`;
    } else {
      busyListEl.innerHTML = slot.busy.map(b => `
        <div class="officer-status-item">
          <div class="name-box">
            <span style="color: #f87171;">●</span>
            <div>
              <div style="font-weight: 700;">${b.officer.fullName || b.officer.name}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${b.conflict.name} (${b.conflict.timeDisplay})</div>
            </div>
          </div>
          <div style="text-align: right;">
            <span class="class-mini-badge">${b.conflict.room}</span>
            <div style="font-size: 0.7rem; color: var(--text-dim); margin-top: 2px;">${b.conflict.mode}</div>
          </div>
        </div>
      `).join('');
    }
  }
}

// 5. Individual Officer Schedule Tab
function renderOfficerProfile() {
  const officer = OFFICERS_DATA.find(o => o.id === state.viewingOfficerId) || OFFICERS_DATA[0];
  const container = document.getElementById('officerProfileView');
  if (!container) return;

  // Calculate statistics
  const totalClasses = officer.classes.length;
  const daysWithClasses = new Set(officer.classes.map(c => c.day)).size;
  const freeDaysCount = 7 - daysWithClasses;

  let totalClassHours = 0;
  officer.classes.forEach(c => {
    totalClassHours += (timeToMinutes(c.endTime) - timeToMinutes(c.startTime)) / 60;
  });

  // Build schedule table rows sorted by Day and Time
  const dayOrder = { "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6, "Sunday": 7 };
  const sortedClasses = [...officer.classes].sort((a, b) => {
    if (dayOrder[a.day] !== dayOrder[b.day]) return dayOrder[a.day] - dayOrder[b.day];
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });

  container.innerHTML = `
    <div class="officer-profile-card">
      <div class="officer-hero">
        <div class="officer-avatar-lg">${officer.name.charAt(0)}</div>
        <div class="officer-info-box">
          <h2>${officer.fullName || officer.name}</h2>
          <p>${officer.role} • ${officer.program}</p>
          <div class="officer-badges-row">
            <span class="pill-badge gold">NU Fairview</span>
            <span class="pill-badge cyan">Term 2 S.Y. 2026-2027</span>
            ${officer.studentId ? `<span class="pill-badge">ID: ${officer.studentId}</span>` : ''}
          </div>
        </div>
      </div>

      <div class="officer-stats-mini">
        <div class="stat-bubble">
          <div class="bubble-val">${officer.totalUnits}</div>
          <div class="bubble-label">Enrolled Units</div>
        </div>
        <div class="stat-bubble">
          <div class="bubble-val">${totalClassHours.toFixed(1)}h</div>
          <div class="bubble-label">Class Hours / Wk</div>
        </div>
        <div class="stat-bubble">
          <div class="bubble-val">${freeDaysCount}</div>
          <div class="bubble-label">Free Days</div>
        </div>
        <div class="stat-bubble">
          <button class="btn-outline" style="padding: 0.6rem 0.9rem;" onclick="viewOriginalImage('${officer.imageFile}', '${officer.name}')">
            🖼️ View Sched Slip
          </button>
        </div>
      </div>
    </div>

    <div class="schedule-table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Day</th>
            <th>Time</th>
            <th>Subject Code</th>
            <th>Description</th>
            <th>Section</th>
            <th>Room</th>
            <th>Type</th>
            <th>Instructor</th>
          </tr>
        </thead>
        <tbody>
          ${sortedClasses.length === 0 ? `
            <tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-dim);">No classes scheduled.</td></tr>
          ` : sortedClasses.map(c => `
            <tr>
              <td style="font-weight: 700; color: var(--cyan-accent);">${c.day}</td>
              <td style="font-weight: 600;">${c.timeDisplay}</td>
              <td><span style="font-family: monospace; font-weight: 700;">${c.code}</span></td>
              <td>${c.name}</td>
              <td>${c.section || '—'}</td>
              <td><span class="pill-badge" style="font-size: 0.75rem;">${c.room}</span></td>
              <td><span class="mode-badge ${c.mode === 'ONLINE' ? 'online' : 'f2f'}">${c.mode}</span></td>
              <td style="color: var(--text-muted);">${c.instructor || 'TBA'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// 6. Side-by-Side Comparison Tab
function renderComparison() {
  const container = document.getElementById('comparisonContainer');
  if (!container) return;

  const officers = state.compareOfficerIds.map(id => OFFICERS_DATA.find(o => o.id === id)).filter(Boolean);

  if (officers.length === 0) {
    container.innerHTML = `<div style="color: var(--text-muted); padding: 2rem; text-align: center;">Please select at least one officer to compare.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="comparison-grid">
      ${officers.map(officer => {
        const sorted = [...officer.classes].sort((a, b) => a.day.localeCompare(b.day));
        return `
          <div class="compare-col">
            <div class="compare-header">
              <div class="chip-avatar" style="width: 32px; height: 32px; font-size: 1rem;">${officer.name.charAt(0)}</div>
              <div>
                <div style="font-weight: 700;">${officer.name}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${officer.totalUnits} Units Enrolled</div>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem;">
              ${DAYS_OF_WEEK.map(day => {
                const dayClasses = officer.classes.filter(c => c.day === day);
                return `
                  <div style="background: rgba(255, 255, 255, 0.03); border-radius: var(--radius-sm); padding: 0.5rem 0.75rem; border: 1px solid rgba(255, 255, 255, 0.05);">
                    <div style="font-size: 0.75rem; font-weight: 700; color: var(--cyan-accent);">${day}</div>
                    ${dayClasses.length === 0 ? `
                      <div style="font-size: 0.75rem; color: #34d399; margin-top: 0.2rem;">✨ Free All Day</div>
                    ` : dayClasses.map(c => `
                      <div style="font-size: 0.75rem; margin-top: 0.25rem;">
                        <span style="font-weight: 600;">${c.timeDisplay}</span>: ${c.name}
                        <span style="color: var(--text-dim);">(${c.room})</span>
                      </div>
                    `).join('')}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// 7. Live Tracker Widget (Header)
function updateLiveTracker() {
  const now = new Date();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const currentDay = days[now.getDay()];
  const currentMins = now.getHours() * 60 + now.getMinutes();

  const slot = getSlotAvailability(OFFICERS_DATA.map(o => o.id), currentDay, currentMins, currentMins + 1);

  const trackerEl = document.getElementById('liveStatusVal');
  if (trackerEl) {
    trackerEl.innerHTML = `
      <span style="color: ${slot.freeCount > 0 ? '#34d399' : '#f87171'};">●</span>
      ${slot.freeCount} / ${slot.totalCount} Officers Free Right Now (${currentDay})
    `;
  }
}

// ==========================================================================
// Event Listeners & Modals
// ==========================================================================

function setupEventListeners() {
  // 1. Officer Selection Chips
  document.getElementById('officerChipsContainer').addEventListener('click', e => {
    const chip = e.target.closest('.officer-toggle-chip');
    if (!chip) return;
    const id = chip.dataset.id;
    if (state.selectedOfficers.includes(id)) {
      state.selectedOfficers = state.selectedOfficers.filter(x => x !== id);
    } else {
      state.selectedOfficers.push(id);
    }
    renderOfficerSelectorChips();
    renderMeetingFinder();
    renderHeatmap();
    renderInstantChecker();
  });

  // Select All / Deselect All / Presets
  document.getElementById('btnSelectAllOfficers').addEventListener('click', () => {
    state.selectedOfficers = OFFICERS_DATA.map(o => o.id);
    renderOfficerSelectorChips();
    renderMeetingFinder();
    renderHeatmap();
    renderInstantChecker();
  });

  const seniorBtn = document.getElementById('btnSelectSeniors');
  if (seniorBtn) {
    seniorBtn.addEventListener('click', () => {
      // Albano, Carorocan, Taneo, Tuazon (Graduating/Senior Officers taking Capstone/OJT)
      state.selectedOfficers = ['albano', 'carorocan', 'taneo', 'tuazon'];
      renderOfficerSelectorChips();
      renderMeetingFinder();
      renderHeatmap();
      renderInstantChecker();
    });
  }

  const juniorBtn = document.getElementById('btnSelectJuniors');
  if (juniorBtn) {
    juniorBtn.addEventListener('click', () => {
      // Cajis, Dandan, Diaz, Corpuz, Manuson, Saraza, Villanueva
      state.selectedOfficers = ['cajis', 'dandan', 'diaz', 'corpuz', 'manuson', 'saraza', 'villanueva'];
      renderOfficerSelectorChips();
      renderMeetingFinder();
      renderHeatmap();
      renderInstantChecker();
    });
  }

  document.getElementById('btnClearAllOfficers').addEventListener('click', () => {
    state.selectedOfficers = [];
    renderOfficerSelectorChips();
    renderMeetingFinder();
    renderHeatmap();
    renderInstantChecker();
  });

  // Navigation Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const targetId = btn.dataset.target;
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.add('active');
      state.activeTab = targetId;
    });
  });

  // Meeting Filter Controls
  document.getElementById('filterDuration').addEventListener('change', e => {
    state.meetingFilter.duration = e.target.value;
    renderMeetingFinder();
  });

  document.getElementById('filterDay').addEventListener('change', e => {
    state.meetingFilter.day = e.target.value;
    renderMeetingFinder();
  });

  document.getElementById('filterWindow').addEventListener('change', e => {
    state.meetingFilter.window = e.target.value;
    renderMeetingFinder();
  });

  document.getElementById('filterThreshold').addEventListener('change', e => {
    state.meetingFilter.threshold = e.target.value;
    renderMeetingFinder();
  });

  // Instant Checker Controls
  document.getElementById('instantDaySelect').addEventListener('change', e => {
    state.instantCheck.day = e.target.value;
    renderInstantChecker();
  });

  document.getElementById('instantTimeInput').addEventListener('input', e => {
    state.instantCheck.time = e.target.value;
    renderInstantChecker();
  });

  document.getElementById('btnUseCurrentTime').addEventListener('click', () => {
    const now = new Date();
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let day = days[now.getDay()];
    if (day === "Sunday") day = "Monday"; // Default to Monday if Sunday
    const time24 = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    state.instantCheck.day = day;
    state.instantCheck.time = time24;

    document.getElementById('instantDaySelect').value = day;
    document.getElementById('instantTimeInput').value = time24;
    renderInstantChecker();
    showToast(`Updated to current time: ${day} ${time24}`);
  });

  // Officer Profile Dropdown
  const officerSelectEl = document.getElementById('officerProfileSelect');
  if (officerSelectEl) {
    officerSelectEl.innerHTML = OFFICERS_DATA.map(o => `<option value="${o.id}">${o.fullName || o.name}</option>`).join('');
    officerSelectEl.addEventListener('change', e => {
      state.viewingOfficerId = e.target.value;
      renderOfficerProfile();
    });
  }

  // Compare Officer Selectors
  const compareSelect1 = document.getElementById('compareSelect1');
  const compareSelect2 = document.getElementById('compareSelect2');
  if (compareSelect1 && compareSelect2) {
    compareSelect1.innerHTML = OFFICERS_DATA.map(o => `<option value="${o.id}" ${o.id === state.compareOfficerIds[0] ? 'selected' : ''}>${o.name}</option>`).join('');
    compareSelect2.innerHTML = OFFICERS_DATA.map(o => `<option value="${o.id}" ${o.id === state.compareOfficerIds[1] ? 'selected' : ''}>${o.name}</option>`).join('');

    compareSelect1.addEventListener('change', e => {
      state.compareOfficerIds[0] = e.target.value;
      renderComparison();
    });
    compareSelect2.addEventListener('change', e => {
      state.compareOfficerIds[1] = e.target.value;
      renderComparison();
    });
  }

  // Theme Toggle
  const themeToggle = document.getElementById('themeToggleBtn');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      state.currentTheme = state.currentTheme === 'dark' ? 'light' : 'dark';
      document.body.setAttribute('data-theme', state.currentTheme);
      themeToggle.innerHTML = state.currentTheme === 'dark' ? '🌙 Dark' : '☀️ Light';
    });
  }

  // Modal Closers
  document.querySelectorAll('.modal-close-trigger').forEach(el => {
    el.addEventListener('click', closeModal);
  });

  const modalOverlay = document.getElementById('appModal');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', e => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
}

// Modal System
function openModal(title, contentHtml) {
  const modal = document.getElementById('appModal');
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = contentHtml;
  modal.classList.add('active');
}

function closeModal() {
  const modal = document.getElementById('appModal');
  modal.classList.remove('active');
}

function openCellDetailModal(day, startMins, endMins) {
  const slot = getSlotAvailability(state.selectedOfficers, day, startMins, endMins);
  const timeStr = `${minutesToTime(startMins)} - ${minutesToTime(endMins)}`;

  const html = `
    <div style="margin-bottom: 1.25rem;">
      <div style="font-size: 1.1rem; font-weight: 700; color: var(--cyan-accent);">${day} • ${timeStr}</div>
      <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;">
        Availability: <strong>${slot.freeCount} of ${slot.totalCount} Officers Free</strong> (${Math.round(slot.ratio * 100)}%)
      </div>
    </div>

    <div style="margin-bottom: 1.25rem;">
      <div style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: #34d399; margin-bottom: 0.5rem;">
        🟢 Available Officers (${slot.available.length})
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
        ${slot.available.map(o => `<span class="pill-badge" style="background: var(--status-free-bg); color: #34d399;">✓ ${o.fullName || o.name}</span>`).join('')}
      </div>
    </div>

    <div>
      <div style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: #f87171; margin-bottom: 0.5rem;">
        🔴 In Class (${slot.busy.length})
      </div>
      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        ${slot.busy.length === 0 ? `<div style="color: var(--text-dim); font-size: 0.85rem;">None! Everyone is free.</div>` : slot.busy.map(b => `
          <div style="background: rgba(255, 255, 255, 0.04); padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); border: 1px solid rgba(255, 255, 255, 0.05); display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 700; font-size: 0.85rem;">${b.officer.fullName || b.officer.name}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${b.conflict.name} (${b.conflict.timeDisplay})</div>
            </div>
            <div style="text-align: right;">
              <span class="pill-badge" style="font-size: 0.7rem;">${b.conflict.room}</span>
              <div style="font-size: 0.7rem; color: var(--cyan-accent); margin-top: 2px;">${b.conflict.mode}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  openModal(`Slot Availability Details`, html);
}

function viewOriginalImage(fileName, officerName) {
  const html = `
    <div style="text-align: center;">
      <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
        Official schedule enrollment slip for <strong>${officerName}</strong>
      </p>
      <div style="max-height: 70vh; overflow: auto; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
        <img src="${fileName}" alt="${officerName} Schedule" style="max-width: 100%; height: auto; display: block; margin: 0 auto;" />
      </div>
    </div>
  `;
  openModal(`${officerName}'s Schedule Slip`, html);
}

// Clipboard Action
function copySlotText(day, timeDisplay, duration, freeCount, totalCount) {
  const selected = state.selectedOfficers;
  const startMins = timeToMinutes(timeDisplay.split(' - ')[0]);
  const endMins = timeToMinutes(timeDisplay.split(' - ')[1]);
  const slot = getSlotAvailability(selected, day, startMins, endMins);

  const freeNames = slot.available.map(o => o.name).join(', ');
  const busyInfo = slot.busy.length > 0 
    ? `\n⚠️ Conflicts (${slot.busy.length}): ${slot.busy.map(b => `${b.officer.name} (${b.conflict.name})`).join(', ')}` 
    : '\n✨ Zero conflicts (100% attendance guaranteed!)';

  const text = `📅 ASCEND Officer Meeting Slot Proposal\n` +
    `Day: ${day}\n` +
    `Time: ${timeDisplay} (${duration})\n` +
    `Availability: ${freeCount}/${totalCount} Officers Free (${Math.round((freeCount / totalCount) * 100)}%)\n` +
    `Available Officers: ${freeNames}${busyInfo}\n\n` +
    `Academic Society of Computer Engineering Discipline - NU Fairview`;

  navigator.clipboard.writeText(text).then(() => {
    showToast(`Copied meeting slot for ${day} ${timeDisplay}!`);
  }).catch(() => {
    showToast('Failed to copy to clipboard');
  });
}

function showToast(message) {
  let toast = document.getElementById('toastNotice');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastNotice';
    toast.className = 'toast-msg';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span>✓</span> <span>${message}</span>`;
  toast.style.display = 'flex';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

// Export feature
function exportSchedulesJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(OFFICERS_DATA, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "ASCEND_Officer_Schedules_Term2_2026.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast("Exported JSON database successfully!");
}

// Kickoff
document.addEventListener('DOMContentLoaded', initUI);
