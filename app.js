// Production Planning App - JavaScript
let productionLines = [];
let productionData = [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadFromStorage();
    updateUI();
    setupEventListeners();
    setDefaultDate();
});

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('productionDate').value = today;
}

function setupEventListeners() {
    document.getElementById('addLineForm').addEventListener('submit', function(e) {
        e.preventDefault();
        addProductionLine();
    });

    document.getElementById('addDataForm').addEventListener('submit', function(e) {
        e.preventDefault();
        addProductionData();
    });
}

function addProductionLine() {
    const name = document.getElementById('lineName').value;
    const maxCapacity = parseFloat(document.getElementById('maxCapacity').value);
    const unit = document.getElementById('unit').value;

    if (!name) return;

    const line = {
        id: productionLines.length,
        name: name,
        maxCapacity: maxCapacity,
        unit: unit
    };

    productionLines.push(line);
    saveToStorage();
    updateUI();
    
    document.getElementById('addLineForm').reset();
    document.getElementById('maxCapacity').value = 100;
    showSuccess('lineSuccess');
}

function addProductionData() {
    const lineId = parseInt(document.getElementById('selectedLine').value);
    const date = document.getElementById('productionDate').value;
    const actualProduction = parseFloat(document.getElementById('actualProduction').value);

    if (lineId === null || !date) return;

    const data = {
        line_id: lineId,
        date: date,
        actual_production: actualProduction,
        timestamp: new Date().toISOString()
    };

    productionData.push(data);
    saveToStorage();
    updateUI();
    
    document.getElementById('addDataForm').reset();
    setDefaultDate();
    showSuccess('dataSuccess');
}

function calculateUtilization(lineId, actualProduction) {
    const line = productionLines.find(l => l.id === lineId);
    if (line && line.maxCapacity > 0) {
        return (actualProduction / line.maxCapacity) * 100;
    }
    return 0;
}

function getCapacityData() {
    const data = [];
    productionData.forEach(prodData => {
        const line = productionLines.find(l => l.id === prodData.line_id);
        if (line) {
            const utilization = calculateUtilization(prodData.line_id, prodData.actual_production);
            data.push({
                Line: line.name,
                Date: prodData.date,
                ActualProduction: prodData.actual_production,
                MaxCapacity: line.maxCapacity,
                Utilization: utilization,
                Unit: line.unit
            });
        }
    });
    return data.sort((a, b) => new Date(a.Date) - new Date(b.Date));
}

function updateUI() {
    updateLinesDropdown();
    updateLinesList();
    
    if (productionLines.length === 0) {
        document.getElementById('emptyState').style.display = 'block';
        document.getElementById('dashboardContent').style.display = 'none';
        return;
    }

    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('dashboardContent').style.display = 'block';

    updateLinesTable();
    updateMetrics();
    updateCharts();
    updateDataTable();
}

function updateLinesDropdown() {
    const select = document.getElementById('selectedLine');
    select.innerHTML = '<option value="">Select a line...</option>';
    productionLines.forEach(line => {
        const option = document.createElement('option');
        option.value = line.id;
        option.textContent = line.name;
        select.appendChild(option);
    });
}

function updateLinesList() {
    const container = document.getElementById('linesList');
    container.innerHTML = '';
    
    if (productionLines.length === 0) {
        container.innerHTML = '<p style="color: #666; font-size: 14px;">No production lines added</p>';
        return;
    }

    productionLines.forEach(line => {
        const div = document.createElement('div');
        div.className = 'line-item';
        div.innerHTML = `
            <div>
                <strong>${line.name}</strong><br>
                <small>${line.maxCapacity} ${line.unit}</small>
            </div>
            <button onclick="removeLine(${line.id})" class="secondary">Remove</button>
        `;
        container.appendChild(div);
    });
}

function removeLine(id) {
    productionLines = productionLines.filter(l => l.id !== id);
    productionData = productionData.filter(d => d.line_id !== id);
    // Reassign IDs
    productionLines.forEach((line, index) => {
        line.id = index;
    });
    saveToStorage();
    updateUI();
}

function updateLinesTable() {
    const tbody = document.getElementById('linesTableBody');
    tbody.innerHTML = '';
    productionLines.forEach(line => {
        const row = tbody.insertRow();
        row.insertCell(0).textContent = line.name;
        row.insertCell(1).textContent = line.maxCapacity;
        row.insertCell(2).textContent = line.unit;
    });
}

function updateMetrics() {
    const data = getCapacityData();
    const container = document.getElementById('metrics');
    
    if (data.length === 0) {
        container.innerHTML = '';
        return;
    }

    const avgUtilization = data.reduce((sum, d) => sum + d.Utilization, 0) / data.length;
    const maxUtilization = Math.max(...data.map(d => d.Utilization));
    const totalLines = new Set(data.map(d => d.Line)).size;
    const totalDataPoints = data.length;

    container.innerHTML = `
        <div class="metric">
            <div class="metric-value">${avgUtilization.toFixed(1)}%</div>
            <div class="metric-label">Average Utilization</div>
        </div>
        <div class="metric">
            <div class="metric-value">${maxUtilization.toFixed(1)}%</div>
            <div class="metric-label">Peak Utilization</div>
        </div>
        <div class="metric">
            <div class="metric-value">${totalLines}</div>
            <div class="metric-label">Active Lines</div>
        </div>
        <div class="metric">
            <div class="metric-value">${totalDataPoints}</div>
            <div class="metric-label">Data Points</div>
        </div>
    `;
}

function updateCharts() {
    const data = getCapacityData();
    
    if (data.length === 0) {
        document.getElementById('utilizationChart').innerHTML = '<p>Add production data to see charts</p>';
        document.getElementById('comparisonChart').innerHTML = '';
        document.getElementById('timelineChart').innerHTML = '';
        return;
    }

    createUtilizationChart(data);
    createComparisonChart(data);
    createTimelineChart(data);
}

function createUtilizationChart(data) {
    const traces = {};
    
    data.forEach(d => {
        if (!traces[d.Line]) {
            traces[d.Line] = {
                x: [],
                y: [],
                type: 'scatter',
                mode: 'lines+markers',
                name: d.Line
            };
        }
        traces[d.Line].x.push(d.Date);
        traces[d.Line].y.push(d.Utilization);
    });

    const plotData = Object.values(traces);

    const layout = {
        title: 'Production Line Capacity Utilization Over Time',
        xaxis: { title: 'Date' },
        yaxis: { title: 'Capacity Utilization (%)' },
        height: 500,
        hovermode: 'x unified',
        shapes: [
            {
                type: 'line',
                x0: 0,
                x1: 1,
                y0: 100,
                y1: 100,
                xref: 'paper',
                yref: 'y',
                line: { color: 'red', width: 2, dash: 'dash' }
            },
            {
                type: 'line',
                x0: 0,
                x1: 1,
                y0: 80,
                y1: 80,
                xref: 'paper',
                yref: 'y',
                line: { color: 'orange', width: 2, dash: 'dot' }
            }
        ],
        annotations: [
            {
                x: 1,
                y: 100,
                xref: 'paper',
                yref: 'y',
                text: '100% Capacity',
                showarrow: false,
                xanchor: 'right'
            },
            {
                x: 1,
                y: 80,
                xref: 'paper',
                yref: 'y',
                text: '80% Warning',
                showarrow: false,
                xanchor: 'right'
            }
        ]
    };

    Plotly.newPlot('utilizationChart', plotData, layout);
}

function createComparisonChart(data) {
    // Get latest data for each line
    const latest = {};
    data.forEach(d => {
        if (!latest[d.Line] || new Date(d.Date) > new Date(latest[d.Line].Date)) {
            latest[d.Line] = d;
        }
    });

    const lines = Object.keys(latest);
    const utilizations = lines.map(l => latest[l].Utilization);

    const trace = {
        x: lines,
        y: utilizations,
        type: 'bar',
        marker: {
            color: utilizations.map(u => {
                if (u < 80) return 'green';
                if (u < 100) return 'orange';
                return 'red';
            })
        },
        text: utilizations.map(u => u.toFixed(1) + '%'),
        textposition: 'outside'
    };

    const layout = {
        title: 'Current Capacity Utilization by Production Line',
        xaxis: { title: 'Production Line' },
        yaxis: { title: 'Capacity Utilization (%)' },
        height: 400,
        shapes: [{
            type: 'line',
            x0: -0.5,
            x1: lines.length - 0.5,
            y0: 100,
            y1: 100,
            yref: 'y',
            line: { color: 'red', width: 2, dash: 'dash' }
        }]
    };

    Plotly.newPlot('comparisonChart', [trace], layout);
}

function createTimelineChart(data) {
    const traces = {};
    
    data.forEach(d => {
        if (!traces[d.Line]) {
            traces[d.Line] = {
                x: [],
                y: [],
                type: 'scatter',
                mode: 'lines',
                fill: 'tozeroy',
                name: d.Line
            };
        }
        traces[d.Line].x.push(d.Date);
        traces[d.Line].y.push(d.ActualProduction);
    });

    const plotData = Object.values(traces);

    const layout = {
        title: 'Production Output Over Time',
        xaxis: { title: 'Date' },
        yaxis: { title: `Production (${data[0]?.Unit || 'units'})` },
        height: 400,
        hovermode: 'x unified'
    };

    Plotly.newPlot('timelineChart', plotData, layout);
}

function updateDataTable() {
    const data = getCapacityData();
    const tbody = document.getElementById('dataTableBody');
    tbody.innerHTML = '';
    
    data.forEach(d => {
        const row = tbody.insertRow();
        row.insertCell(0).textContent = d.Line;
        row.insertCell(1).textContent = d.Date;
        row.insertCell(2).textContent = d.ActualProduction.toFixed(2);
        row.insertCell(3).textContent = d.MaxCapacity.toFixed(2);
        row.insertCell(4).textContent = d.Utilization.toFixed(1) + '%';
    });
}

function clearAllData() {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
        productionLines = [];
        productionData = [];
        saveToStorage();
        updateUI();
    }
}

function showSuccess(id) {
    const el = document.getElementById(id);
    el.style.display = 'block';
    setTimeout(() => {
        el.style.display = 'none';
    }, 3000);
}

// Storage functions
function saveToStorage() {
    localStorage.setItem('helena_production_lines', JSON.stringify(productionLines));
    localStorage.setItem('helena_production_data', JSON.stringify(productionData));
}

function loadFromStorage() {
    const lines = localStorage.getItem('helena_production_lines');
    const data = localStorage.getItem('helena_production_data');
    
    if (lines) {
        productionLines = JSON.parse(lines);
    }
    if (data) {
        productionData = JSON.parse(data);
    }
}

