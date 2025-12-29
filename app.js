// Simple Production Planning Tool
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
    document.getElementById('unit').value = 'gallons';
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
        option.textContent = `${line.name} (${line.maxCapacity} ${line.unit})`;
        select.appendChild(option);
    });
}

function updateLinesList() {
    const container = document.getElementById('linesList');
    container.innerHTML = '';
    
    if (productionLines.length === 0) {
        container.innerHTML = '<p style="color: #666; font-size: 14px;">No lines added</p>';
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
    productionLines.forEach((line, index) => {
        line.id = index;
    });
    saveToStorage();
    updateUI();
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
    `;
}

function updateCharts() {
    const data = getCapacityData();
    
    if (data.length === 0) {
        document.getElementById('utilizationChart').innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">Add production data to see charts</p>';
        document.getElementById('comparisonChart').innerHTML = '';
        return;
    }

    createUtilizationChart(data);
    createComparisonChart(data);
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
                name: d.Line,
                line: { width: 3 }
            };
        }
        traces[d.Line].x.push(d.Date);
        traces[d.Line].y.push(d.Utilization);
    });

    const plotData = Object.values(traces);

    const layout = {
        title: {
            text: 'Capacity Utilization Over Time',
            font: { size: 20, color: '#667eea' }
        },
        xaxis: { title: 'Date' },
        yaxis: { title: 'Utilization (%)' },
        height: 400,
        hovermode: 'x unified',
        plot_bgcolor: 'white',
        paper_bgcolor: 'white',
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
                xanchor: 'right',
                bgcolor: 'rgba(255,0,0,0.1)',
                bordercolor: 'red'
            }
        ]
    };

    Plotly.newPlot('utilizationChart', plotData, layout, {responsive: true});
}

function createComparisonChart(data) {
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
                if (u < 80) return '#28a745';
                if (u < 100) return '#ffc107';
                return '#dc3545';
            })
        },
        text: utilizations.map(u => u.toFixed(1) + '%'),
        textposition: 'outside'
    };

    const layout = {
        title: {
            text: 'Current Utilization by Line',
            font: { size: 20, color: '#667eea' }
        },
        xaxis: { title: 'Production Line' },
        yaxis: { title: 'Utilization (%)' },
        height: 400,
        plot_bgcolor: 'white',
        paper_bgcolor: 'white',
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

    Plotly.newPlot('comparisonChart', [trace], layout, {responsive: true});
}

function updateDataTable() {
    const data = getCapacityData();
    const tbody = document.getElementById('dataTableBody');
    tbody.innerHTML = '';
    
    data.forEach(d => {
        const row = tbody.insertRow();
        row.insertCell(0).textContent = d.Line;
        row.insertCell(1).textContent = d.Date;
        row.insertCell(2).textContent = d.ActualProduction.toFixed(1) + ' ' + d.Unit;
        row.insertCell(3).textContent = d.MaxCapacity.toFixed(1) + ' ' + d.Unit;
        const utilCell = row.insertCell(4);
        utilCell.textContent = d.Utilization.toFixed(1) + '%';
        utilCell.style.fontWeight = '600';
        utilCell.style.color = d.Utilization >= 100 ? '#dc3545' : d.Utilization >= 80 ? '#ffc107' : '#28a745';
    });
}

function clearAllData() {
    if (confirm('Clear all production lines and data? This cannot be undone.')) {
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
