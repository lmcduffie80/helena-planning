// Authentication & Security
// ============================================
const USERS = {
    'admin': {
        password: 'admin123',
        name: 'Administrator'
    }
};

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
        const sessionData = JSON.parse(session);
        return sessionData.username;
    } catch {
        return null;
    }
}

function login(username, password) {
    const user = USERS[username];
    if (!user) {
        return { success: false, message: 'Invalid username or password' };
    }
    
    if (user.password !== password) {
        return { success: false, message: 'Invalid username or password' };
    }
    
    const sessionData = {
        username: username,
        name: user.name,
        timestamp: Date.now()
    };
    
    localStorage.setItem('helena_session', JSON.stringify(sessionData));
    return { success: true, user: user.name };
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

// Production Planning Tool - Hours Based
// ============================================
let products = [];
let productionLines = [];
let productionSchedule = [];
let calendarHours = {}; // { '2024-01-15': 8, ... }

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    if (isAuthenticated()) {
        showApp();
        loadFromStorage();
        initializeCalendar();
        updateUI();
        setupEventListeners();
        setDefaultDate();
    } else {
        showLoginPage();
        setupLoginListener();
    }
});

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
            initializeCalendar();
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

function initializeCalendar() {
    const weekInput = document.getElementById('weekSelector');
    if (weekInput) {
        const today = new Date();
        const year = today.getFullYear();
        const week = getWeekNumber(today);
        weekInput.value = `${year}-W${week.toString().padStart(2, '0')}`;
        renderCalendar();
    }
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}

function renderCalendar() {
    const weekInput = document.getElementById('weekSelector');
    if (!weekInput || !weekInput.value) return;
    
    const [year, week] = weekInput.value.split('-W').map(Number);
    const dates = getWeekDates(year, week);
    const container = document.getElementById('calendarContainer');
    
    if (!container) return;
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    let html = '<div class="calendar-grid">';
    dates.forEach((date, index) => {
        const dateStr = date.toISOString().split('T')[0];
        const dayName = dayNames[date.getDay()];
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const hours = calendarHours[dateStr] || 8; // Default 8 hours
        
        html += `
            <div class="calendar-day ${isWeekend ? 'weekend' : ''}">
                <div class="calendar-header">${dayName}</div>
                <div style="font-size: 12px; color: #666; margin-bottom: 5px;">${dateStr.split('-')[2]}</div>
                <input type="number" 
                       id="hours_${dateStr}" 
                       min="0" 
                       max="24" 
                       step="0.5" 
                       value="${hours}" 
                       placeholder="Hours">
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

function getWeekDates(year, week) {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4) {
        ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    } else {
        ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    }
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(ISOweekStart);
        date.setDate(ISOweekStart.getDate() + i);
        dates.push(date);
    }
    return dates;
}

function saveCalendarHours() {
    const weekInput = document.getElementById('weekSelector');
    if (!weekInput || !weekInput.value) return;
    
    const [year, week] = weekInput.value.split('-W').map(Number);
    const dates = getWeekDates(year, week);
    
    dates.forEach(date => {
        const dateStr = date.toISOString().split('T')[0];
        const input = document.getElementById(`hours_${dateStr}`);
        if (input) {
            const hours = parseFloat(input.value) || 0;
            calendarHours[dateStr] = hours;
        }
    });
    
    saveToStorage();
    showSuccess('calendarSuccess');
    updateUI();
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    if (tabName === 'setup') {
        document.getElementById('setupTab').classList.add('active');
    } else if (tabName === 'calendar') {
        document.getElementById('calendarTab').classList.add('active');
        renderCalendar();
    }
}

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('productionDate');
    if (dateInput) {
        dateInput.value = today;
    }
}

function setupEventListeners() {
    const addProductForm = document.getElementById('addProductForm');
    const addProductionForm = document.getElementById('addProductionForm');
    const weekSelector = document.getElementById('weekSelector');
    
    if (addProductForm) {
        addProductForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addProduct();
        });
    }

    if (addProductionForm) {
        addProductionForm.addEventListener('submit', function(e) {
            e.preventDefault();
            scheduleProduction();
        });
    }
    
    if (weekSelector) {
        weekSelector.addEventListener('change', function() {
            renderCalendar();
        });
    }
}

function addProduct() {
    const name = document.getElementById('productName').value;
    const hoursPerUnit = parseFloat(document.getElementById('hoursPerUnit').value);
    const unitType = document.getElementById('unitType').value;

    if (!name || hoursPerUnit <= 0) return;

    const product = {
        id: products.length,
        name: name,
        hoursPerUnit: hoursPerUnit,
        unitType: unitType
    };

    products.push(product);
    saveToStorage();
    updateUI();
    
    document.getElementById('addProductForm').reset();
    document.getElementById('hoursPerUnit').value = 1.0;
    showSuccess('productSuccess');
}

function scheduleProduction() {
    const productId = parseInt(document.getElementById('selectedProduct').value);
    const lineId = parseInt(document.getElementById('selectedLine').value);
    const date = document.getElementById('productionDate').value;
    const quantity = parseFloat(document.getElementById('productionQuantity').value);

    if (productId === null || lineId === null || !date || quantity <= 0) return;

    const product = products.find(p => p.id === productId);
    if (!product) return;

    const hoursRequired = quantity * product.hoursPerUnit;
    const hoursAvailable = calendarHours[date] || 8;

    const scheduleItem = {
        id: productionSchedule.length,
        product_id: productId,
        line_id: lineId,
        date: date,
        quantity: quantity,
        hoursRequired: hoursRequired,
        hoursAvailable: hoursAvailable,
        timestamp: new Date().toISOString()
    };

    productionSchedule.push(scheduleItem);
    saveToStorage();
    updateUI();
    
    document.getElementById('addProductionForm').reset();
    setDefaultDate();
    showSuccess('productionSuccess');
}

function calculateUtilization(hoursRequired, hoursAvailable) {
    if (hoursAvailable <= 0) return 0;
    return (hoursRequired / hoursAvailable) * 100;
}

function getScheduleData() {
    const data = [];
    productionSchedule.forEach(item => {
        const product = products.find(p => p.id === item.product_id);
        const line = productionLines.find(l => l.id === item.line_id);
        
        if (product && line) {
            const utilization = calculateUtilization(item.hoursRequired, item.hoursAvailable);
            data.push({
                Date: item.date,
                Product: product.name,
                Line: line.name,
                Quantity: item.quantity,
                HoursRequired: item.hoursRequired,
                HoursAvailable: item.hoursAvailable,
                Utilization: utilization,
                Unit: product.unitType
            });
        }
    });
    return data.sort((a, b) => new Date(a.Date) - new Date(b.Date));
}

function updateUI() {
    updateProductDropdown();
    updateLineDropdown();
    updateProductsList();
    
    const emptyState = document.getElementById('emptyState');
    const dashboardContent = document.getElementById('dashboardContent');
    
    if (!emptyState || !dashboardContent) return;
    
    if (products.length === 0 || productionSchedule.length === 0) {
        emptyState.style.display = 'block';
        dashboardContent.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    dashboardContent.style.display = 'block';

    updateMetrics();
    updateCharts();
    updateScheduleTable();
}

function updateProductDropdown() {
    const select = document.getElementById('selectedProduct');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select a product...</option>';
    products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = `${product.name} (${product.hoursPerUnit} hrs/${product.unitType})`;
        select.appendChild(option);
    });
}

function updateLineDropdown() {
    const select = document.getElementById('selectedLine');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select a line...</option>';
    productionLines.forEach(line => {
        const option = document.createElement('option');
        option.value = line.id;
        option.textContent = line.name;
        select.appendChild(option);
    });
}

function updateProductsList() {
    const container = document.getElementById('productsList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (products.length === 0) {
        container.innerHTML = '<p style="color: #666; font-size: 14px;">No products added</p>';
        return;
    }

    products.forEach(product => {
        const div = document.createElement('div');
        div.className = 'product-item';
        div.innerHTML = `
            <div>
                <strong>${product.name}</strong><br>
                <small>${product.hoursPerUnit} hrs/${product.unitType}</small>
            </div>
            <button onclick="removeProduct(${product.id})" class="secondary">Remove</button>
        `;
        container.appendChild(div);
    });
}

function removeProduct(id) {
    products = products.filter(p => p.id !== id);
    productionSchedule = productionSchedule.filter(s => s.product_id !== id);
    products.forEach((product, index) => {
        product.id = index;
    });
    saveToStorage();
    updateUI();
}

// Initialize default production lines
function initializeDefaultLines() {
    if (productionLines.length === 0) {
        productionLines = [
            { id: 0, name: 'Line 1' },
            { id: 1, name: 'Line 2' },
            { id: 2, name: 'Line 3' }
        ];
        saveToStorage();
    }
}

function updateMetrics() {
    const data = getScheduleData();
    const container = document.getElementById('metrics');
    if (!container) return;
    
    if (data.length === 0) {
        container.innerHTML = '';
        return;
    }

    const totalHoursRequired = data.reduce((sum, d) => sum + d.HoursRequired, 0);
    const totalHoursAvailable = data.reduce((sum, d) => sum + d.HoursAvailable, 0);
    const avgUtilization = data.reduce((sum, d) => sum + d.Utilization, 0) / data.length;
    const maxUtilization = Math.max(...data.map(d => d.Utilization));

    container.innerHTML = `
        <div class="metric">
            <div class="metric-value">${totalHoursRequired.toFixed(1)}</div>
            <div class="metric-label">Total Hours Required</div>
        </div>
        <div class="metric">
            <div class="metric-value">${totalHoursAvailable.toFixed(1)}</div>
            <div class="metric-label">Total Hours Available</div>
        </div>
        <div class="metric">
            <div class="metric-value">${avgUtilization.toFixed(1)}%</div>
            <div class="metric-label">Avg Utilization</div>
        </div>
        <div class="metric">
            <div class="metric-value">${maxUtilization.toFixed(1)}%</div>
            <div class="metric-label">Peak Utilization</div>
        </div>
    `;
}

function updateCharts() {
    const data = getScheduleData();
    const utilizationChart = document.getElementById('utilizationChart');
    const comparisonChart = document.getElementById('comparisonChart');
    
    if (!utilizationChart || !comparisonChart) return;
    
    if (data.length === 0) {
        utilizationChart.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">Schedule production to see charts</p>';
        comparisonChart.innerHTML = '';
        return;
    }

    createUtilizationChart(data);
    createComparisonChart(data);
}

function createUtilizationChart(data) {
    const dateGroups = {};
    
    data.forEach(d => {
        if (!dateGroups[d.Date]) {
            dateGroups[d.Date] = {
                hoursRequired: 0,
                hoursAvailable: d.HoursAvailable
            };
        }
        dateGroups[d.Date].hoursRequired += d.HoursRequired;
    });

    const dates = Object.keys(dateGroups).sort();
    const utilizations = dates.map(date => {
        const group = dateGroups[date];
        return calculateUtilization(group.hoursRequired, group.hoursAvailable);
    });

    const trace = {
        x: dates,
        y: utilizations,
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Utilization',
        line: { width: 3, color: '#667eea' },
        marker: { size: 8 }
    };

    const layout = {
        title: {
            text: 'Daily Capacity Utilization Over Time',
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
        ]
    };

    Plotly.newPlot('utilizationChart', [trace], layout, {responsive: true});
}

function createComparisonChart(data) {
    const lineGroups = {};
    
    data.forEach(d => {
        if (!lineGroups[d.Line]) {
            lineGroups[d.Line] = {
                hoursRequired: 0,
                hoursAvailable: 0
            };
        }
        lineGroups[d.Line].hoursRequired += d.HoursRequired;
        lineGroups[d.Line].hoursAvailable = Math.max(lineGroups[d.Line].hoursAvailable, d.HoursAvailable);
    });

    const lines = Object.keys(lineGroups);
    const utilizations = lines.map(line => {
        const group = lineGroups[line];
        return calculateUtilization(group.hoursRequired, group.hoursAvailable);
    });

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
            text: 'Utilization by Production Line',
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

function updateScheduleTable() {
    const data = getScheduleData();
    const tbody = document.getElementById('scheduleTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    data.forEach(d => {
        const row = tbody.insertRow();
        row.insertCell(0).textContent = d.Date;
        row.insertCell(1).textContent = d.Product;
        row.insertCell(2).textContent = d.Line;
        row.insertCell(3).textContent = d.Quantity.toFixed(1) + ' ' + d.Unit;
        row.insertCell(4).textContent = d.HoursRequired.toFixed(1) + ' hrs';
        row.insertCell(5).textContent = d.HoursAvailable.toFixed(1) + ' hrs';
        const utilCell = row.insertCell(6);
        utilCell.textContent = d.Utilization.toFixed(1) + '%';
        utilCell.style.fontWeight = '600';
        utilCell.style.color = d.Utilization >= 100 ? '#dc3545' : d.Utilization >= 80 ? '#ffc107' : '#28a745';
    });
}

function clearAllData() {
    if (confirm('Clear all products, schedule, and calendar data? This cannot be undone.')) {
        products = [];
        productionSchedule = [];
        calendarHours = {};
        initializeDefaultLines();
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

// Storage functions
// Dashboard Section Management
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.dashboard-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected section
    const section = document.getElementById(sectionName + 'Section');
    if (section) {
        section.classList.add('active');
        event.target.classList.add('active');
        
        // Initialize section-specific data
        if (sectionName === 'planningStatus') {
            refreshPlanningStatus();
        } else if (sectionName === 'unscheduledDemand') {
            loadUnscheduledDemand();
        } else if (sectionName === 'itemMaster') {
            updateProductDropdowns();
        } else if (sectionName === 'scheduling') {
            updateProductDropdowns();
        }
    }
}

// Planning Status Functions
function refreshPlanningStatus() {
    // Calculate and update planning status metrics
    const cancellations = productionSchedule.filter(s => s.status === 'cancelled').length;
    const overCapacity = productionSchedule.filter(s => {
        return s.hoursRequired > s.hoursAvailable;
    }).length;
    
    document.getElementById('cancellationsPending').value = cancellations;
    document.getElementById('overCapacity').value = overCapacity;
    // Add more calculations as needed
}

function modifySchedules() {
    showSection('scheduling');
}

// Unscheduled Demand Functions
function loadUnscheduledDemand() {
    // Load unscheduled demand data
    const tbody = document.getElementById('unscheduledTableBody');
    if (!tbody) return;
    
    // This would typically load from your data source
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #999;">No unscheduled demand</td></tr>';
}

function pullInNewDemand() {
    alert('Pulling in new demand from forecasts...');
    // Implement forecast import logic
    loadUnscheduledDemand();
}

function scheduleDemand() {
    alert('Scheduling selected demand...');
    // Implement scheduling logic
}

function unscheduleDemand() {
    alert('Unscheduling selected items...');
    // Implement unscheduling logic
}

// Item Master Functions
function addActiveIngredient() {
    const tbody = document.getElementById('activeIngredientsBody');
    if (!tbody) return;
    
    const row = tbody.insertRow();
    row.innerHTML = `
        <td><input type="text" class="input-field" placeholder="Enter AI Name"></td>
        <td><button type="button" class="secondary" onclick="removeActiveIngredient(this)" style="width: auto; padding: 5px 10px;">Remove</button></td>
    `;
}

function removeActiveIngredient(button) {
    button.closest('tr').remove();
}

function addUnitCapacity() {
    const tbody = document.getElementById('unitCapacitiesBody');
    if (!tbody) return;
    
    const row = tbody.insertRow();
    row.innerHTML = `
        <td>
            <select class="input-field" style="padding: 8px;">
                <option>Ocilla</option>
                <option>Plant 2</option>
            </select>
        </td>
        <td><input type="text" class="input-field" placeholder="Unit" style="padding: 8px;"></td>
        <td><input type="number" class="input-field" placeholder="0" min="0" step="0.1" style="padding: 8px;"></td>
        <td><input type="number" class="input-field" placeholder="Batch Size" min="0" style="padding: 8px;"></td>
        <td><input type="text" class="input-field" placeholder="UOM" style="padding: 8px;"></td>
        <td><input type="number" class="input-field" min="0" step="0.1" style="padding: 8px;"></td>
        <td><button type="button" class="secondary" onclick="removeUnitCapacity(this)" style="width: auto; padding: 5px 10px;">Remove</button></td>
    `;
}

function removeUnitCapacity(button) {
    button.closest('tr').remove();
}

function clearItemForm() {
    document.getElementById('itemMasterForm').reset();
    document.getElementById('activeIngredientsBody').innerHTML = '';
    document.getElementById('unitCapacitiesBody').innerHTML = '';
}

// Bottom Icon Functions
function downloadData() {
    alert('Downloading data...');
    // Implement download functionality
}

function uploadData() {
    alert('Uploading data...');
    // Implement upload functionality
}

function showSettings() {
    alert('Settings panel coming soon...');
    // Implement settings
}

function viewChangeLog() {
    const from = document.getElementById('changeFrom').value;
    const to = document.getElementById('changeTo').value;
    if (!from || !to) {
        alert('Please enter both "Change From" and "Change To" values');
        return;
    }
    alert(`Viewing change log from "${from}" to "${to}"`);
    // Implement change log view
}

function updateProductDropdowns() {
    // Update product dropdowns in various sections
    const selects = ['scheduleProduct', 'itemProduct'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Select a product...</option>';
            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = `${product.name} (${product.hoursPerUnit} hrs/${product.unitType})`;
                select.appendChild(option);
            });
        }
    });
}

function saveToStorage() {
    const username = getCurrentUser();
    if (!username) return;
    
    initializeDefaultLines();
    
    localStorage.setItem(`helena_products_${username}`, JSON.stringify(products));
    localStorage.setItem(`helena_lines_${username}`, JSON.stringify(productionLines));
    localStorage.setItem(`helena_schedule_${username}`, JSON.stringify(productionSchedule));
    localStorage.setItem(`helena_calendar_${username}`, JSON.stringify(calendarHours));
}

function loadFromStorage() {
    const username = getCurrentUser();
    if (!username) return;
    
    const productsData = localStorage.getItem(`helena_products_${username}`);
    const linesData = localStorage.getItem(`helena_lines_${username}`);
    const scheduleData = localStorage.getItem(`helena_schedule_${username}`);
    const calendarData = localStorage.getItem(`helena_calendar_${username}`);
    
    if (productsData) {
        products = JSON.parse(productsData);
    }
    if (linesData) {
        productionLines = JSON.parse(linesData);
    }
    if (scheduleData) {
        productionSchedule = JSON.parse(scheduleData);
    }
    if (calendarData) {
        calendarHours = JSON.parse(calendarData);
    }
    
    initializeDefaultLines();
}
