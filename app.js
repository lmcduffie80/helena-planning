// Helena Capacity Planning Tool
// ============================================

// Authentication & Security
const USERS = {
    'admin': {
        password: 'admin123',
        name: 'Administrator'
    }
};

// Data Storage (scoped by user)
let forecasts = [];
let itemMaster = [];
let unitCapacities = [];
let calendarData = {}; // { '2024-01-15': { '0': 100, '1': 100, ... } }
let productionPlans = [];
let manhourData = []; // Imported from CSV

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    if (isAuthenticated()) {
        showApp();
        loadAllData();
        initializeCalendar();
        updateAllTables();
    } else {
        showLoginPage();
        setupLoginListener();
    }
});

// Authentication Functions
function isAuthenticated() {
    const session = localStorage.getItem('helena_session');
    if (!session) return false;
    try {
        const sessionData = JSON.parse(session);
        const now = Date.now();
        if (now - sessionData.timestamp > 24 * 60 * 60 * 1000) {
            localStorage.removeItem('helena_session');
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

function getCurrentUser() {
    const session = localStorage.getItem('helena_session');
    if (!session) return null;
    try {
        return JSON.parse(session).username;
    } catch {
        return null;
    }
}

function login(username, password) {
    const user = USERS[username];
    if (!user || user.password !== password) {
        return { success: false, message: 'Invalid username or password' };
    }
    const sessionData = {
        username: username,
        name: user.name,
        timestamp: Date.now()
    };
    localStorage.setItem('helena_session', JSON.stringify(sessionData));
    return { success: true };
}

function logout() {
    localStorage.removeItem('helena_session');
    showLoginPage();
}

function showLoginPage() {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('appContainer').classList.remove('active');
    document.getElementById('loginForm').reset();
    document.getElementById('loginError').style.display = 'none';
}

function showApp() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('appContainer').classList.add('active');
    const username = getCurrentUser();
    if (username) {
        document.getElementById('currentUser').textContent = USERS[username]?.name || username;
    }
}

function setupLoginListener() {
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');
        
        const result = login(username, password);
        if (result.success) {
            showApp();
            loadAllData();
            initializeCalendar();
            updateAllTables();
        } else {
            errorDiv.textContent = result.message;
            errorDiv.style.display = 'block';
        }
    });
}

// Tab Navigation
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const tab = document.getElementById(tabName + 'Tab');
    if (tab) {
        tab.classList.add('active');
        
        // Initialize tab-specific data
        if (tabName === 'calendar') {
            initializeCalendar();
        } else if (tabName === 'planning') {
            updatePlanningDashboard();
        } else if (tabName === 'reports') {
            updateReports();
        }
    }
}

// Forecast Import
document.getElementById('forecastForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const file = document.getElementById('forecastFile').files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        parseForecastFile(text, file.name);
    };
    reader.readAsText(file);
});

function parseForecastFile(text, filename) {
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const newForecasts = [];
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length >= 3) {
                newForecasts.push({
                    id: Date.now() + i,
                    date: values[0] || new Date().toISOString().split('T')[0],
                    item: values[1] || 'Unknown',
                    quantity: parseFloat(values[2]) || 0,
                    unit: values[3] || 'units',
                    status: 'pending'
                });
            }
        }
    }
    
    forecasts = [...forecasts, ...newForecasts];
    saveAllData();
    updateForecastTable();
    showSuccess('forecastSuccess');
}

// Item Master Management
document.getElementById('itemMasterForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const item = {
        id: Date.now(),
        code: document.getElementById('itemCode').value,
        description: document.getElementById('itemDescription').value,
        uom: document.getElementById('itemUOM').value,
        hoursPerUnit: parseFloat(document.getElementById('itemHoursPerUnit').value)
    };
    
    itemMaster.push(item);
    saveAllData();
    updateItemMasterTable();
    document.getElementById('itemMasterForm').reset();
    showSuccess('itemSuccess');
});

function updateItemMasterTable() {
    const tbody = document.getElementById('itemMasterTableBody');
    if (!tbody) return;
    
    if (itemMaster.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--text-secondary);">No items added</td></tr>';
        return;
    }
    
    tbody.innerHTML = itemMaster.map(item => `
        <tr>
            <td>${item.code}</td>
            <td>${item.description}</td>
            <td>${item.uom}</td>
            <td>${item.hoursPerUnit}</td>
            <td>
                <button class="btn btn-secondary" onclick="deleteItem(${item.id})" style="padding: 6px 12px; font-size: 12px;">Delete</button>
            </td>
        </tr>
    `).join('');
}

function deleteItem(id) {
    if (confirm('Delete this item?')) {
        itemMaster = itemMaster.filter(item => item.id !== id);
        saveAllData();
        updateItemMasterTable();
    }
}

// Unit Capacity Management
document.getElementById('unitCapacityForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const unit = {
        id: Date.now(),
        plant: document.getElementById('unitPlant').value,
        unitNumber: document.getElementById('unitNumber').value,
        maxCapacity: parseFloat(document.getElementById('unitMaxCapacity').value),
        uom: document.getElementById('unitUOM').value
    };
    
    unitCapacities.push(unit);
    saveAllData();
    updateUnitCapacityTable();
    document.getElementById('unitCapacityForm').reset();
    showSuccess('unitSuccess');
});

function updateUnitCapacityTable() {
    const tbody = document.getElementById('unitCapacityTableBody');
    if (!tbody) return;
    
    if (unitCapacities.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--text-secondary);">No unit capacities defined</td></tr>';
        return;
    }
    
    tbody.innerHTML = unitCapacities.map(unit => `
        <tr>
            <td>${unit.plant}</td>
            <td>${unit.unitNumber}</td>
            <td>${unit.maxCapacity}</td>
            <td>${unit.uom}</td>
            <td>
                <button class="btn btn-secondary" onclick="deleteUnit(${unit.id})" style="padding: 6px 12px; font-size: 12px;">Delete</button>
            </td>
        </tr>
    `).join('');
}

function deleteUnit(id) {
    if (confirm('Delete this unit capacity?')) {
        unitCapacities = unitCapacities.filter(unit => unit.id !== id);
        saveAllData();
        updateUnitCapacityTable();
    }
}

// 24-Hour Calendar
function initializeCalendar() {
    const dateInput = document.getElementById('calendarDate');
    if (!dateInput) return;
    
    if (!dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    
    renderCalendar();
    dateInput.addEventListener('change', renderCalendar);
}

function renderCalendar() {
    const date = document.getElementById('calendarDate')?.value;
    if (!date) return;
    
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;
    
    const dateData = calendarData[date] || {};
    
    let html = '';
    for (let hour = 0; hour < 24; hour++) {
        const hourLabel = hour.toString().padStart(2, '0') + ':00';
        const capacity = dateData[hour] || 0;
        html += `
            <div class="hour-slot">
                <div class="hour-label">${hourLabel}</div>
                <input type="number" 
                       id="hour_${hour}" 
                       min="0" 
                       step="0.1" 
                       value="${capacity}" 
                       placeholder="Capacity">
            </div>
        `;
    }
    grid.innerHTML = html;
}

function saveCalendar() {
    const date = document.getElementById('calendarDate')?.value;
    if (!date) return;
    
    const dateData = {};
    for (let hour = 0; hour < 24; hour++) {
        const input = document.getElementById(`hour_${hour}`);
        if (input) {
            dateData[hour] = parseFloat(input.value) || 0;
        }
    }
    
    calendarData[date] = dateData;
    saveAllData();
    showSuccess('calendarSuccess');
}

// Planning Dashboard
function updatePlanningDashboard() {
    updatePlanningMetrics();
    updatePlanningChart();
}

function updatePlanningMetrics() {
    const container = document.getElementById('planningMetrics');
    if (!container) return;
    
    const totalForecast = forecasts.reduce((sum, f) => sum + f.quantity, 0);
    const totalCapacity = Object.values(calendarData).reduce((sum, day) => {
        return sum + Object.values(day).reduce((s, v) => s + v, 0);
    }, 0);
    const utilization = totalCapacity > 0 ? (totalForecast / totalCapacity * 100).toFixed(1) : 0;
    const itemsCount = itemMaster.length;
    
    container.innerHTML = `
        <div class="card" style="padding: 20px; text-align: center;">
            <div style="font-size: 2em; font-weight: bold; color: var(--helena-navy);">${totalForecast.toFixed(0)}</div>
            <div style="color: var(--text-secondary);">Total Forecast</div>
        </div>
        <div class="card" style="padding: 20px; text-align: center;">
            <div style="font-size: 2em; font-weight: bold; color: var(--helena-navy);">${totalCapacity.toFixed(0)}</div>
            <div style="color: var(--text-secondary);">Total Capacity</div>
        </div>
        <div class="card" style="padding: 20px; text-align: center;">
            <div style="font-size: 2em; font-weight: bold; color: var(--helena-navy);">${utilization}%</div>
            <div style="color: var(--text-secondary);">Utilization</div>
        </div>
        <div class="card" style="padding: 20px; text-align: center;">
            <div style="font-size: 2em; font-weight: bold; color: var(--helena-navy);">${itemsCount}</div>
            <div style="color: var(--text-secondary);">Items</div>
        </div>
    `;
}

function updatePlanningChart() {
    const container = document.getElementById('planningChart');
    if (!container) return;
    
    // Create utilization chart
    const dates = Object.keys(calendarData).sort();
    const forecastByDate = {};
    forecasts.forEach(f => {
        forecastByDate[f.date] = (forecastByDate[f.date] || 0) + f.quantity;
    });
    
    const capacityByDate = dates.map(date => {
        const dayData = calendarData[date];
        return Object.values(dayData).reduce((sum, v) => sum + v, 0);
    });
    
    const forecastValues = dates.map(date => forecastByDate[date] || 0);
    
    if (dates.length > 0) {
        const trace1 = {
            x: dates,
            y: capacityByDate,
            type: 'bar',
            name: 'Capacity',
            marker: { color: '#1a2332' }
        };
        
        const trace2 = {
            x: dates,
            y: forecastValues,
            type: 'bar',
            name: 'Forecast',
            marker: { color: '#ffc107' }
        };
        
        const layout = {
            title: 'Capacity vs Forecast',
            barmode: 'group',
            height: 400
        };
        
        Plotly.newPlot('planningChart', [trace1, trace2], layout, {responsive: true});
    }
}

// Update All Tables
function updateAllTables() {
    updateForecastTable();
    updateItemMasterTable();
    updateUnitCapacityTable();
}

function updateForecastTable() {
    const tbody = document.getElementById('forecastTableBody');
    if (!tbody) return;
    
    if (forecasts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--text-secondary);">No forecasts imported</td></tr>';
        return;
    }
    
    tbody.innerHTML = forecasts.map(forecast => `
        <tr>
            <td>${forecast.date}</td>
            <td>${forecast.item}</td>
            <td>${forecast.quantity}</td>
            <td>${forecast.unit}</td>
            <td>${forecast.status}</td>
        </tr>
    `).join('');
}

// Data Storage
function saveAllData() {
    const username = getCurrentUser();
    if (!username) return;
    
    localStorage.setItem(`helena_forecasts_${username}`, JSON.stringify(forecasts));
    localStorage.setItem(`helena_items_${username}`, JSON.stringify(itemMaster));
    localStorage.setItem(`helena_units_${username}`, JSON.stringify(unitCapacities));
    localStorage.setItem(`helena_calendar_${username}`, JSON.stringify(calendarData));
    localStorage.setItem(`helena_manhour_${username}`, JSON.stringify(manhourData));
}

function loadAllData() {
    const username = getCurrentUser();
    if (!username) return;
    
    const forecastsData = localStorage.getItem(`helena_forecasts_${username}`);
    const itemsData = localStorage.getItem(`helena_items_${username}`);
    const unitsData = localStorage.getItem(`helena_units_${username}`);
    const calendarDataStr = localStorage.getItem(`helena_calendar_${username}`);
    const manhourDataStr = localStorage.getItem(`helena_manhour_${username}`);
    
    if (forecastsData) forecasts = JSON.parse(forecastsData);
    if (itemsData) itemMaster = JSON.parse(itemsData);
    if (unitsData) unitCapacities = JSON.parse(unitsData);
    if (calendarDataStr) calendarData = JSON.parse(calendarDataStr);
    if (manhourDataStr) manhourData = JSON.parse(manhourDataStr);
}

function showSuccess(id) {
    const el = document.getElementById(id);
    if (el) {
        el.style.display = 'block';
        setTimeout(() => el.style.display = 'none', 3000);
    }
}

// Reports Functions
function updateReports() {
    // Initialize reports tab
}

function showManhourImport() {
    document.getElementById('manhourImportCard').style.display = 'block';
    document.getElementById('produceToPlanCard').style.display = 'none';
    document.getElementById('unitsPerManhourCard').style.display = 'none';
}

function generateProduceToPlan() {
    document.getElementById('produceToPlanCard').style.display = 'block';
    document.getElementById('manhourImportCard').style.display = 'none';
    document.getElementById('unitsPerManhourCard').style.display = 'none';
    
    // Set default dates
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 30);
    
    document.getElementById('reportStartDate').value = startDate.toISOString().split('T')[0];
    document.getElementById('reportEndDate').value = today.toISOString().split('T')[0];
}

// Manhour Import
document.getElementById('manhourImportForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const file = document.getElementById('manhourFile').files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        parseManhourFile(text);
    };
    reader.readAsText(file);
});

function parseManhourFile(text) {
    const lines = text.split('\n');
    const newData = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length >= 4) {
                newData.push({
                    id: Date.now() + i,
                    date: values[0],
                    item: values[1],
                    units: parseFloat(values[2]) || 0,
                    manhours: parseFloat(values[3]) || 0,
                    unitsPerManhour: parseFloat(values[2]) / (parseFloat(values[3]) || 1)
                });
            }
        }
    }
    
    manhourData = [...manhourData, ...newData];
    saveAllData();
    showSuccess('manhourSuccess');
    
    // Show units per manhour report
    document.getElementById('unitsPerManhourCard').style.display = 'block';
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 30);
    
    document.getElementById('manhourStartDate').value = startDate.toISOString().split('T')[0];
    document.getElementById('manhourEndDate').value = today.toISOString().split('T')[0];
}

function generateProduceToPlanReport() {
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;
    
    if (!startDate || !endDate) {
        alert('Please select start and end dates');
        return;
    }
    
    // Filter forecasts by date range
    const filteredForecasts = forecasts.filter(f => f.date >= startDate && f.date <= endDate);
    
    // Group by item and calculate totals
    const itemTotals = {};
    filteredForecasts.forEach(f => {
        if (!itemTotals[f.item]) {
            itemTotals[f.item] = {
                item: f.item,
                planned: 0,
                produced: 0,
                variance: 0
            };
        }
        itemTotals[f.item].planned += f.quantity;
    });
    
    // Calculate produced (from production plans if available)
    productionPlans.forEach(plan => {
        if (plan.date >= startDate && plan.date <= endDate) {
            if (itemTotals[plan.item]) {
                itemTotals[plan.item].produced += plan.quantity;
            }
        }
    });
    
    // Calculate variance
    Object.keys(itemTotals).forEach(item => {
        itemTotals[item].variance = itemTotals[item].produced - itemTotals[item].planned;
    });
    
    // Display report
    const container = document.getElementById('produceToPlanTable');
    if (!container) return;
    
    const items = Object.values(itemTotals);
    
    if (items.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: var(--text-secondary);">No data available for selected date range</p>';
        return;
    }
    
    let html = '<table><thead><tr><th>Item</th><th>Planned</th><th>Produced</th><th>Variance</th><th>% Complete</th></tr></thead><tbody>';
    
    items.forEach(item => {
        const percentComplete = item.planned > 0 ? ((item.produced / item.planned) * 100).toFixed(1) : 0;
        const varianceColor = item.variance >= 0 ? 'var(--success)' : 'var(--danger)';
        
        html += `
            <tr>
                <td>${item.item}</td>
                <td>${item.planned.toFixed(2)}</td>
                <td>${item.produced.toFixed(2)}</td>
                <td style="color: ${varianceColor}; font-weight: 600;">${item.variance.toFixed(2)}</td>
                <td>${percentComplete}%</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function generateUnitsPerManhourReport() {
    const startDate = document.getElementById('manhourStartDate').value;
    const endDate = document.getElementById('manhourEndDate').value;
    
    if (!startDate || !endDate) {
        alert('Please select start and end dates');
        return;
    }
    
    // Filter manhour data by date range
    const filteredData = manhourData.filter(d => d.date >= startDate && d.date <= endDate);
    
    if (filteredData.length === 0) {
        document.getElementById('unitsPerManhourTable').innerHTML = '<p style="text-align: center; padding: 40px; color: var(--text-secondary);">No data available. Please import units per manhour data first.</p>';
        return;
    }
    
    // Group by item and calculate averages
    const itemStats = {};
    filteredData.forEach(d => {
        if (!itemStats[d.item]) {
            itemStats[d.item] = {
                item: d.item,
                totalUnits: 0,
                totalManhours: 0,
                dataPoints: 0,
                dates: []
            };
        }
        itemStats[d.item].totalUnits += d.units;
        itemStats[d.item].totalManhours += d.manhours;
        itemStats[d.item].dataPoints++;
        itemStats[d.item].dates.push({
            date: d.date,
            unitsPerManhour: d.unitsPerManhour
        });
    });
    
    // Calculate averages
    Object.keys(itemStats).forEach(item => {
        const stats = itemStats[item];
        stats.avgUnitsPerManhour = stats.totalManhours > 0 ? (stats.totalUnits / stats.totalManhours) : 0;
    });
    
    // Display table
    const container = document.getElementById('unitsPerManhourTable');
    if (!container) return;
    
    const items = Object.values(itemStats);
    
    let html = '<table><thead><tr><th>Item</th><th>Total Units</th><th>Total Manhours</th><th>Avg Units/Manhour</th><th>Data Points</th></tr></thead><tbody>';
    
    items.forEach(item => {
        html += `
            <tr>
                <td>${item.item}</td>
                <td>${item.totalUnits.toFixed(2)}</td>
                <td>${item.totalManhours.toFixed(2)}</td>
                <td style="font-weight: 600; color: var(--helena-navy);">${item.avgUnitsPerManhour.toFixed(2)}</td>
                <td>${item.dataPoints}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
    
    // Create chart
    const chartContainer = document.getElementById('unitsPerManhourChart');
    if (chartContainer && items.length > 0) {
        const trace = {
            x: items.map(i => i.item),
            y: items.map(i => i.avgUnitsPerManhour),
            type: 'bar',
            marker: { color: '#1a2332' }
        };
        
        const layout = {
            title: 'Average Units per Manhour by Item',
            xaxis: { title: 'Item' },
            yaxis: { title: 'Units per Manhour' },
            height: 400
        };
        
        Plotly.newPlot('unitsPerManhourChart', [trace], layout, {responsive: true});
    }
}
