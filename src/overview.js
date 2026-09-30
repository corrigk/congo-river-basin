// System Overview: the all-hazards landing view (hazards → data collection → integrate & forecast → act & feed back).
import { ASSET_INFO, STAKE } from './content.js';
import { ASSET_ICON, ICON } from './icons.js';
import { HAZARDS, hazardBy, hazardsForAsset, SENSING_ASSETS, OVERVIEW_COLUMNS } from './hazards.js';
import { pad, esc, stageBy, zoneBy, stageOutputs, exampleButton } from './views.js';

const stageMini = k => {
  const s = stageBy[k];
  return `<button class="ov-stage" data-stage="${k}"><b>${pad(s.n)}</b><span>${esc(s.title)}</span></button>`;
};
const colRange = col => `${pad(stageBy[col.stages[0]].n)}–${pad(stageBy[col.stages.at(-1)].n)}`;
const colHead = col => `<div class="ov-col-head"><span class="ov-kicker">Stages ${colRange(col)}</span><h3>${col.title}</h3></div>
  <div class="ov-stages">${col.stages.map(stageMini).join('')}</div>`;
const sourceButton = (a, cls = '') => `
  <button class="ov-source${cls}" data-source="${a}"><span class="ov-ico">${ASSET_ICON[a]}</span>
    <span><b>${esc(ASSET_INFO[a].name)}</b><small>${esc(ASSET_INFO[a].items[0])}</small></span></button>`;
const closeButton = `<button class="p-close icon-btn" data-act="close" title="Close (Esc)" aria-label="Close details">${ICON.close}</button>`;
const zoneName = z => zoneBy[z].name.split(' ·')[0];

export function overviewView() {
  const [collect, forecast, act] = OVERVIEW_COLUMNS;
  const actors = [...new Set(act.stages.flatMap(k => stageBy[k].stake))];
  const cell = (h, a) => {
    const b = h.sources[a];
    const dot = b ? `<i class="dot${b === 'proposed' ? ' is-proposed' : ''}" title="${b === 'proposed' ? 'Proposed link, verify' : 'From our content'}"></i>` : '<i class="nodot"></i>';
    return `<div class="ov-cell" role="cell" data-source="${a}">${dot}</div>`;
  };
  return `
    <div class="pv-inner ov-inner">
      <header class="pv-head">
        <div>
          <div class="pv-eyebrow">All-hazards concept of operations</div>
          <h2 class="pv-title">System Overview</h2>
        </div>
        <p class="pv-lede">One system of systems watches the whole basin. The same nine-stage loop turns observations into action for every problem it monitors. Flooding is one worked example, not the whole story.</p>
      </header>
      <p class="ov-note"><i></i>Concept-of-operations visualization, not a live monitoring system. Links drawn dashed are proposed and need verifying.</p>

      <div class="ov-flow">
        <section class="ov-col ov-col-hazards" aria-label="Problems monitored">
          <div class="ov-col-head"><span class="ov-kicker">Input</span><h3>Problems monitored</h3></div>
          <div class="ov-list">
            ${HAZARDS.map(h => `<button class="ov-hazard" data-hazard="${h.k}"><i></i><span>${esc(h.name)}</span>${h.example ? '<em>Worked example</em>' : ''}</button>`).join('')}
          </div>
        </section>
        <div class="ov-arrow" aria-hidden="true">${ICON.arrow}</div>

        <section class="ov-col" aria-label="${collect.title}">
          ${colHead(collect)}
          <div class="ov-list">${SENSING_ASSETS.map(a => sourceButton(a)).join('')}</div>
        </section>
        <div class="ov-arrow" aria-hidden="true">${ICON.arrow}</div>

        <section class="ov-col" aria-label="${forecast.title}">
          ${colHead(forecast)}
          <div class="ov-hub"><span class="hb-hex"></span><span><b>Basin Data Hub</b><small>Concept node: every feed is merged, validated and modelled in one place.</small></span></div>
          <div class="ov-sub">What “forecast” means per hazard</div>
          <ul class="ov-forecasts">
            ${HAZARDS.map(h => `<li data-hazard="${h.k}"><b>${esc(h.short)}</b><span class="${h.forecastTodo ? 'is-todo' : ''}">${esc(h.forecast)}</span></li>`).join('')}
          </ul>
        </section>
        <div class="ov-arrow" aria-hidden="true">${ICON.arrow}</div>

        <section class="ov-col" aria-label="${act.title}">
          ${colHead(act)}
          <div class="ov-sub">Who acts</div>
          <div class="p-stake">${actors.map(x => `<span class="stake">${esc(STAKE[x].name)}</span>`).join('')}</div>
          ${sourceButton('government', ' ov-gov')}
          <div class="ov-loopnote">${ICON.loop}<span>Feedback updates the observation and forecasting models for every hazard.</span></div>
        </section>
      </div>

      <div class="pv-detail ov-detail" id="ov-detail"></div>

      <div class="pv-section">Hazards × data sources <small>select a hazard or a source · solid = in our content · dashed = proposed, verify</small></div>
      <div class="ov-matrix" role="table" aria-label="Which data sources feed which hazards">
        <div class="ov-row ov-row-head" role="row">
          <span role="columnheader">Hazard</span>
          ${SENSING_ASSETS.map(a => `<button class="ov-colhead" data-source="${a}" role="columnheader"><span class="ov-ico">${ASSET_ICON[a]}</span><span>${esc(ASSET_INFO[a].name)}</span></button>`).join('')}
          <span role="columnheader">Zones</span>
        </div>
        ${HAZARDS.map(h => `
        <div class="ov-row" role="row" data-hazard-row="${h.k}">
          <button class="ov-rowhead" data-hazard="${h.k}" role="rowheader">${esc(h.short)}</button>
          ${SENSING_ASSETS.map(a => cell(h, a)).join('')}
          <span class="ov-zones" role="cell">${Object.entries(h.zones).map(([z, b]) => `<button class="stake stake-zone${b === 'proposed' ? ' is-proposed' : ''}" data-zone="${z}"><i></i>${esc(zoneName(z))}</button>`).join('') || '<span class="stake is-todo">Basin-wide · verify</span>'}</span>
        </div>`).join('')}
      </div>
    </div>`;
}

// Detail band inside the overview for the current selection (hazard, data source or stage).
export function overviewDetail(sel) {
  if (sel?.type === 'hazard') {
    const h = hazardBy[sel.k];
    const zones = Object.keys(h.zones);
    return `
      <div class="pvd ovd">
        <div class="pvd-head"><div><div class="p-eyebrow"><span>Hazard</span></div><h3 class="pvd-title">${esc(h.name)}</h3></div></div>
        <div><p class="p-text">${esc(h.text)}</p><p class="p-foot">Basis: ${esc(h.basis)}.</p></div>
        <div class="p-block req"><div class="p-block-top"><span class="lbl">Forecast output</span></div><p class="${h.forecastTodo ? 'is-todo' : ''}">${esc(h.forecast)}</p></div>
        <div class="pvd-side">
          <h4 class="p-h">Where it plays out</h4>
          <div class="p-stake">${zones.map(z => `<button class="stake stake-zone" data-zone="${z}"><i></i>${esc(zoneBy[z].name)}</button>`).join('') || '<span class="stake is-todo">Basin-wide · TODO: verify</span>'}</div>
          ${h.example ? exampleButton() : ''}
        </div>
        ${closeButton}
      </div>`;
  }
  if (sel?.type === 'asset') {
    const info = ASSET_INFO[sel.k];
    const hz = hazardsForAsset(sel.k);
    return `
      <div class="pvd ovd">
        <div class="pvd-head"><span class="ov-ico ov-ico-lg">${ASSET_ICON[sel.k]}</span><div><div class="p-eyebrow"><span>Asset class</span></div><h3 class="pvd-title">${esc(info.name)}</h3></div></div>
        <ul class="p-list">${info.items.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
        <div class="pvd-side ovd-wide">
          <h4 class="p-h">Hazards it serves</h4>
          <div class="p-stake">${hz.map(h => `<button class="stake" data-hazard="${h.k}">${esc(h.short)}</button>`).join('') || '<span class="stake">Acts on alerts for every hazard</span>'}</div>
        </div>
        ${closeButton}
      </div>`;
  }
  if (sel?.type === 'stage') {
    const s = stageBy[sel.k];
    return `
      <div class="pvd ovd">
        <div class="pvd-head"><span class="pvd-num">${pad(s.n)}</span><div><div class="p-eyebrow"><span>${s.ooda} phase</span></div><h3 class="pvd-title">${esc(s.title)}</h3></div></div>
        <div class="p-block req"><div class="p-block-top"><span class="tag">${esc(s.req)}</span><span class="lbl">Requirement</span></div><p>${esc(s.reqText)}</p></div>
        <div class="p-block gap"><div class="p-block-top"><span class="lbl">${esc(s.gapLabel)}</span></div><p>${esc(s.gapText)}</p></div>
        <div class="pvd-side"><p class="p-text p-allhaz">${ICON.loop}<span>Runs for every hazard.</span></p>${stageOutputs(sel.k)}</div>
        ${closeButton}
      </div>`;
  }
  return '';
}
