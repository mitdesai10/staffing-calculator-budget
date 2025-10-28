// ========================================
// Global State
// ========================================

let annualBudget = 0;
let targetMargin = 0.55;
let maxPositions = 0;
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
    const positionCountInput = document.getElementById('positionCount');
    
    const budget = parseFloat(budgetInput.value);
    const target = parseFloat(targetInput.value) / 100;
    const count = parseInt(positionCountInput.value);
    
    if (!budget || budget <= 0) {
        alert('❌ Please enter a valid annual budget');
        return;
    }
    
    if (!count || count < 1 || count > 50) {
        alert('❌ Please enter number of positions (1-50)');
        return;
    }
    
    if (!target || target < 0.10 || target > 0.65) {
        alert('❌ Target margin must be between 10% and 65%');
        return;
    }
    
    annualBudget = budget;
    targetMargin = target;
    maxPositions = count;
    
    console.log('💰 Annual Budget:', formatCurrency(annualBudget));
    console.log('🎯 Target Margin:', (targetMargin * 100).toFixed(0) + '% (minimum)');
    console.log('📊 Max Positions:', maxPositions);
    
    document.getElementById('budgetEntrySection').style.display = 'none';
    document.getElementById('calculatorLayout').style.display = 'grid';
    
    document.getElementById('budgetAmount').textContent = formatCurrency(annualBudget);
    document.getElementById('budgetMonthly').textContent = formatCurrency(annualBudget / 12);
    document.getElementById('positionCounter').textContent = `0 / ${maxPositions}`;
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
    
    // Check if reached max positions
    if (positions.length >= maxPositions) {
        alert(`✅ You've reached the maximum of ${maxPositions} positions!\n\nAll positions added. Check your results below.`);
        return;
    }
    
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
    console.log(`➕ Position ${positions.length}/${maxPositions} added:`, position);
    
    // Calculate rates and margins
    calculateRatesAndMargins();
    
    // Update display
    updateDisplay();
    
    // Update position counter
    document.getElementById('positionCounter').textContent = `${positions.length} / ${maxPositions}`;
    
    // Check if reached limit
    if (positions.length >= maxPositions) {
        alert(`🎉 All ${maxPositions} positions added!\n\nYour staffing plan is complete. Check the results below.`);
        // Disable form
        document.getElementById('role').disabled = true;
        document.getElementById('hours').disabled = true;
        document.querySelectorAll('input[name="location"]').forEach(r => r.disabled = true);
        document.querySelector('#positionForm button[type="submit"]').disabled = true;
        document.querySelector('#positionForm button[type="submit"]').textContent = '✅ All Positions Added';
    }
    
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
// MAXIMIZE MARGIN IF BUDGET ALLOWS!
// ========================================

function calculateRatesAndMargins() {
    if (positions.length === 0) return;
    
    // Step 1: Calculate total costs
    const totalMonthlyCost = positions.reduce((sum, p) => sum + p.monthlyCost, 0);
    const totalAnnualCost = totalMonthlyCost * 12;
    
    console.log('📊 Total Annual Cost:', formatCurrency(totalAnnualCost));
    console.log('💰 Annual Budget:', formatCurrency(annualBudget));
    
    // Step 2: Calculate what margin we can achieve with available budget
    // If Budget allows more than target margin, USE IT ALL!
    
    // Maximum possible revenue = Annual Budget / 12 (monthly)
    const maxMonthlyRevenue = annualBudget / 12;
    
    // Calculate what margin this gives us
    const maxPossibleMargin = maxMonthlyRevenue > 0 ? 
        (maxMonthlyRevenue - totalMonthlyCost) / maxMonthlyRevenue : 0;
    
    console.log('💪 Max Possible Margin:', (maxPossibleMargin * 100).toFixed(1) + '%');
    console.log('🎯 Target Margin:', (targetMargin * 100).toFixed(0) + '% (minimum)');
    
    let actualMonthlyRevenue;
    
    if (maxPossibleMargin >= targetMargin) {
        // Budget allows MORE than target! Use full budget to maximize margin!
        console.log('🎉 Budget allows HIGHER margin! Using full budget!');
        actualMonthlyRevenue = maxMonthlyRevenue;
    } else {
        // Budget is tight, use target margin as goal
        console.log('⚠️ Budget is tight, aiming for target margin');
        actualMonthlyRevenue = totalMonthlyCost / (1 - targetMargin);
        
        // But don't exceed budget
        if (actualMonthlyRevenue > maxMonthlyRevenue) {
            console.warn('❌ Target not achievable, using max budget');
            actualMonthlyRevenue = maxMonthlyRevenue;
        }
    }
    
    // Step 3: Assign random margins between 10-65% to each position
    const randomMargins = positions.map(() => 
        Math.random() * (MAX_MARGIN - MIN_MARGIN) + MIN_MARGIN
    );
    
    // Calculate revenue each position would generate with these random margins
    const revenues = positions.map((pos, i) => 
        pos.monthlyCost / (1 - randomMargins[i])
    );
    
    const totalRandomRevenue = revenues.reduce((sum, r) => sum + r, 0);
    
    // Scale factor to use actual revenue (which could be MORE than target!)
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
    
    // Verify final margin
    const finalMonthlyRevenue = positions.reduce((sum, p) => sum + p.monthlyRevenue, 0);
    const finalMonthlyProfit = finalMonthlyRevenue - totalMonthlyCost;
    const finalAvgMargin = finalMonthlyRevenue > 0 ? (finalMonthlyProfit / finalMonthlyRevenue) * 100 : 0;
    
    console.log('✅ Calculations complete!');
    console.log('📊 Final Average Margin:', finalAvgMargin.toFixed(1) + '%');
    
    if (finalAvgMargin > targetMargin * 100) {
        console.log('🎉 ACHIEVED HIGHER MARGIN THAN TARGET!');
    }
    
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
    
    // Update counter
    document.getElementById('positionCounter').textContent = `${positions.length} / ${maxPositions}`;
    
    // Re-enable form if was disabled
    if (positions.length < maxPositions) {
        document.getElementById('role').disabled = false;
        document.getElementById('hours').disabled = false;
        document.querySelectorAll('input[name="location"]').forEach(r => r.disabled = false);
        const submitBtn = document.querySelector('#positionForm button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add Position';
    }
    
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
    document.getElementById('positionCounter').textContent = `0 / ${maxPositions}`;
    
    // Re-enable form
    document.getElementById('role').disabled = false;
    document.getElementById('hours').disabled = false;
    document.querySelectorAll('input[name="location"]').forEach(r => r.disabled = false);
    const submitBtn = document.querySelector('#positionForm button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Add Position';
    
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
