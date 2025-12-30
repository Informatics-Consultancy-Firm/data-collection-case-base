// ============================================
// DASHBOARD MODULE
// Charts, data visualization, and Google Sheets integration
// ============================================

// Dashboard state
const dashboardState = {
    data: [],
    filteredData: [],
    charts: {},
    currentPage: 1,
    pageSize: 20,
    isLoading: false
};

// Chart color palette - ICF theme
const CHART_COLORS = {
    primary: ['#1a5276', '#2980b9', '#3498db', '#5dade2', '#85c1e9'],
    secondary: ['#27ae60', '#2ecc71', '#58d68d', '#82e0aa', '#abebc6'],
    accent: ['#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#34495e'],
    gradient: [
        'rgba(26, 82, 118, 0.8)',
        'rgba(41, 128, 185, 0.8)',
        'rgba(52, 152, 219, 0.8)',
        'rgba(93, 173, 226, 0.8)',
        'rgba(133, 193, 233, 0.8)'
    ]
};

// ============================================
// GOOGLE SHEETS DATA FETCHING
// ============================================

/**
 * Load data from Google Sheets
 */
async function loadDataFromSheets() {
    if (dashboardState.isLoading) return;
    
    dashboardState.isLoading = true;
    showLoading('Loading data from Google Sheets...');
    
    try {
        // Fetch data via Google Apps Script
        const response = await fetch(`${SCRIPT_URL}?action=getData`, {
            method: 'GET',
            mode: 'cors'
        });
        
        if (response.ok) {
            const result = await response.json();
            
            if (result.success && result.data) {
                dashboardState.data = result.data;
                dashboardState.filteredData = [...dashboardState.data];
                
                console.log(`Loaded ${dashboardState.data.length} records`);
                
                // Update UI
                populateDashboardFilters();
                updateSummaryCards();
                renderAllCharts();
                renderDataTable();
                populateVariableSelector();
                
                showNotification(`Loaded ${dashboardState.data.length} records`, 'success');
            } else {
                throw new Error(result.error || 'Failed to load data');
            }
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
        
    } catch (error) {
        console.error('Error loading data:', error);
        showNotification('Failed to load data from Google Sheets', 'error');
        
        // Try to load from local storage as fallback
        loadFromLocalStorage();
    } finally {
        dashboardState.isLoading = false;
        hideLoading();
    }
}

/**
 * Load data from local storage (fallback)
 */
function loadFromLocalStorage() {
    try {
        const savedData = localStorage.getItem('dashboardData');
        if (savedData) {
            dashboardState.data = JSON.parse(savedData);
            dashboardState.filteredData = [...dashboardState.data];
            
            populateDashboardFilters();
            updateSummaryCards();
            renderAllCharts();
            renderDataTable();
            populateVariableSelector();
            
            showNotification('Loaded cached data (offline mode)', 'info');
        }
    } catch (e) {
        console.error('Error loading from local storage:', e);
    }
}

/**
 * Save data to local storage for offline access
 */
function saveToLocalStorage() {
    try {
        localStorage.setItem('dashboardData', JSON.stringify(dashboardState.data));
    } catch (e) {
        console.error('Error saving to local storage:', e);
    }
}

// ============================================
// DASHBOARD FILTERS
// ============================================

/**
 * Populate dashboard filter dropdowns
 */
function populateDashboardFilters() {
    const data = dashboardState.data;
    
    // Month filter
    const monthFilter = document.getElementById('filterMonth');
    if (monthFilter) {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
        monthFilter.innerHTML = '<option value="">All Months</option>';
        months.forEach(month => {
            monthFilter.innerHTML += `<option value="${month}">${month}</option>`;
        });
    }
    
    // Region filter
    const regionFilter = document.getElementById('filterRegion');
    if (regionFilter) {
        const regions = [...new Set(data.map(d => d.region).filter(r => r))].sort();
        regionFilter.innerHTML = '<option value="">All Regions</option>';
        regions.forEach(region => {
            regionFilter.innerHTML += `<option value="${region}">${region}</option>`;
        });
    }
}

/**
 * Apply region filter and update district dropdown
 */
function applyDashboardRegionFilter() {
    const region = document.getElementById('filterRegion')?.value;
    const districtFilter = document.getElementById('filterDistrict');
    
    if (districtFilter) {
        districtFilter.innerHTML = '<option value="">All Districts</option>';
        
        if (region) {
            const districts = [...new Set(
                dashboardState.data
                    .filter(d => d.region === region)
                    .map(d => d.district)
                    .filter(d => d)
            )].sort();
            
            districts.forEach(district => {
                districtFilter.innerHTML += `<option value="${district}">${district}</option>`;
            });
        }
    }
    
    // Reset downstream filters
    document.getElementById('filterChiefdom').innerHTML = '<option value="">All Chiefdoms</option>';
    document.getElementById('filterFacility').innerHTML = '<option value="">All Facilities</option>';
    
    applyFilters();
}

/**
 * Apply district filter and update chiefdom dropdown
 */
function applyDashboardDistrictFilter() {
    const district = document.getElementById('filterDistrict')?.value;
    const chiefdomFilter = document.getElementById('filterChiefdom');
    
    if (chiefdomFilter) {
        chiefdomFilter.innerHTML = '<option value="">All Chiefdoms</option>';
        
        if (district) {
            const chiefdoms = [...new Set(
                dashboardState.data
                    .filter(d => d.district === district)
                    .map(d => d.chiefdom)
                    .filter(c => c)
            )].sort();
            
            chiefdoms.forEach(chiefdom => {
                chiefdomFilter.innerHTML += `<option value="${chiefdom}">${chiefdom}</option>`;
            });
        }
    }
    
    // Reset facility filter
    document.getElementById('filterFacility').innerHTML = '<option value="">All Facilities</option>';
    
    applyFilters();
}

/**
 * Apply chiefdom filter and update facility dropdown
 */
function applyDashboardChiefdomFilter() {
    const chiefdom = document.getElementById('filterChiefdom')?.value;
    const facilityFilter = document.getElementById('filterFacility');
    
    if (facilityFilter) {
        facilityFilter.innerHTML = '<option value="">All Facilities</option>';
        
        if (chiefdom) {
            const facilities = [...new Set(
                dashboardState.data
                    .filter(d => d.chiefdom === chiefdom)
                    .map(d => d.healthFacility)
                    .filter(f => f)
            )].sort();
            
            facilities.forEach(facility => {
                facilityFilter.innerHTML += `<option value="${facility}">${facility}</option>`;
            });
        }
    }
    
    applyFilters();
}

/**
 * Apply all filters to data
 */
function applyFilters() {
    const year = document.getElementById('filterYear')?.value;
    const month = document.getElementById('filterMonth')?.value;
    const region = document.getElementById('filterRegion')?.value;
    const district = document.getElementById('filterDistrict')?.value;
    const chiefdom = document.getElementById('filterChiefdom')?.value;
    const facility = document.getElementById('filterFacility')?.value;
    
    dashboardState.filteredData = dashboardState.data.filter(record => {
        if (year && record.year !== year) return false;
        if (month && record.month !== month) return false;
        if (region && record.region !== region) return false;
        if (district && record.district !== district) return false;
        if (chiefdom && record.chiefdom !== chiefdom) return false;
        if (facility && record.healthFacility !== facility) return false;
        return true;
    });
    
    // Update charts and tables
    updateSummaryCards();
    renderAllCharts();
    renderDataTable();
    
    console.log(`Filtered to ${dashboardState.filteredData.length} records`);
}

/**
 * Clear all filters
 */
function clearFilters() {
    document.getElementById('filterYear').value = '';
    document.getElementById('filterMonth').value = '';
    document.getElementById('filterRegion').value = '';
    document.getElementById('filterDistrict').innerHTML = '<option value="">All Districts</option>';
    document.getElementById('filterChiefdom').innerHTML = '<option value="">All Chiefdoms</option>';
    document.getElementById('filterFacility').innerHTML = '<option value="">All Facilities</option>';
    
    dashboardState.filteredData = [...dashboardState.data];
    
    updateSummaryCards();
    renderAllCharts();
    renderDataTable();
}

/**
 * Refresh dashboard data
 */
function refreshDashboard() {
    loadDataFromSheets();
}

// ============================================
// SUMMARY CARDS
// ============================================

/**
 * Update summary cards with filtered data
 */
function updateSummaryCards() {
    const data = dashboardState.filteredData;
    
    // Total records
    document.getElementById('totalRecords').textContent = data.length.toLocaleString();
    
    // Unique facilities
    const facilities = new Set(data.map(d => d.healthFacility).filter(f => f));
    document.getElementById('facilitiesReported').textContent = facilities.size.toLocaleString();
    
    // Malaria cases (fever suspected)
    let malariaCases = 0;
    data.forEach(record => {
        if (record.fever_suspected_malaria === 'Yes') malariaCases++;
        if (record.fever_cases_gen === 'Yes') malariaCases++;
    });
    document.getElementById('malariaCases').textContent = malariaCases.toLocaleString();
    
    // RDT Positive
    let rdtPositive = 0;
    data.forEach(record => {
        if (record.rdt_positive === 'Yes') rdtPositive++;
        if (record.fever_tested_rdt_gen === 'Positive') rdtPositive++;
    });
    document.getElementById('rdtPositive').textContent = rdtPositive.toLocaleString();
}

// ============================================
// CHARTS RENDERING
// ============================================

/**
 * Render all dashboard charts
 */
function renderAllCharts() {
    renderMalariaByRegionChart();
    renderRDTResultsChart();
    renderMonthlyTrendChart();
    renderTreatmentChart();
    renderAgeGroupChart();
    renderDistrictChart();
}

/**
 * Destroy existing chart if it exists
 */
function destroyChart(chartId) {
    if (dashboardState.charts[chartId]) {
        dashboardState.charts[chartId].destroy();
    }
}

/**
 * Malaria cases by region - Bar chart
 */
function renderMalariaByRegionChart() {
    const ctx = document.getElementById('malariaByRegionChart')?.getContext('2d');
    if (!ctx) return;
    
    destroyChart('malariaByRegion');
    
    // Aggregate data by region
    const regionData = {};
    dashboardState.filteredData.forEach(record => {
        const region = record.region || 'Unknown';
        if (!regionData[region]) regionData[region] = 0;
        
        if (record.fever_suspected_malaria === 'Yes') regionData[region]++;
        if (record.fever_cases_gen === 'Yes') regionData[region]++;
    });
    
    const labels = Object.keys(regionData).sort();
    const values = labels.map(l => regionData[l]);
    
    dashboardState.charts['malariaByRegion'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Malaria Cases',
                data: values,
                backgroundColor: CHART_COLORS.gradient,
                borderColor: CHART_COLORS.primary[0],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

/**
 * RDT Results - Pie chart
 */
function renderRDTResultsChart() {
    const ctx = document.getElementById('rdtResultsChart')?.getContext('2d');
    if (!ctx) return;
    
    destroyChart('rdtResults');
    
    let positive = 0, negative = 0;
    
    dashboardState.filteredData.forEach(record => {
        if (record.rdt_positive === 'Yes') positive++;
        if (record.rdt_negative === 'Yes') negative++;
        if (record.fever_tested_rdt_gen === 'Positive') positive++;
        if (record.fever_tested_rdt_gen === 'Negative') negative++;
    });
    
    dashboardState.charts['rdtResults'] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['RDT Positive', 'RDT Negative'],
            datasets: [{
                data: [positive, negative],
                backgroundColor: ['#e74c3c', '#27ae60'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

/**
 * Monthly trend - Line chart
 */
function renderMonthlyTrendChart() {
    const ctx = document.getElementById('monthlyTrendChart')?.getContext('2d');
    if (!ctx) return;
    
    destroyChart('monthlyTrend');
    
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    
    const monthData = {};
    months.forEach(m => monthData[m] = 0);
    
    dashboardState.filteredData.forEach(record => {
        const month = record.month;
        if (month && monthData[month] !== undefined) {
            monthData[month]++;
        }
    });
    
    dashboardState.charts['monthlyTrend'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Records',
                data: months.map(m => monthData[m]),
                borderColor: CHART_COLORS.primary[1],
                backgroundColor: 'rgba(41, 128, 185, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

/**
 * Treatment distribution - Bar chart
 */
function renderTreatmentChart() {
    const ctx = document.getElementById('treatmentChart')?.getContext('2d');
    if (!ctx) return;
    
    destroyChart('treatment');
    
    let actLess24 = 0, actMore24 = 0, noActLess24 = 0, noActMore24 = 0;
    
    dashboardState.filteredData.forEach(record => {
        if (record.act_less_24h === 'Yes') actLess24++;
        if (record.act_more_24h === 'Yes') actMore24++;
        if (record.treated_without_act_less_24h === 'Yes') noActLess24++;
        if (record.treated_without_act_more_24h === 'Yes') noActMore24++;
        
        // General form
        if (record.malaria_act_facility_gen === '<24 hours') actLess24++;
        if (record.malaria_act_facility_gen === '>24 hours') actMore24++;
        if (record.malaria_without_act_gen === '<24 hours') noActLess24++;
        if (record.malaria_without_act_gen === '>24 hours') noActMore24++;
    });
    
    dashboardState.charts['treatment'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['ACT <24h', 'ACT >24h', 'No ACT <24h', 'No ACT >24h'],
            datasets: [{
                label: 'Cases',
                data: [actLess24, actMore24, noActLess24, noActMore24],
                backgroundColor: ['#27ae60', '#2ecc71', '#e74c3c', '#c0392b']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

/**
 * Age group distribution - Pie chart
 */
function renderAgeGroupChart() {
    const ctx = document.getElementById('ageGroupChart')?.getContext('2d');
    if (!ctx) return;
    
    destroyChart('ageGroup');
    
    let underFive = 0, fiveToFourteen = 0, fifteenPlus = 0;
    
    dashboardState.filteredData.forEach(record => {
        if (record.formType === 'under_five') {
            underFive++;
        } else if (record.formType === 'general') {
            const age = parseInt(record.age_years);
            if (age >= 5 && age < 15) fiveToFourteen++;
            else fifteenPlus++;
        }
    });
    
    dashboardState.charts['ageGroup'] = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['0-59 months', '5-14 years', '15+ years'],
            datasets: [{
                data: [underFive, fiveToFourteen, fifteenPlus],
                backgroundColor: CHART_COLORS.primary.slice(0, 3)
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

/**
 * Cases by district - Horizontal bar chart
 */
function renderDistrictChart() {
    const ctx = document.getElementById('districtChart')?.getContext('2d');
    if (!ctx) return;
    
    destroyChart('district');
    
    // Aggregate by district
    const districtData = {};
    dashboardState.filteredData.forEach(record => {
        const district = record.district || 'Unknown';
        districtData[district] = (districtData[district] || 0) + 1;
    });
    
    // Sort by count and take top 10
    const sorted = Object.entries(districtData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    dashboardState.charts['district'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(d => d[0]),
            datasets: [{
                label: 'Records',
                data: sorted.map(d => d[1]),
                backgroundColor: CHART_COLORS.gradient
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// ============================================
// VARIABLE ANALYSIS
// ============================================

/**
 * Populate variable selector dropdown
 */
function populateVariableSelector() {
    const selector = document.getElementById('variableSelect');
    if (!selector) return;
    
    selector.innerHTML = '<option value="">-- Select a variable --</option>';
    
    // Get all variable fields from VARIABLES config
    if (typeof VARIABLES !== 'undefined') {
        const categories = {
            'Malaria': ['fever_suspected_malaria', 'rdt_positive', 'rdt_negative', 'microscopy_positive', 
                       'microscopy_negative', 'act_less_24h', 'act_more_24h'],
            'Child Health': ['diarrhoea_ors_zinc', 'diarrhoea_ors_only', 'ari_with_antibiotic', 
                            'pneumonia_with_antibiotic'],
            'NTD': ['schistosomiasis', 'trachoma', 'worm_infestation', 'onchocerciasis'],
            'Mental Health': ['mental_disorder', 'epilepsy'],
            'Trauma': ['wounds_rta', 'wounds_non_rta', 'burns'],
            'Other': ['eye_infection', 'hepatitis', 'skin_infection', 'anaemia']
        };
        
        for (const [category, fields] of Object.entries(categories)) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = category;
            
            fields.forEach(field => {
                if (VARIABLES[field]) {
                    const option = document.createElement('option');
                    option.value = field;
                    option.textContent = VARIABLES[field];
                    optgroup.appendChild(option);
                }
            });
            
            if (optgroup.children.length > 0) {
                selector.appendChild(optgroup);
            }
        }
    }
}

/**
 * Render chart for selected variable
 */
function renderVariableChart() {
    const variable = document.getElementById('variableSelect')?.value;
    if (!variable) return;
    
    const ctx = document.getElementById('variableChart')?.getContext('2d');
    if (!ctx) return;
    
    destroyChart('variable');
    
    // Count Yes/No responses
    let yes = 0, no = 0, other = 0;
    
    dashboardState.filteredData.forEach(record => {
        const value = record[variable];
        if (value === 'Yes' || value === '1') yes++;
        else if (value === 'No' || value === '0') no++;
        else if (value) other++;
    });
    
    const variableLabel = VARIABLES[variable] || variable;
    
    dashboardState.charts['variable'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Yes', 'No', 'Other/Not Recorded'],
            datasets: [{
                label: variableLabel,
                data: [yes, no, other],
                backgroundColor: ['#27ae60', '#e74c3c', '#95a5a6']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: variableLabel,
                    font: { size: 16 }
                }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// ============================================
// DATA TABLE
// ============================================

/**
 * Render data table with pagination
 */
function renderDataTable() {
    const tbody = document.getElementById('dataTableBody');
    if (!tbody) return;
    
    const data = dashboardState.filteredData;
    const startIndex = (dashboardState.currentPage - 1) * dashboardState.pageSize;
    const endIndex = startIndex + dashboardState.pageSize;
    const pageData = data.slice(startIndex, endIndex);
    
    if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">No data found</td></tr>';
        return;
    }
    
    tbody.innerHTML = pageData.map((record, index) => `
        <tr>
            <td>${record.timestamp ? new Date(record.timestamp).toLocaleDateString() : '-'}</td>
            <td>${record.healthFacility || '-'}</td>
            <td><span class="badge ${record.formType}">${record.formType === 'under_five' ? 'Under 5' : 'General'}</span></td>
            <td>${record.region || '-'}</td>
            <td>${record.district || '-'}</td>
            <td>
                <button class="btn-table" onclick="viewRecord(${startIndex + index})">👁️ View</button>
            </td>
        </tr>
    `).join('');
    
    renderPagination(data.length);
}

/**
 * Render pagination controls
 */
function renderPagination(totalRecords) {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    
    const totalPages = Math.ceil(totalRecords / dashboardState.pageSize);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    html += `<button class="page-btn" onclick="goToPage(${dashboardState.currentPage - 1})" 
             ${dashboardState.currentPage === 1 ? 'disabled' : ''}>← Prev</button>`;
    
    // Page numbers
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
        html += `<button class="page-btn ${i === dashboardState.currentPage ? 'active' : ''}" 
                 onclick="goToPage(${i})">${i}</button>`;
    }
    
    if (totalPages > 5) {
        html += '<span class="page-ellipsis">...</span>';
        html += `<button class="page-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }
    
    // Next button
    html += `<button class="page-btn" onclick="goToPage(${dashboardState.currentPage + 1})" 
             ${dashboardState.currentPage === totalPages ? 'disabled' : ''}>Next →</button>`;
    
    pagination.innerHTML = html;
}

/**
 * Go to specific page
 */
function goToPage(page) {
    const totalPages = Math.ceil(dashboardState.filteredData.length / dashboardState.pageSize);
    
    if (page < 1 || page > totalPages) return;
    
    dashboardState.currentPage = page;
    renderDataTable();
}

/**
 * Filter data table by search
 */
function filterDataTable() {
    const search = document.getElementById('dataSearch')?.value.toLowerCase() || '';
    const formType = document.getElementById('dataFormType')?.value || '';
    
    dashboardState.filteredData = dashboardState.data.filter(record => {
        // Form type filter
        if (formType && record.formType !== formType) return false;
        
        // Search filter
        if (search) {
            const searchableText = [
                record.healthFacility,
                record.region,
                record.district,
                record.chiefdom
            ].join(' ').toLowerCase();
            
            if (!searchableText.includes(search)) return false;
        }
        
        return true;
    });
    
    dashboardState.currentPage = 1;
    renderDataTable();
}

/**
 * View single record
 */
function viewRecord(index) {
    const record = dashboardState.filteredData[index];
    if (!record) return;
    
    // Create modal content
    let html = '<div class="record-details">';
    
    for (const [key, value] of Object.entries(record)) {
        if (value && key !== 'timestamp') {
            const label = VARIABLES[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            html += `<div class="detail-row"><strong>${label}:</strong> ${value}</div>`;
        }
    }
    
    html += '</div>';
    
    // Show in alert for now (could be a modal)
    alert(`Record Details:\n\n${Object.entries(record).map(([k, v]) => `${k}: ${v}`).join('\n')}`);
}

/**
 * Export filtered data to CSV
 */
function exportToCSV() {
    if (dashboardState.filteredData.length === 0) {
        showNotification('No data to export', 'warning');
        return;
    }
    
    const headers = Object.keys(dashboardState.filteredData[0]);
    const csvContent = [
        headers.join(','),
        ...dashboardState.filteredData.map(row => 
            headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(',')
        )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `data_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    showNotification('CSV exported successfully', 'success');
}

// ============================================
// TAB SWITCHING
// ============================================

/**
 * Switch between tabs
 */
function switchTab(tabName) {
    // Update nav buttons
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // Load data if switching to dashboard or data tab
    if ((tabName === 'dashboard' || tabName === 'data') && dashboardState.data.length === 0) {
        loadDataFromSheets();
    }
}

// ============================================
// INITIALIZATION
// ============================================

console.log('Dashboard Module loaded');
