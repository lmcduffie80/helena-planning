// Authentication & Security
// ============================================
// USER CREDENTIALS - CHANGE THESE AFTER FIRST LOGIN
// ============================================
const USERS = {
    'admin': {
        password: 'admin123', // Change this password!
        name: 'Administrator'
    }
    // Add more users like this:
    // 'username': {
    //     password: 'password',
    //     name: 'Display Name'
    // }
};

// Simple password hashing function (for basic security)
function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
}

// Check if user is authenticated
function isAuthenticated() {
    const session = localStorage.getItem('helena_session');
    if (!session) return false;
    
    try {
        const sessionData = JSON.parse(session);
        const now = Date.now();
        // Session expires after 24 hours
        if (now - sessionData.timestamp > 24 * 60 * 60 * 1000) {
            localStorage.removeItem('helena_session');
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

// Get current user
function getCurrentUser() {
    const session = localStorage.getItem('helena_session');
    if (!session) return null;
    
    try {
        const sessionData = JSON.parse(session);
        return sessionData.username;
    } catch {
        return null;
    }
}

// Login function
function login(username, password) {
    const user = USERS[username];
    if (!user) {
        return { success: false, message: 'Invalid username or password' };
    }
    
    // Simple password check (in production, use proper hashing)
    if (user.password !== password) {
        return { success: false, message: 'Invalid username or password' };
    }
    
    // Create session
    const sessionData = {
        username: username,
        name: user.name,
        timestamp: Date.now()
    };
    
    localStorage.setItem('helena_session', JSON.stringify(sessionData));
    return { success: true, user: user.name };
}

// Logout function
function logout() {
    localStorage.removeItem('helena_session');
    showLoginPage();
}

// Show login page
function showLoginPage() {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('appContainer').classList.remove('active');
    document.getElementById('loginForm').reset();
    document.getElementById('loginError').style.display = 'none';
}

// Show app
function showApp() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('appContainer').classList.add('active');
    const username = getCurrentUser();
    if (username) {
        document.getElementById('currentUser').textContent = USERS[username]?.name || username;
    }
}

// Production Planning Tool
// ============================================
let productionLines = [];
let productionData = [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication first
    if (isAuthenticated()) {
        showApp();
        loadFromStorage();
        updateUI();
        setupEventListeners();
        setDefaultDate();
    } else {
        showLoginPage();
        setupLoginListener();
    }
});

// Setup login form listener
function setupLoginListener() {
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');
        
        const result = login(username, password);
        if (result.success) {
            showApp();
            loadFromStorage();
            updateUI();
            setupEventListeners();
            setDefaultDate();
        } else {
            errorDiv.textContent = result.message;
            errorDiv.style.display = 'block';
            document.getElementById('password').value = '';
        }
    });
}

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('productionDate');
    if (dateInput) {
        dateInput.value = today;
    }
}

function setupEventListeners() {
    const addLineForm = document.getElementById('addLineForm');
    const addDataForm = document.getElementById('addDataForm');
    
    if (addLineForm) {
        addLineForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addProductionLine();
        });
    }

    if (addDataForm) {
        addDataForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addProductionData();
        });
    }
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
    
    const emptyState = document.getElementById('emptyState');
    const dashboardContent = document.getElementById('dashboardContent');
    
    if (!emptyState || !dashboardContent) return;
    
    if (productionLines.length === 0) {
        emptyState.style.display = 'block';
        dashboardContent.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    dashboardContent.style.display = 'block';

    updateMetrics();
    updateCharts();
    updateDataTable();
}

function updateLinesDropdown() {
    const select = document.getElementById('selectedLine');
    if (!select) return;
    
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
    if (!container) return;
    
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
    if (!container) return;
    
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
    const utilizationChart = document.getElementById('utilizationChart');
    const comparisonChart = document.getElementById('comparisonChart');
    
    if (!utilizationChart || !comparisonChart) return;
    
    if (data.length === 0) {
        utilizationChart.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">Add production data to see charts</p>';
        comparisonChart.innerHTML = '';
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
    if (!tbody) return;
    
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
    if (el) {
        el.style.display = 'block';
        setTimeout(() => {
            el.style.display = 'none';
        }, 3000);
    }
}

// Storage functions (scoped to authenticated user)
function saveToStorage() {
    const username = getCurrentUser();
    if (!username) return;
    
    localStorage.setItem(`helena_production_lines_${username}`, JSON.stringify(productionLines));
    localStorage.setItem(`helena_production_data_${username}`, JSON.stringify(productionData));
}

function loadFromStorage() {
    const username = getCurrentUser();
    if (!username) return;
    
    const lines = localStorage.getItem(`helena_production_lines_${username}`);
    const data = localStorage.getItem(`helena_production_data_${username}`);
    
    if (lines) {
        productionLines = JSON.parse(lines);
    }
    if (data) {
        productionData = JSON.parse(data);
    }
}
