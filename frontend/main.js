// --- Heart Rate Monitor App (main.js) ---

// Chart config
const SAFE_MIN = 60;
const SAFE_MAX = 120;
const MAX_POINTS = 60; // Show last 60 seconds

let data = [];
let sessionActive = false;
let timer = 0;
let timerInterval = null;
let csvData = [];
let ws = null;

// --- Advanced D3.js: Tooltip, Zoom, Brush, Highlight ---
let brushSelection = null;
let zoomTransform = null;

// Add chart title above SVG
const chartContainer = document.getElementById('chart');
const chartTitle = document.createElement('div');
chartTitle.textContent = 'Real-Time Heart Rate';
chartTitle.style.textAlign = 'center';
chartTitle.style.fontSize = '1.25rem';
chartTitle.style.fontWeight = '600';
chartTitle.style.marginBottom = '0.3rem';
chartTitle.style.letterSpacing = '0.5px';
chartTitle.style.color = '#1976d2';
chartContainer.prepend(chartTitle);

// Add chart legend below SVG (create only once)
let chartLegend = document.getElementById('chart-legend');
if (!chartLegend) {
  chartLegend = document.createElement('div');
  chartLegend.id = 'chart-legend';
  chartLegend.style.display = 'flex';
  chartLegend.style.justifyContent = 'center';
  chartLegend.style.alignItems = 'center';
  chartLegend.style.gap = '1.5rem';
  chartLegend.style.margin = '0.5rem 0 0.5rem 0';
  chartLegend.innerHTML = `
    <span style="display:inline-flex;align-items:center;gap:0.4rem;">
      <svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" stroke="#1976d2" stroke-width="3"/></svg>
      <span style="font-size:1rem;">Current Heart Rate</span>
    </span>
    <span style="display:inline-flex;align-items:center;gap:0.4rem;">
      <svg width="18" height="12"><rect x="2" y="2" width="14" height="8" fill="#e3f6e8" stroke="#b0c7c7" stroke-width="1.2"/></svg>
      <span style="font-size:1rem;">Safe Zone</span>
    </span>
    <span style="display:inline-flex;align-items:center;gap:0.4rem;">
      <svg width="12" height="12"><circle cx="6" cy="6" r="5" fill="#d32f2f" stroke="#fff" stroke-width="1.2"/></svg>
      <span style="font-size:1rem;">Out-of-Range</span>
    </span>
  `;
  chartContainer.appendChild(chartLegend);
}

// Add chart empty state
let chartEmptyState = document.createElement('div');
chartEmptyState.id = 'chart-empty-state';
chartEmptyState.style.textAlign = 'center';
chartEmptyState.style.padding = '2.5rem 0 2rem 0';
chartEmptyState.style.color = '#b0bec5';
chartEmptyState.style.fontSize = '1.18rem';
chartEmptyState.innerHTML = `
  <div style="font-size:2.5rem;">📉</div>
  <div>No session active.<br>Click <b>Start Session</b> to begin real-time monitoring.</div>
`;
chartContainer.appendChild(chartEmptyState);

function updateEmptyState() {
  chartEmptyState.style.display = data.length ? 'none' : 'block';
}

// --- Main Update Chart Function ---
function updateChart() {
  renderMainChart();
  renderBarChart();
  updateEmptyState();
  updateStats();
}

// --- Stats Update ---
function updateStats() {
  // Use backend aggregates if available
  const aggregates = window.latestAggregates;
  const current = data.length ? data[data.length - 1].value : '--';
  const avg = aggregates ? Math.round(aggregates.avg) : (data.length ? Math.round(data.reduce((a, b) => a + b.value, 0) / data.length) : '--');
  const min = aggregates ? aggregates.min : (data.length ? Math.min(...data.map(d => d.value)) : '--');
  const max = aggregates ? aggregates.max : (data.length ? Math.max(...data.map(d => d.value)) : '--');
  document.getElementById('current-hr').textContent = current;
  document.getElementById('avg-hr').textContent = avg;
  document.getElementById('min-hr').textContent = min;
  document.getElementById('max-hr').textContent = max;
}

// --- Timer UI ---
function updateTimer() {
  const min = String(Math.floor(timer / 60)).padStart(2, '0');
  const sec = String(timer % 60).padStart(2, '0');
  document.getElementById('session-timer').textContent = `${min}:${sec}`;
}

// --- Alerts ---
function showAlert(msg) {
  const alertDiv = document.getElementById('live-alert');
  alertDiv.innerHTML = '<span class="alert-icon">⚠️</span>' + msg;
  alertDiv.style.display = 'flex';
}
function hideAlert() {
  document.getElementById('live-alert').style.display = 'none';
}

// --- WebSocket: Start Session ---
function startSession() {
  sessionActive = true;
  timer = 0;
  data = [];
  csvData = [];
  document.getElementById('start-btn').disabled = true;
  document.getElementById('stop-btn').disabled = false;
  document.getElementById('download-csv').disabled = true;
  updateTimer();
  updateStats();
  updateChart();

  ws = new WebSocket('ws://127.0.0.1:8000/ws');
  ws.onopen = () => {};
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    timer = msg.time;
    updateTimer();
    // Use FHIR-compliant value
    const value = msg.observation?.valueQuantity?.value;
    addDataPoint(value);
    // Store aggregates for stats
    window.latestAggregates = msg.aggregates;
    updateStats();
  };
  ws.onclose = () => {
    ws = null;
  };
  ws.onerror = () => {
    showAlert('WebSocket error!');
  };
}

// --- WebSocket: Stop Session ---
function stopSession() {
  sessionActive = false;
  if (ws) {
    ws.close();
    ws = null;
  }
  document.getElementById('start-btn').disabled = false;
  document.getElementById('stop-btn').disabled = true;
  document.getElementById('download-csv').disabled = false;
  hideAlert();
  updateStats();
}

// --- Add Real-Time Data Point ---
function addDataPoint(value) {
  if (data.length >= MAX_POINTS) data.shift();
  data.push({ value });
  csvData.push({ time: timer, value });
  updateChart();
  updateStats();
  if (value < SAFE_MIN || value > SAFE_MAX) {
    showAlert('⚠️ Heart rate out of safe range!');
  } else {
    hideAlert();
  }
}

// --- CSV Download ---
function downloadCSV() {
  let csv = 'time,heart_rate\n';
  csv += csvData.map(d => `${d.time},${d.value}`).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'session_heart_rate.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- Control Buttons ---
document.getElementById('start-btn').addEventListener('click', startSession);
document.getElementById('stop-btn').addEventListener('click', stopSession);
document.getElementById('download-csv').addEventListener('click', downloadCSV);

// --- Keyboard Accessibility ---
function addKeyboardAccessibility() {
  ['start-btn', 'stop-btn', 'download-csv'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && !btn.disabled) {
        btn.click();
        e.preventDefault();
      }
    });
  });
  document.getElementById('start-btn')?.focus();
}
addKeyboardAccessibility();

// --- Initial Render ---
updateChart();
updateStats();
updateTimer();

// --- Visualization Placeholders ---
// Tooltip div (shared for both charts)
let d3Tooltip = document.getElementById('d3-tooltip');
if (!d3Tooltip) {
  d3Tooltip = document.createElement('div');
  d3Tooltip.id = 'd3-tooltip';
  d3Tooltip.style.position = 'absolute';
  d3Tooltip.style.pointerEvents = 'none';
  d3Tooltip.style.background = '#fff';
  d3Tooltip.style.border = '2px solid #1976d2';
  d3Tooltip.style.borderRadius = '0.5rem';
  d3Tooltip.style.padding = '0.5rem 0.9rem';
  d3Tooltip.style.fontSize = '1rem';
  d3Tooltip.style.fontWeight = '600';
  d3Tooltip.style.color = '#1976d2';
  d3Tooltip.style.boxShadow = '0 2px 10px rgba(25, 118, 210, 0.12)';
  d3Tooltip.style.display = 'none';
  d3Tooltip.style.zIndex = 9999;
  document.body.appendChild(d3Tooltip);
}

function showTooltip(html, event) {
  d3Tooltip.innerHTML = html;
  d3Tooltip.style.display = 'block';
  d3Tooltip.style.left = (event.clientX + 12) + 'px';
  d3Tooltip.style.top = (event.clientY - 18) + 'px';
}
function hideTooltip() {
  d3Tooltip.style.display = 'none';
}

function renderMainChart() {
  const chart = document.getElementById('chart');
  chart.innerHTML = '';
  const width = chart.clientWidth || 400;
  const height = chart.clientHeight || 300;
  // Increased margins for more padding
  const margin = {top: 60, right: 40, bottom: 60, left: 80};
  const svg = d3.select(chart)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  // X and Y scales (improved)
  const x = d3.scaleLinear()
    .domain([Math.max(0, data.length - MAX_POINTS), Math.max(59, data.length - 1)])
    .range([0, plotWidth])
    .nice();

  const y = d3.scaleLinear()
    .domain([40, 160])
    .range([plotHeight, 0])
    .nice();

  // X and Y axes with grid lines (improved)
  g.append('g')
    .attr('transform', `translate(0,${plotHeight})`)
    .call(
      d3.axisBottom(x)
        .ticks(10)
        .tickFormat(d => d % 5 === 0 ? d : '')
    )
    .call(g => g.selectAll('.tick line')
      .attr('y1', -plotHeight)
      .attr('stroke', '#e0e0e0')
      .attr('stroke-dasharray', '2,2')
    )
    .call(g => g.selectAll('.domain')
      .attr('stroke', '#222')
      .attr('stroke-width', 2)
    )
    .call(g => g.selectAll('.tick text')
      .attr('font-size', '1.1rem')
      .attr('font-weight', 600)
      .attr('fill', '#222')
    );

  g.append('g')
    .call(d3.axisLeft(y).ticks(8))
    .call(g => g.selectAll('.tick line')
      .attr('x1', plotWidth)
      .attr('stroke', '#e0e0e0')
      .attr('stroke-dasharray', '2,2')
    )
    .call(g => g.selectAll('.domain')
      .attr('stroke', '#222')
      .attr('stroke-width', 2)
    )
    .call(g => g.selectAll('.tick text')
      .attr('font-size', '1.1rem')
      .attr('font-weight', 600)
      .attr('fill', '#222')
    );

  // Y axis label (closer, centered, modern font, with more padding)
  svg.append('text')
    .attr('text-anchor', 'middle')
    .attr('x', margin.left / 3)
    .attr('y', margin.top + plotHeight / 2)
    .attr('transform', `rotate(-90,${margin.left / 3},${margin.top + plotHeight / 2})`)
    .attr('font-size', '1.1rem')
    .attr('font-weight', 700)
    .attr('fill', '#222')
    .style('font-family', 'inherit')
    .text('Heart Rate (bpm)');
  // X axis label (closer, modern font, with more padding)
  svg.append('text')
    .attr('text-anchor', 'middle')
    .attr('x', margin.left + plotWidth / 2)
    .attr('y', height - margin.bottom / 4)
    .attr('font-size', '1.1rem')
    .attr('font-weight', 700)
    .attr('fill', '#222')
    .style('font-family', 'inherit')
    .text('Time (s)');

  // Title
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', margin.top - 18)
    .attr('text-anchor', 'middle')
    .attr('font-size', '1.35rem')
    .attr('font-weight', 700)
    .attr('fill', '#1976d2')
    .style('font-family', 'inherit')
    .text('Real-Time Heart Rate');

  // Add D3 zoom and brush
  const zoom = d3.zoom()
    .scaleExtent([1, 10])
    .translateExtent([[0, 0], [plotWidth, plotHeight]])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });
  svg.call(zoom);

  const brush = d3.brushX()
    .extent([[0, 0], [plotWidth, plotHeight]])
    .on('end', (event) => {
      if (!event.selection) return;
      brushSelection = event.selection;
      // You can add logic here to highlight or filter data in the selected range
    });
  g.append('g').attr('class', 'brush').call(brush);

  // Line generator
  const line = d3.line()
    .x((d, i) => x(i))
    .y(d => y(d.value));

  // Draw line
  if (data.length > 1) {
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#1976d2')
      .attr('stroke-width', 2.5)
      .attr('d', line);
  }

  // Draw points with interaction
  g.selectAll('circle')
    .data(data)
    .join('circle')
    .attr('cx', (d, i) => x(i))
    .attr('cy', d => y(d.value))
    .attr('r', 4)
    .attr('fill', d => (d.value < SAFE_MIN || d.value > SAFE_MAX) ? '#d32f2f' : '#1CA7A7')
    .style('cursor', 'pointer')
    .on('mouseover', function(event, d) {
      d3.select(this).attr('stroke', '#1976d2').attr('stroke-width', 2.5);
      showTooltip(`<b>Value:</b> ${d.value} bpm<br><b>Index:</b> ${data.indexOf(d)}`, event);
    })
    .on('mousemove', function(event) {
      d3Tooltip.style.left = (event.clientX + 12) + 'px';
      d3Tooltip.style.top = (event.clientY - 18) + 'px';
    })
    .on('mouseout', function() {
      d3.select(this).attr('stroke', null);
      hideTooltip();
    });
}

function renderBarChart() {
  const bar = document.getElementById('bar-summary');
  bar.innerHTML = '';
  const width = bar.clientWidth || 320;
  const height = bar.clientHeight || 300;
  // Increased margins for more padding
  const margin = {top: 60, right: 40, bottom: 60, left: 80};
  const svg = d3.select(bar)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  // Use last 10 data points
  const barData = data.slice(-10);
  const x = d3.scaleBand()
    .domain(barData.map((d, i) => i + 1))
    .range([0, plotWidth])
    .padding(0.2);
  const yMax = d3.max(barData, d => d.value) ? Math.ceil(d3.max(barData, d => d.value) / 10) * 10 : 100;
  const y = d3.scaleLinear()
    .domain([0, yMax])
    .range([plotHeight, 0])
    .nice();

  // X and Y axes with grid lines (improved)
  g.append('g')
    .attr('transform', `translate(0,${plotHeight})`)
    .call(d3.axisBottom(x))
    .call(g => g.selectAll('.tick line')
      .attr('y1', -plotHeight)
      .attr('stroke', '#e0e0e0')
      .attr('stroke-dasharray', '2,2')
    )
    .call(g => g.selectAll('.domain')
      .attr('stroke', '#222')
      .attr('stroke-width', 2)
    )
    .call(g => g.selectAll('.tick text')
      .attr('font-size', '1.1rem')
      .attr('font-weight', 600)
      .attr('fill', '#222')
    );

  g.append('g')
    .call(d3.axisLeft(y).ticks(6))
    .call(g => g.selectAll('.tick line')
      .attr('x1', plotWidth)
      .attr('stroke', '#e0e0e0')
      .attr('stroke-dasharray', '2,2')
    )
    .call(g => g.selectAll('.domain')
      .attr('stroke', '#222')
      .attr('stroke-width', 2)
    )
    .call(g => g.selectAll('.tick text')
      .attr('font-size', '1.1rem')
      .attr('font-weight', 600)
      .attr('fill', '#222')
    );

  // Y axis label (closer, centered, modern font, with more padding)
  svg.append('text')
    .attr('text-anchor', 'middle')
    .attr('x', margin.left / 3)
    .attr('y', margin.top + plotHeight / 2)
    .attr('transform', `rotate(-90,${margin.left / 3},${margin.top + plotHeight / 2})`)
    .attr('font-size', '1.1rem')
    .attr('font-weight', 700)
    .attr('fill', '#222')
    .style('font-family', 'inherit')
    .text('Heart Rate (bpm)');
  // X axis label (closer, modern font, with more padding)
  svg.append('text')
    .attr('text-anchor', 'middle')
    .attr('x', margin.left + plotWidth / 2)
    .attr('y', height - margin.bottom / 4)
    .attr('font-size', '1.1rem')
    .attr('font-weight', 700)
    .attr('fill', '#222')
    .style('font-family', 'inherit')
    .text('Recent Points');

  // Title (fit, modern font)
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', margin.top - 18)
    .attr('text-anchor', 'middle')
    .attr('font-size', '1.2rem')
    .attr('font-weight', 700)
    .attr('fill', '#1976d2')
    .style('font-family', 'inherit')
    .text('Recent Heart Rate (Bar Chart)');

  // Bars with interaction
  g.selectAll('.bar')
    .data(barData)
    .join('rect')
    .attr('class', 'bar')
    .attr('x', (d, i) => x(i + 1))
    .attr('y', d => y(d.value))
    .attr('width', x.bandwidth())
    .attr('height', d => plotHeight - y(d.value))
    .attr('fill', d => (d.value < SAFE_MIN || d.value > SAFE_MAX) ? '#FF6F61' : '#1CA7A7')
    .style('cursor', 'pointer')
    .on('mouseover', function(event, d, i) {
      d3.select(this).attr('stroke', '#1976d2').attr('stroke-width', 2.5);
      showTooltip(`<b>Value:</b> ${d.value} bpm<br><b>Bar:</b> ${barData.indexOf(d) + 1}`, event);
    })
    .on('mousemove', function(event) {
      d3Tooltip.style.left = (event.clientX + 12) + 'px';
      d3Tooltip.style.top = (event.clientY - 18) + 'px';
    })
    .on('mouseout', function() {
      d3.select(this).attr('stroke', null);
      hideTooltip();
    });
}

// Responsive redraw on window resize
window.addEventListener('resize', () => {
  updateChart();
});
