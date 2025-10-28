// ========================================
// Global State
// ========================================

let annualBudget = 0;
let targetMargin = 0.55;
let positions = [];
let positionIdCounter = 0;

const MIN_MARGIN = 0.10; // 10%
const MAX_MARGIN = 0.65; // 65%

// ========================================
// Initialize
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing...');
    setTimeout(initializeApp, 500);
});

function onDataLoaded() {
    console.log('✅ Data loaded');
    populateRoles();
}

function initializeApp() {
    populateRoles();
    setupEventListeners();
    console.log('✅ Ready!');
}

function populateRoles() {
    const roleSelect = document.getElementById('role');
    if (!roleSelect) return;
    
    while (roleSelect.options.length > 1) {
        roleSelect.remove(1);
    }
    
    if (rateCardData && rateCardData.length > 0) {
        rateCardData.forEach(role => {
            const option = document.createElement('option');
            option.value = role.role;
            option.textContent = role.role;
            roleSelect.appendChild(option);
        });
        console.log(`✅ ${rateCardData.length} roles loaded`);
    }
}

// ========================================
// Event Listeners
// ========================================

function setupEventListeners() {
    const setBudgetBtn = document.getElementById('setBudgetBtn');
    if (setBudgetBtn) {
        setBudgetBtn.addEventListener('click', handleSetBudget);
    }
    
    const changeBudgetBtn = document.getElementById('changeBudgetBtn');
    if (changeBudgetBtn) {
        changeBudgetBtn.addEventListener('click', handleChangeBudget);
    }
    
    const form = document.getElementById('positionForm');
    if (form) {
        form.addEventListener('submit', handleAddPosition);
    }
    
    const recalculateBtn = document.getElementById('recalculateBtn');
    if (recalculateBtn) {
        recalculateBtn.addEventListener('click', () => {
            calculateRatesAndMargins();
            updateDisplay();
        });
    }
    
    const clearBtn = document.getElementById('clearAllBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', handleClearAll);
    }
    
    // Preview
    const roleSelect = document.getElementById('role');
    const hoursInput = document.getElementById('hours');
    const locationRadios = document.querySelectorAll('input[name="location"]');
    
    if (roleSelect) roleSelect.addEventListener('change', updatePreview);
    if (hoursInput) hoursInput.addEventListener('input', updatePreview);
    locationRadios.forEach(r => r.addEventListener('change', updatePreview));
}

// ========================================
// Set Budget
// ========================================

function handleSetBudget() {
    const budgetInput = document.getElementById('totalBudget');
    const targetInput = document.getElementById('targetMargin');
    
    const budget = parseFloat(budgetInput.value);
    const target = parseFloat(targetInput.value) / 100;
    
    if (!budget || budget <= 0) {
        alert('❌ Please enter a valid annual budget');
        return;
    }
    
    if (!target || target < 0.10 || target > 0.65) {
        alert('❌ Target margin must be between 10% and 65%');
        return;
    }
    
    annualBudget = budget;
    targetMargin = target;
    
    console.log('💰 Annual Budget:', formatCurrency(annualBudget));
    console.log('🎯 Target Margin:', (targetMargin * 100).toFixed(0) + '%');
    
    document.getElementById('budgetEntrySection').style.display = 'none';
    document.getElementById('calculatorLayout').style.display = 'grid';
    
    document.getElementById('budgetAmount').textContent = formatCurrency(annualBudget);
    document.getElementById('budgetMonthly').textContent = formatCurrency(annualBudget / 12);
    document.getElementById('targetDisplay').textContent = (targetMargin * 100).toFixed(0) + '%';
}

// ========================================
// Change Budget
// ========================================

function handleChangeBudget() {
    if (positions.length > 0) {
        if (!confirm('⚠️ This will clear all positions. Continue?')) {
            return;
        }
        positions = [];
    }
    
    document.getElementById('budgetEntrySection').style.display = 'block';
    document.getElementById('calculatorLayout').style.display = 'none';
}

// ========================================
// Add Position
// ========================================

function handleAddPosition(e) {
    e.preventDefault();
    
    const roleSelect = document.getElementById('role');
    const hoursInput = document.getElementById('hours');
    const selectedLocation = document.querySelector('input[name="location"]:checked');
    
    if (!roleSelect.value || !hoursInput.value || !selectedLocation) {
        alert('❌ Please fill all fields');
        return;
    }
    
    const role = roleSelect.value;
    const hours = parseFloat(hoursInput.value);
    const location = selectedLocation.value;
    
    const roleData = rateCardData.find(r => r.role === role);
    if (!roleData) {
        alert('❌ Role not found');
        return;
    }
    
    const costPerHour = roleData[location].cost;
    const monthlyCost = hours * costPerHour;
    
    const position = {
        id: ++positionIdCounter,
        role,
        hours,
        location,
        costPerHour,
        monthlyCost,
        margin: 0,
        clientRate: 0,
        monthlyRevenue: 0,
        monthlyProfit: 0
    };
    
    positions.push(position);
    console.log('➕ Position added:', position);
    
    // Calculate rates and margins
    calculateRatesAndMargins();
    
    // Update display
    updateDisplay();
    
    // Reset form
    roleSelect.value = '';
    hoursInput.value = '';
    document.querySelectorAll('input[name="location"]').forEach(r => r.checked = false);
    document.getElementById('previewBox').style.display = 'none';
    
    // Show UI elements
    document.getElementById('placeholder').style.display = 'none';
    document.getElementById('positionsContainer').style.display = 'block';
    document.getElementById('recalculateBtn').style.display = 'block';
    document.getElementById('clearAllBtn').style.display = 'block';
}

// ========================================
// Calculate Rates & Margins
// THE CORRECT ALGORITHM!
// ========================================

function calculateRatesAndMargins() {
    if (positions.length === 0) return;
    
    // Step 1: Calculate total costs
    const totalMonthlyCost = positions.reduce((sum, p) => sum + p.monthlyCost, 0);
    const totalAnnualCost = totalMonthlyCost * 12;
    
    console.log('📊 Total Annual Cost:', formatCurrency(totalAnnualCost));
    console.log('💰 Annual Budget:', formatCurrency(annualBudget));
    
    // Step 2: Calculate required revenue for target margin
    // If target margin = 55%, then: Profit/Revenue = 0.55
    // Profit = Revenue - Cost
    // (Revenue - Cost) / Revenue = 0.55
    // 1 - Cost/Revenue = 0.55
    // Cost/Revenue = 0.45
    // Revenue = Cost / 0.45
    const targetMonthlyRevenue = totalMonthlyCost / (1 - targetMargin);
    const targetAnnualRevenue = targetMonthlyRevenue * 12;
    
    console.log('🎯 Target Annual Revenue:', formatCurrency(targetAnnualRevenue));
    
    // Step 3: Check if target revenue exceeds budget
    let actualMonthlyRevenue = targetMonthlyRevenue;
    
    if (targetAnnualRevenue > annualBudget) {
        console.warn('⚠️ Target revenue exceeds budget, using budget as max');
        actualMonthlyRevenue = annualBudget / 12;
    }
    
    // Step 4: Assign random margins between 10-65% to each position
    // Then scale them to achieve target average
    
    // Generate random margins for each position
    const randomMargins = positions.map(() => 
        Math.random() * (MAX_MARGIN - MIN_MARGIN) + MIN_MARGIN
    );
    
    // Calculate revenue each position would generate with these random margins
    const revenues = positions.map((pos, i) => 
        pos.monthlyCost / (1 - randomMargins[i])
    );
    
    const totalRandomRevenue = revenues.reduce((sum, r) => sum + r, 0);
    
    // Scale factor to hit our target revenue
    const scaleFactor = actualMonthlyRevenue / totalRandomRevenue;
    
    // Apply scaled revenues and calculate final margins
    positions.forEach((pos, i) => {
        pos.monthlyRevenue = revenues[i] * scaleFactor;
        pos.monthlyProfit = pos.monthlyRevenue - pos.monthlyCost;
        pos.margin = pos.monthlyRevenue > 0 ? pos.monthlyProfit / pos.monthlyRevenue : 0;
        
        // Clamp to 10-65% range
        if (pos.margin < MIN_MARGIN) {
            pos.margin = MIN_MARGIN;
            pos.monthlyRevenue = pos.monthlyCost / (1 - pos.margin);
            pos.monthlyProfit = pos.monthlyRevenue - pos.monthlyCost;
        }
        if (pos.margin > MAX_MARGIN) {
            pos.margin = MAX_MARGIN;
            pos.monthlyRevenue = pos.monthlyCost / (1 - pos.margin);
            pos.monthlyProfit = pos.monthlyRevenue - pos.monthlyCost;
        }
        
        pos.clientRate = pos.hours > 0 ? pos.monthlyRevenue / pos.hours : 0;
    });
    
    // Verify average margin
    const finalMonthlyRevenue = positions.reduce((sum, p) => sum + p.monthlyRevenue, 0);
    const finalMonthlyProfit = finalMonthlyRevenue - totalMonthlyCost;
    const finalAvgMargin = finalMonthlyRevenue > 0 ? (finalMonthlyProfit / finalMonthlyRevenue) * 100 : 0;
    
    console.log('✅ Calculations complete!');
    console.log('📊 Final Average Margin:', finalAvgMargin.toFixed(1) + '%');
    console.log('📋 Position margins:', positions.map(p => (p.margin * 100).toFixed(1) + '%').join(', '));
}

// ========================================
// Update Display
// ========================================

function updateDisplay() {
    renderTable();
    updateFinancials();
    updateWarnings();
}

function renderTable() {
    const tbody = document.getElementById('positionsTableBody');
    const badge = document.getElementById('positionBadge');
    
    badge.textContent = `${positions.length} position${positions.length !== 1 ? 's' : ''}`;
    tbody.innerHTML = '';
    
    positions.forEach(pos => {
        const row = document.createElement('tr');
        
        let marginClass = '';
        let marginIcon = '';
        const marginPercent = pos.margin * 100;
        
        if (marginPercent >= 60) {
            marginClass = 'excellent';
            marginIcon = '🎉';
        } else if (marginPercent >= 50) {
            marginClass = 'good';
            marginIcon = '✅';
        } else if (marginPercent >= 30) {
            marginClass = 'warning';
            marginIcon = '⚠️';
        } else {
            marginClass = 'danger';
            marginIcon = '❌';
        }
        
        row.innerHTML = `
            <td class="role-cell">${pos.role}</td>
            <td>${pos.hours}</td>
            <td><span class="location-badge ${pos.location}">${capitalize(pos.location)}</span></td>
            <td>${formatCurrency(pos.monthlyCost)}/mo</td>
            <td>${formatCurrency(pos.clientRate)}/hr</td>
            <td>${formatCurrency(pos.monthlyRevenue)}/mo</td>
            <td class="profit-cell">${formatCurrency(pos.monthlyProfit)}/mo</td>
            <td class="margin-cell ${marginClass}">${marginIcon} ${marginPercent.toFixed(1)}%</td>
            <td><button class="btn-delete" onclick="deletePosition(${pos.id})">🗑️</button></td>
        `;
        
        tbody.appendChild(row);
    });
}

function updateFinancials() {
    if (positions.length === 0) {
        document.getElementById('monthlyRevenue').textContent = '$0';
        document.getElementById('monthlyCost').textContent = '$0';
        document.getElementById('monthlyProfit').textContent = '$0';
        document.getElementById('annualRevenue').textContent = '$0';
        document.getElementById('annualCost').textContent = '$0';
        document.getElementById('annualProfit').textContent = '$0';
        document.getElementById('avgMargin').textContent = '0%';
        return;
    }
    
    const monthlyRev = positions.reduce((sum, p) => sum + p.monthlyRevenue, 0);
    const monthlyCost = positions.reduce((sum, p) => sum + p.monthlyCost, 0);
    const monthlyProfit = monthlyRev - monthlyCost;
    
    const annualRev = monthlyRev * 12;
    const annualCost = monthlyCost * 12;
    const annualProfit = annualRev - annualCost;
    
    const avgMargin = monthlyRev > 0 ? (monthlyProfit / monthlyRev) * 100 : 0;
    
    document.getElementById('monthlyRevenue').textContent = formatCurrency(monthlyRev);
    document.getElementById('monthlyCost').textContent = formatCurrency(monthlyCost);
    document.getElementById('monthlyProfit').textContent = formatCurrency(monthlyProfit);
    document.getElementById('annualRevenue').textContent = formatCurrency(annualRev);
    document.getElementById('annualCost').textContent = formatCurrency(annualCost);
    document.getElementById('annualProfit').textContent = formatCurrency(annualProfit);
    
    const marginElement = document.getElementById('avgMargin');
    marginElement.textContent = avgMargin.toFixed(1) + '%';
    marginElement.className = 'margin';
    
    if (avgMargin >= 60) marginElement.classList.add('excellent');
    else if (avgMargin >= targetMargin * 100) marginElement.classList.add('good');
    else if (avgMargin >= 30) marginElement.classList.add('warning');
    else marginElement.classList.add('danger');
}

function updateWarnings() {
    const container = document.getElementById('warningsContainer');
    container.innerHTML = '';
    
    if (positions.length === 0) return;
    
    const monthlyRev = positions.reduce((sum, p) => sum + p.monthlyRevenue, 0);
    const monthlyCost = positions.reduce((sum, p) => sum + p.monthlyCost, 0);
    const annualRev = monthlyRev * 12;
    const annualCost = monthlyCost * 12;
    const avgMargin = monthlyRev > 0 ? ((monthlyRev - monthlyCost) / monthlyRev) * 100 : 0;
    
    // Over budget
    if (annualRev > annualBudget) {
        const warning = document.createElement('div');
        warning.className = 'warning-box danger';
        warning.innerHTML = `
            <div class="warning-icon">❌</div>
            <div class="warning-text">
                <strong>Over Budget!</strong><br>
                <small>Revenue: ${formatCurrency(annualRev)} exceeds budget: ${formatCurrency(annualBudget)}</small>
            </div>
        `;
        container.appendChild(warning);
    }
    
    // Below target
    if (avgMargin < targetMargin * 100) {
        const warning = document.createElement('div');
        warning.className = 'warning-box warning';
        warning.innerHTML = `
            <div class="warning-icon">⚠️</div>
            <div class="warning-text">
                <strong>Below Target</strong><br>
                <small>Current: ${avgMargin.toFixed(1)}% | Target: ${(targetMargin * 100).toFixed(0)}%</small>
            </div>
        `;
        container.appendChild(warning);
    }
    
    // Budget too low
    const minBudget = annualCost / (1 - MIN_MARGIN);
    if (annualBudget < minBudget) {
        const warning = document.createElement('div');
        warning.className = 'warning-box danger';
        warning.innerHTML = `
            <div class="warning-icon">🚨</div>
            <div class="warning-text">
                <strong>Budget Too Low!</strong><br>
                <small>Need ${formatCurrency(minBudget)} for 10% margin</small>
            </div>
        `;
        container.appendChild(warning);
    }
}

// ========================================
// Preview
// ========================================

function updatePreview() {
    const roleSelect = document.getElementById('role');
    const hoursInput = document.getElementById('hours');
    const selectedLocation = document.querySelector('input[name="location"]:checked');
    const preview = document.getElementById('previewBox');
    
    if (!roleSelect.value || !hoursInput.value || !selectedLocation) {
        preview.style.display = 'none';
        return;
    }
    
    const role = roleSelect.value;
    const hours = parseFloat(hoursInput.value);
    const location = selectedLocation.value;
    
    const roleData = rateCardData.find(r => r.role === role);
    if (!roleData) return;
    
    const cost = roleData[location].cost * hours;
    document.getElementById('previewCost').textContent = formatCurrency(cost) + '/month';
    preview.style.display = 'block';
}

// ========================================
// Delete Position
// ========================================

window.deletePosition = function(id) {
    positions = positions.filter(p => p.id !== id);
    
    if (positions.length === 0) {
        document.getElementById('placeholder').style.display = 'block';
        document.getElementById('positionsContainer').style.display = 'none';
        document.getElementById('recalculateBtn').style.display = 'none';
        document.getElementById('clearAllBtn').style.display = 'none';
        updateFinancials();
        updateWarnings();
    } else {
        calculateRatesAndMargins();
        updateDisplay();
    }
};

// ========================================
// Clear All
// ========================================

function handleClearAll() {
    if (!confirm('🗑️ Clear all positions?')) return;
    
    positions = [];
    document.getElementById('placeholder').style.display = 'block';
    document.getElementById('positionsContainer').style.display = 'none';
    document.getElementById('recalculateBtn').style.display = 'none';
    document.getElementById('clearAllBtn').style.display = 'none';
    updateFinancials();
    updateWarnings();
}

// ========================================
// Utilities
// ========================================

function formatCurrency(value) {
    if (isNaN(value)) return '$0.00';
    return '$' + Math.abs(value).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

console.log('✅ Script loaded');
