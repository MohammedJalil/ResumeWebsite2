/**
 * Mohammed-Taqi Jalil - Personal Website & Engineering Instrument
 * Interactive scripts for:
 * 1. BigQuery SQL Career & Personal Console
 * 2. Austin Coffee Compass (Interactive Roaster Guide & Notes)
 * 3. Tactile Mechanical Switch Tester (Web Audio Synthesizer)
 * 4. Austin Live Telemetry (Time, Weather, Status)
 * 5. Clipboard utilities
 */

(function (window, document) {
  'use strict';

  // Interactive BigQuery Datasets (Career, Technical Projects, Austin Life, Hardware)
  const SQL_DATABASE = {
    'snh_ai.engineering_impact': {
      columns: ['METRIC', 'VALUE', 'FOCUS_AREA', 'INFRASTRUCTURE'],
      rows: [
        ['Merged PRs in Prod', '100+ Merged', 'Core data transformation & ingestion stability', 'GitHub Actions / CI'],
        ['Intern to Lead', '7 Months', 'Promoted to take full ownership of core transformation service', 'Python 3.12 / FastAPI'],
        ['Automated Decisioning', 'High Concurrency', 'Reduced manual review through automated decision logic', 'BigQuery Gold Layer'],
        ['Medallion Architecture', 'Bronze -> Silver -> Gold', 'Clean data staging, validation, and analytics stores', 'Google Cloud Platform'],
        ['Testing & Reliability', 'pytest + Pydantic v2', 'Strict schema enforcement and regression prevention', 'GCP / Cloud Run']
      ]
    },
    'career.timeline': {
      columns: ['ROLE', 'ORGANIZATION', 'DATES', 'LOCATION', 'PRIMARY_STACK'],
      rows: [
        ['Data Engineer', 'SNH AI', 'Jan 2026 - Present', 'Austin, TX', 'Python, FastAPI, BigQuery, GCP'],
        ['Data Engineer Intern', 'SNH AI', 'Jun 2025 - Jan 2026', 'Austin, TX', 'Python, Data Validation, ETL'],
        ['Data Analyst Intern', 'JSoftUSA', 'Feb 2024 - Aug 2024', 'Austin, TX', 'SQL, Tableau, ETL Automation']
      ]
    },
    'austin.coffee_roasters': {
      columns: ['ROASTER', 'NEIGHBORHOOD', 'FAVORITE_ORDER', 'VIBE_NOTES'],
      rows: [
        ['Houndstooth Coffee', 'Downtown / N. Lamar', 'Double Cortado (Washed Ethiopian)', 'Clean, architectural, perfect morning focus'],
        ['Fleet Coffee', 'East Austin (Webberville)', 'Espresso Tonic or Flat White', 'Tiny walk-up shack, world-class barista craft'],
        ['Flat Track Coffee', 'East Caesar Chavez', 'Pour Over (House Colombian)', 'Motorcycle shop crossover, dark roast energy'],
        ['Greater Goods', 'East 5th / Bee Cave', 'Spark (Single Origin Espresso)', 'Roaster of the year, light roast fruit notes'],
        ['Caffé Medici', 'Guadalupe (Drag) / Clarksville', 'Traditional Cappuccino', 'UT Austin classic, French press nostalgia']
      ]
    },
    'hardware.desk_setup': {
      columns: ['DEVICE', 'SPECIFICATION', 'MODS_DETAILS', 'USAGE'],
      rows: [
        ['Keyboard', 'Custom 75% Mechanical', 'Gateron Oil King / Boba U4T Tactiles', 'Daily coding driver'],
        ['Coffee Gear', 'Hario V60 Ceramic + Timemore C2', 'Washed Ethiopian beans, 1:16 ratio', 'Morning ritual'],
        ['Headphones', 'Sennheiser HD 6XX + DAC/Amp', 'Open-back, warm neutral tuning', 'Deep work soundtrack'],
        ['Editor & Theme', 'VS Code / Neovim', 'Tokyo Night Storm + IBM Plex Mono', 'Code authoring']
      ]
    },
    'projects.machine_learning': {
      columns: ['PROJECT', 'DOMAIN', 'MODELS_TECH', 'KEY_OUTCOME'],
      rows: [
        ['Air Pollution Prediction', 'Environmental ML', 'Random Forest, XGBoost, Scikit-learn', 'Predicts PM2.5 concentrations nationwide'],
        ['IntelliVest Platform', 'FinTech Analytics', 'Streamlit, Plotly, Market APIs', 'Portfolio risk & asset optimization'],
        ['RNA-Seq Gene Expression', 'Computational Bio', 'DESeq2, Bioconductor, R, PCA', 'Differential gene expression analysis']
      ]
    },
    'education.ut_austin': {
      columns: ['DEGREE', 'INSTITUTION', 'GRAD_DATE', 'CONCENTRATION', 'RELEVANT_COURSEWORK'],
      rows: [
        ['B.S. Biology', 'The University of Texas at Austin', 'May 2024', 'Computational Biology', 'Genomics Algorithms, Biostatistics, Data Structures, Python']
      ]
    }
  };

  // Austin Coffee Compass Data
  const COFFEE_ROASTERS = {
    houndstooth: {
      name: 'Houndstooth Coffee',
      neighborhood: 'Downtown & North Lamar',
      order: 'Double Cortado (Washed Ethiopian)',
      beans: 'Pattern Coffee Roasters',
      notes: 'My quintessential engineering focus spot. Architectural, restrained interior, ultra-consistent extraction. The cortado has silky micro-foam with bright citrus and floral notes.',
      tag: 'Morning Deep Work'
    },
    fleet: {
      name: 'Fleet Coffee',
      neighborhood: 'East Austin (Webberville Rd)',
      order: 'Espresso Tonic / Classic Flat White',
      beans: 'Rotating Guest Roasters (Sweet Bloom, Ritual)',
      notes: 'An eclectic former gas-station outpost on the East Side. Best experimental coffee program in town. The espresso tonic on a humid 95°F Texas summer afternoon is unbeatable.',
      tag: 'East Side Ritual'
    },
    flattrack: {
      name: 'Flat Track Coffee',
      neighborhood: 'East Caesar Chavez',
      order: 'House Drip or Colombian Pour Over',
      beans: 'In-House Roast (Dogpatch / Sidecar)',
      notes: 'Coffee roastery meets custom vintage motorcycle garage. Grittier, high-energy community vibe. Rich chocolate, caramel, and tobacco roast profiles that fuel sprint weeks.',
      tag: 'High-Energy Fuel'
    },
    greatergoods: {
      name: 'Greater Goods Roasting',
      neighborhood: 'East 5th St',
      order: 'Single-Origin Pour Over',
      beans: 'Greater Goods (Micro-Lots)',
      notes: '2019 Roaster of the Year. Airy industrial space with lush greenery. Fantastic for long weekend reading sessions and testing complex bioinformatics or Python algorithms.',
      tag: 'Weekend Reading'
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    initYear();
    initAustinClock();
    initSqlConsole();
    initCoffeeCompass();
    initSwitchTester();
    initClipboard();
  });

  function initYear() {
    const el = document.getElementById('year');
    if (el) el.textContent = new Date().getFullYear();
  }

  function initAustinClock() {
    const clockEl = document.getElementById('austinClock');
    if (!clockEl) return;
    const update = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        timeZone: 'America/Chicago',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      clockEl.textContent = `${timeStr} CDT`;
    };
    update();
    setInterval(update, 1000);
  }

  /* --------------------------------------------------------------------------
     1. BigQuery SQL Career & Personal Console
     -------------------------------------------------------------------------- */
  function initSqlConsole() {
    const input = document.getElementById('sqlQueryInput');
    const runBtn = document.getElementById('sqlRunBtn');
    const tableContainer = document.getElementById('sqlResultsTable');
    const metaContainer = document.getElementById('sqlResultsMeta');
    const chips = document.querySelectorAll('.sql-chip');

    if (!input || !runBtn || !tableContainer) return;

    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        if (window.soundEngine) window.soundEngine.playKeyClick();
        const query = chip.dataset.query;
        input.value = query;
        chips.forEach((c) => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        runQuery(query);
      });
    });

    runBtn.addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playKeyClick();
      runQuery(input.value.trim());
    });

    input.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (window.soundEngine) window.soundEngine.playKeyClick();
        runQuery(input.value.trim());
      }
    });

    runQuery(input.value.trim(), false);

    function runQuery(query, playSound = true) {
      if (playSound && window.soundEngine) {
        window.soundEngine.playTone(640, 0.04, 'triangle', 0.08);
      }

      runBtn.disabled = true;
      runBtn.innerHTML = '<span>⏳</span> Executing...';

      const match = query.match(/from\s+([a-zA-Z0-9_\.]+)/i);
      const tableName = match ? match[1].toLowerCase() : null;

      setTimeout(() => {
        runBtn.disabled = false;
        runBtn.innerHTML = '<span>▶</span> Run Query <span class="opacity-60 text-[10px] ml-1">(⌘⏎)</span>';

        if (tableName && SQL_DATABASE[tableName]) {
          renderTable(SQL_DATABASE[tableName]);
        } else {
          renderCustomError(query);
        }
      }, 160);
    }

    function renderTable(data) {
      const startTime = (0.011 + Math.random() * 0.014).toFixed(3);
      if (metaContainer) {
        metaContainer.innerHTML = `
          <span class="sql-status-success">✓ Query complete</span>
          <span class="sql-meta-sep">·</span>
          <span>${startTime} sec elapsed</span>
          <span class="sql-meta-sep">·</span>
          <span>${data.rows.length} rows</span>
          <span class="sql-meta-sep">·</span>
          <span>0 B billed (cache hit)</span>
        `;
      }

      let html = '<table class="sql-table"><thead><tr>';
      data.columns.forEach((col) => {
        html += `<th>${escapeHtml(col)}</th>`;
      });
      html += '</tr></thead><tbody>';

      data.rows.forEach((row) => {
        html += '<tr>';
        row.forEach((cell, idx) => {
          const isPrimary = idx === 0;
          const isHighlight = cell.includes('+') || cell.includes('7 Months') || cell.includes('Cortado');
          const tdClass = isHighlight ? 'sql-td--highlight' : (isPrimary ? 'sql-td--primary' : 'sql-td--secondary');
          html += `<td class="${tdClass}">${escapeHtml(cell)}</td>`;
        });
        html += '</tr>';
      });

      html += '</tbody></table>';
      tableContainer.innerHTML = html;
    }

    function renderCustomError(query) {
      if (metaContainer) {
        metaContainer.innerHTML = `<span class="sql-status-error">Query execution error</span>`;
      }
      tableContainer.innerHTML = `
        <div class="sql-error-box">
          <strong>BigQuery Error:</strong> Table not found in dataset.
          <br><br>
          Available datasets:
          <br>• <code>snh_ai.engineering_impact</code>
          <br>• <code>austin.coffee_roasters</code>
          <br>• <code>hardware.desk_setup</code>
          <br>• <code>career.timeline</code>
          <br>• <code>projects.machine_learning</code>
        </div>
      `;
    }
  }

  /* --------------------------------------------------------------------------
     2. Austin Coffee Compass (Interactive Roaster Selector)
     -------------------------------------------------------------------------- */
  function initCoffeeCompass() {
    const buttons = document.querySelectorAll('.coffee-spot-btn');
    const nameEl = document.getElementById('coffeeSpotName');
    const neighEl = document.getElementById('coffeeSpotNeigh');
    const orderEl = document.getElementById('coffeeSpotOrder');
    const beansEl = document.getElementById('coffeeSpotBeans');
    const notesEl = document.getElementById('coffeeSpotNotes');
    const tagEl = document.getElementById('coffeeSpotTag');

    if (!buttons.length || !nameEl) return;

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (window.soundEngine) window.soundEngine.playTone(560, 0.05, 'sine');
        const key = btn.dataset.roaster;
        const data = COFFEE_ROASTERS[key];
        if (!data) return;

        buttons.forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');

        nameEl.textContent = data.name;
        neighEl.textContent = data.neighborhood;
        orderEl.textContent = data.order;
        beansEl.textContent = data.beans;
        notesEl.textContent = data.notes;
        tagEl.textContent = data.tag;
      });
    });
  }

  /* --------------------------------------------------------------------------
     3. Tactile Mechanical Switch Tester (Interactive Web Audio Synthesizer)
     -------------------------------------------------------------------------- */
  function initSwitchTester() {
    let currentSwitch = 'tactile'; // tactile | linear | clicky
    const switchPills = document.querySelectorAll('.switch-type-btn');
    const keys = document.querySelectorAll('.test-key-btn');
    const lastKeyEl = document.getElementById('switchLastKey');

    switchPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        if (window.soundEngine) window.soundEngine.playKeyClick();
        currentSwitch = pill.dataset.switch;
        switchPills.forEach((p) => p.classList.remove('is-active'));
        pill.classList.add('is-active');
      });
    });

    keys.forEach((key) => {
      key.addEventListener('click', () => {
        playSwitchSound(currentSwitch);
        key.classList.add('is-pressed');
        setTimeout(() => key.classList.remove('is-pressed'), 120);

        if (lastKeyEl) {
          lastKeyEl.textContent = `[PRESSED: ${key.dataset.key || 'KEY'}] (${currentSwitch.toUpperCase()})`;
        }
      });
    });

    function playSwitchSound(type) {
      if (!window.soundEngine || !window.soundEngine.enabled) return;
      window.soundEngine.init();
      const ctx = window.soundEngine.ctx;
      if (!ctx) return;

      try {
        if (type === 'tactile') {
          // Thocky, rounded tactile bump (Boba U4T style)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(540 + Math.random() * 80, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.035);
          gain.gain.setValueAtTime(0.18, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.045);
        } else if (type === 'linear') {
          // Deep, creamy bottom-out (Oil King style)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(320 + Math.random() * 40, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.03);
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.04);
        } else if (type === 'clicky') {
          // High crisp click (Box White / Blue style)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(1400 + Math.random() * 200, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.015);
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.025);
        }
      } catch (e) {}
    }
  }

  /* --------------------------------------------------------------------------
     4. Clipboard Utilities
     -------------------------------------------------------------------------- */
  function copyTextToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      return new Promise((resolve, reject) => {
        try {
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          successful ? resolve() : reject(new Error('Copy failed'));
        } catch (err) {
          document.body.removeChild(textArea);
          reject(err);
        }
      });
    }
  }

  function initClipboard() {
    const copyBtns = document.querySelectorAll('[data-copy]');
    copyBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const text = btn.dataset.copy;
        if (!text) return;
        if (window.soundEngine) window.soundEngine.playKeyClick();

        copyTextToClipboard(text).then(() => {
          const orig = btn.innerHTML;
          btn.innerHTML = '<span>✓</span> Copied!';
          btn.classList.add('is-copied');
          setTimeout(() => {
            btn.innerHTML = orig;
            btn.classList.remove('is-copied');
          }, 2000);
        }).catch(() => {});
      });
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>'"]/g, (tag) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

})(window, document);
