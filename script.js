// ========================================
// Global State
// ========================================

let totalBudget = 0;
let targetMargin = 0.55; // 55% default
let positions = [];
let positionIdCounter = 0;

// ========================================
// Initialize Application
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Budget Calculator initializing...');
    setTimeout(initializeApp, 500);
});

function onDataLoaded() {
    console.log('✅ Data loaded');
    populateRoles();
}

function initializeApp() {
    populateRoles();
    setupEventListeners();
    console.log('✅ App ready!');
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
    // Budget entry
    const setBudgetBtn = document.getElementById('setBudgetBtn');
    if (setBudgetBtn) {
        setBudgetBtn.addEventListener('click', handleSetBudget);
    }
    
    // Change budget
    const changeBudgetBtn = document.getElementById('changeBudgetBtn');
    if (changeBudgetBtn) {
        changeBudgetBtn.addEventListener('click', handleChangeBudget);
    }
    
    // Position form
    const form = document.getElementById('positionForm');
    if (form) {
        form.addEventListener('submit', handleAddPosition);
    }
    
    // Clear all
    const clearBtn = document.getElementById('clearAllBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', handleClearAll);
    }
    
    // Live preview
    const roleSelect = document.getElementById('role');
    const hoursInput = document.getElementById('hours');
    const locationRadios = document.querySelectorAll('input[name="location"]');
    
    if (roleSelect) roleSelect.addEventListener('change', updatePositionPreview);
    if (hoursInput) hoursInput.addEventListener('input', updatePositionPreview);
    locationRadios.forEach(r => r.addEventListener('change', updatePositionPreview));
}

// ========================================
// Set Budget
// ========================================

function handleSetBudget() {
    const budgetInput = document.getElementById('totalBudget');
    const targetMarginInput = document.getElementById('targetMargin');
    
    const budget = parseFloat(budgetInput.value);
    const margin = parseFloat(targetMarginInput.value) / 100;
    
    if (!budget || budget <= 0) {
        alert('❌ Please enter a valid budget');
        return;
    }
    
    if (!margin || margin < 0 || margin >= 1) {
        alert('❌ Please enter a valid target margin (0-99%)');
        return;
    }
    
    totalBudget = budget;
    targetMargin = margin;
    
    console.log('💰 Budget set:', formatCurrency(totalBudget));
    console.log('🎯 Target margin:', (targetMargin * 100).toFixed(1) + '%');
    
    // Hide budget entry, show calculator
    document.getElementById('budgetEntrySection').style.display = 'none';
    document.getElementById('calculatorLayout').style.display = 'grid';
    
    // Update displays
    document.getElementById('budgetTotal').textContent = formatCurrency(totalBudget);
    document.getElementById('targetMarginDisplay').textContent = (targetMargin * 100).toFixed(0) + '%';
    
    updateBudgetTracker();
}

// ========================================
// Change Budget
// ========================================

function handleChangeBudget() {
    if (positions.length > 0) {
        if (!confirm('⚠️ Changing budget will clear all positions. Continue?')) {
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
    console.log('➕ Adding position...');
    
    try {
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
            alert('❌ Role data not found');
            return;
        }
        
        const costPerHour = roleData[location].cost;
        const totalCost = hours * costPerHour;
        
        // Calculate budget allocation for this position
        const currentTotalCost = positions.reduce((sum, p) => sum + p.totalCost, 0);
        const newTotalCost = currentTotalCost + totalCost;
        
        // Check if we have enough budget
        const minRequiredBudget = newTotalCost / (1 - 0.05); // 5% minimum margin
        if (totalBudget < minRequiredBudget) {
            alert(`❌ Budget too low!\n\nYour costs: ${formatCurrency(newTotalCost)}\nMinimum budget needed (5% margin): ${formatCurrency(minRequiredBudget)}\nYour budget: ${formatCurrency(totalBudget)}\n\nPlease increase budget or remove positions.`);
            return;
        }
        
        // Distribute budget across all positions (including new one)
        const allPositions = [...positions, { totalCost }];
        const distribution = distributeBudget(allPositions, totalBudget);
        
        // Create new position with allocated budget
        const allocation = distribution[distribution.length - 1];
        const clientRate = allocation / hours;
        const revenue = allocation;
        const profit = revenue - totalCost;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
        
        const position = {
            id: ++positionIdCounter,
            role,
            hours,
            location,
            costPerHour,
            totalCost,
            clientRate,
            revenue,
            profit,
            margin
        };
        
        positions.push(position);
        
        // Recalculate ALL positions with new distribution
        recalculateAllPositions();
        
        console.log('✅ Position added:', position);
        
        renderPositions();
        updateBudgetTracker();
        
        // Reset form
        roleSelect.value = '';
        hoursInput.value = '';
        document.querySelectorAll('input[name="location"]').forEach(r => r.checked = false);
        document.getElementById('positionPreview').style.display = 'none';
        
        // Show results
        document.getElementById('resultsPlaceholder').style.display = 'none';
        document.getElementById('positionsSection').style.display = 'block';
        document.getElementById('clearAllBtn').style.display = 'block';
        
    } catch (error) {
        console.error('❌ Error:', error);
        alert('❌ Error adding position');
    }
}

// ========================================
// Distribute Budget
// ========================================

function distributeBudget(positions, budget) {
    // Distribute budget randomly across positions
    // Each position gets a random allocation, then normalized to match budget
    
    const randomWeights = positions.map(() => Math.random());
    const totalWeight = randomWeights.reduce((sum, w) => sum + w, 0);
    
    // Normalize to match budget
    const allocations = randomWeights.map(weight => (weight / totalWeight) * budget);
    
    return allocations;
}

// ========================================
// Recalculate All Positions
// ========================================

function recalculateAllPositions() {
    if (positions.length === 0) return;
    
    const distribution = distributeBudget(positions, totalBudget);
    
    positions.forEach((pos, index) => {
        const allocation = distribution[index];
        pos.revenue = allocation;
        pos.clientRate = allocation / pos.hours;
        pos.profit = pos.revenue - pos.totalCost;
        pos.margin = pos.revenue > 0 ? (pos.profit / pos.revenue) * 100 : 0;
    });
}

// ========================================
// Position Preview
// ========================================

function updatePositionPreview() {
    const roleSelect = document.getElementById('role');
    const hoursInput = document.getElementById('hours');
    const selectedLocation = document.querySelector('input[name="location"]:checked');
    const preview = document.getElementById('positionPreview');
    
    if (!roleSelect.value || !hoursInput.value || !selectedLocation) {
        preview.style.display = 'none';
        return;
    }
    
    const role = roleSelect.value;
    const hours = parseFloat(hoursInput.value);
    const location = selectedLocation.value;
    
    const roleData = rateCardData.find(r => r.role === role);
    if (!roleData) return;
    
    const costPerHour = roleData[location].cost;
    const totalCost = hours * costPerHour;
    
    // Estimate allocation (rough average)
    const currentAllocated = positions.reduce((sum, p) => sum + p.revenue, 0);
    const remaining = totalBudget - currentAllocated;
    const estimatedAllocation = Math.min(remaining, totalBudget / (positions.length + 1));
    const estimatedRate = estimatedAllocation / hours;
    const estimatedProfit = estimatedAllocation - totalCost;
    const estimatedMargin = estimatedAllocation > 0 ? (estimatedProfit / estimatedAllocation) * 100 : 0;
    
    document.getElementById('previewCost').textContent = formatCurrency(totalCost);
    document.getElementById('previewRate').textContent = formatCurrency(estimatedRate) + '/hr';
    document.getElementById('previewRevenue').textContent = formatCurrency(estimatedAllocation);
    
    const marginElement = document.getElementById('previewMargin');
    marginElement.textContent = estimatedMargin.toFixed(1) + '%';
    marginElement.className = 'preview-margin-value';
    if (estimatedMargin >= 70) marginElement.classList.add('excellent');
    else if (estimatedMargin >= 55) marginElement.classList.add('good');
    else if (estimatedMargin >= 40) marginElement.classList.add('warning');
    else marginElement.classList.add('danger');
    
    preview.style.display = 'block';
}

// ========================================
// Render Positions
// ========================================

function renderPositions() {
    const tbody = document.getElementById('positionsTableBody');
    const count = document.getElementById('positionCount');
    
    count.textContent = `${positions.length} position${positions.length !== 1 ? 's' : ''}`;
    tbody.innerHTML = '';
    
    positions.forEach(pos => {
        const row = document.createElement('tr');
        
        let marginClass = '';
        let marginIcon = '';
        if (pos.margin >= 70) {
            marginClass = 'excellent';
            marginIcon = '🎉';
        } else if (pos.margin >= 55) {
            marginClass = 'good';
            marginIcon = '✅';
        } else if (pos.margin >= 40) {
            marginClass = 'warning';
            marginIcon = '⚠️';
        } else {
            marginClass = 'danger';
            marginIcon = '❌';
        }
        
        row.innerHTML = `
            <td class="role-cell">${pos.role}</td>
            <td>${pos.hours}</td>
            <td><span class="location-badge ${pos.location}">${capitalizeFirst(pos.location)}</span></td>
            <td>${formatCurrency(pos.totalCost)}</td>
            <td>${formatCurrency(pos.clientRate)}/hr</td>
            <td>${formatCurrency(pos.revenue)}</td>
            <td class="profit-cell">${formatCurrency(pos.profit)}</td>
            <td class="margin-cell ${marginClass}">${marginIcon} ${pos.margin.toFixed(1)}%</td>
            <td><button class="btn-delete" onclick="deletePosition(${pos.id})" title="Delete">🗑️</button></td>
        `;
        
        tbody.appendChild(row);
    });
}

// ========================================
// Update Budget Tracker
// ========================================

function updateBudgetTracker() {
    const totalAllocated = positions.reduce((sum, p) => sum + p.revenue, 0);
    const totalCostSum = positions.reduce((sum, p) => sum + p.totalCost, 0);
    const totalProfitSum = positions.reduce((sum, p) => sum + p.profit, 0);
    const remaining = totalBudget - totalAllocated;
    const percentUsed = totalBudget > 0 ? (totalAllocated / totalBudget) * 100 : 0;
    const avgMargin = totalAllocated > 0 ? (totalProfitSum / totalAllocated) * 100 : 0;
    
    // Progress bar
    document.getElementById('budgetProgressFill').style.width = Math.min(percentUsed, 100) + '%';
    document.getElementById('budgetUsedPercent').textContent = percentUsed.toFixed(1) + '%';
    document.getElementById('budgetUsedAmount').textContent = formatCurrency(totalAllocated);
    
    // Financial summary
    document.getElementById('budgetAllocated').textContent = formatCurrency(totalAllocated);
    document.getElementById('budgetRemaining').textContent = formatCurrency(remaining);
    document.getElementById('totalCost').textContent = formatCurrency(totalCostSum);
    document.getElementById('totalProfit').textContent = formatCurrency(totalProfitSum);
    
    const marginElement = document.getElementById('avgMargin');
    marginElement.textContent = avgMargin.toFixed(1) + '%';
    marginElement.className = 'summary-value margin';
    if (avgMargin >= 70) marginElement.classList.add('excellent');
    else if (avgMargin >= targetMargin * 100) marginElement.classList.add('good');
    else if (avgMargin >= 40) marginElement.classList.add('warning');
    else marginElement.classList.add('danger');
    
    // Warnings
    const warningsContainer = document.getElementById('budgetWarnings');
    warningsContainer.innerHTML = '';
    
    if (avgMargin < targetMargin * 100 && positions.length > 0) {
        const warning = document.createElement('div');
        warning.className = 'budget-warning';
        warning.innerHTML = `
            <div class="warning-icon">⚠️</div>
            <div class="warning-text">
                Below ${(targetMargin * 100).toFixed(0)}% target<br>
                <small>Current: ${avgMargin.toFixed(1)}%</small>
            </div>
        `;
        warningsContainer.appendChild(warning);
    }
    
    if (remaining < 0) {
        const warning = document.createElement('div');
        warning.className = 'budget-warning danger';
        warning.innerHTML = `
            <div class="warning-icon">❌</div>
            <div class="warning-text">
                Over budget!<br>
                <small>By ${formatCurrency(Math.abs(remaining))}</small>
            </div>
        `;
        warningsContainer.appendChild(warning);
    }
    
    if (totalCostSum > totalBudget) {
        const warning = document.createElement('div');
        warning.className = 'budget-warning danger';
        warning.innerHTML = `
            <div class="warning-icon">🚨</div>
            <div class="warning-text">
                Budget too low!<br>
                <small>Costs exceed budget</small>
            </div>
        `;
        warningsContainer.appendChild(warning);
    }
}

// ========================================
// Delete Position
// ========================================

window.deletePosition = function(id) {
    positions = positions.filter(p => p.id !== id);
    
    if (positions.length === 0) {
        document.getElementById('resultsPlaceholder').style.display = 'block';
        document.getElementById('positionsSection').style.display = 'none';
        document.getElementById('clearAllBtn').style.display = 'none';
    } else {
        recalculateAllPositions();
        renderPositions();
    }
    
    updateBudgetTracker();
};

// ========================================
// Clear All
// ========================================

function handleClearAll() {
    if (!confirm('🗑️ Clear all positions?')) return;
    
    positions = [];
    document.getElementById('resultsPlaceholder').style.display = 'block';
    document.getElementById('positionsSection').style.display = 'none';
    document.getElementById('clearAllBtn').style.display = 'none';
    updateBudgetTracker();
}

// ========================================
// Utility Functions
// ========================================

function formatCurrency(value) {
    if (isNaN(value)) return '$0.00';
    return `$${Math.abs(value).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

console.log('✅ Budget calculator loaded');
