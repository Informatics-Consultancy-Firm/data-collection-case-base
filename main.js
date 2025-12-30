// ============================================    
// DATA COLLECTION APP - ENHANCED VERSION
// With DHIS2 Integration and Dashboard
// ============================================

// Data maps for cascading dropdowns
let regionDistrictMap = {};
let districtChiefdomMap = {};
let chiefdomFacilityMap = {};

// Application state
const state = {
    pendingSubmissions: [],
    isOnline: navigator.onLine,
    isLoggedIn: false,
    currentSection: 1,
    totalSections: 10,
    formType: null // 'under_five' or 'general'
};

// ============================================
// INITIALIZATION
// ============================================
function init() {
    console.log('Initializing application...');
    
    try {
        // Load pending submissions from localStorage
        const saved = localStorage.getItem('pendingSubmissions');
        if (saved) {
            try {
                state.pendingSubmissions = JSON.parse(saved);
                console.log('Loaded pending submissions:', state.pendingSubmissions.length);
            } catch (e) {
                console.error('Error parsing pending submissions:', e);
                state.pendingSubmissions = [];
            }
        }

        // Check login state from sessionStorage
        state.isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
        console.log('Login state:', state.isLoggedIn);
        
        // Parse cascading data for dropdowns
        parseCascadingDataLocal();
        
        // Populate month dropdown
        populateMonthDropdown();
        
        // Setup all event listeners
        setupEventListeners();
        
        // Setup form type listeners
        setupFormTypeListeners();
        
        // Show appropriate screen based on login state
        if (state.isLoggedIn) {
            showMainContent();
        } else {
            console.log('Showing login screen');
            document.getElementById('loginScreen').style.display = 'flex';
        }
        
        // Set current year
        const yearInput = document.getElementById('yearInput');
        if (yearInput) {
            yearInput.value = new Date().getFullYear();
        }
        
        console.log('Initialization complete');
        
    } catch (error) {
        console.error('Initialization error:', error);
    }
}

// ============================================
// EVENT LISTENERS SETUP
// ============================================
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        console.log('Login form listener attached');
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
        console.log('Logout button listener attached');
    }

    // Main data form
    const dataForm = document.getElementById('dataForm');
    if (dataForm) {
        dataForm.addEventListener('submit', handleFormSubmit);
        console.log('Data form listener attached');
    }

    // Online/offline events
    window.addEventListener('online', handleOnlineEvent);
    window.addEventListener('offline', handleOfflineEvent);
    console.log('Online/offline listeners attached');
}

function setupFormTypeListeners() {
    const underFiveRadio = document.getElementById('underFiveRadio');
    const generalRadio = document.getElementById('generalRadio');
    
    if (underFiveRadio) {
        underFiveRadio.addEventListener('change', function() {
            if (this.checked) {
                state.formType = 'under_five';
                console.log('Form type selected: under_five');
                generateVariableFields();
            }
        });
    }
    
    if (generalRadio) {
        generalRadio.addEventListener('change', function() {
            if (this.checked) {
                state.formType = 'general';
                console.log('Form type selected: general');
                generateVariableFields();
            }
        });
    }
}

function setupCascadingListeners() {
    const regionSelect = document.getElementById('regionSelect');
    const districtSelect = document.getElementById('districtSelect');
    const chiefdomSelect = document.getElementById('chiefdomSelect');
    
    if (regionSelect) {
        regionSelect.addEventListener('change', handleRegionChange);
    }
    if (districtSelect) {
        districtSelect.addEventListener('change', handleDistrictChange);
    }
    if (chiefdomSelect) {
        chiefdomSelect.addEventListener('change', handleChiefdomChange);
    }
    
    console.log('Cascading dropdown listeners attached');
}

// ============================================
// CASCADING DATA PARSER
// ============================================
function parseCascadingDataLocal() {
    if (typeof CASCADING_DATA === 'undefined') {
        console.error('CASCADING_DATA not found in config.js');
        return;
    }
    
    const lines = CASCADING_DATA.trim().split('\n');
    
    regionDistrictMap = {};
    districtChiefdomMap = {};
    chiefdomFacilityMap = {};
    
    lines.forEach(line => {
        const parts = line.split('||').map(p => p.trim());
        
        if (parts.length === 2) {
            const [parent, child] = parts;
            
            if (parent.includes('Region') || parent === 'Western Area') {
                if (!regionDistrictMap[parent]) {
                    regionDistrictMap[parent] = [];
                }
                if (!regionDistrictMap[parent].includes(child)) {
                    regionDistrictMap[parent].push(child);
                }
            }
            else if (parent.includes('District')) {
                if (!districtChiefdomMap[parent]) {
                    districtChiefdomMap[parent] = [];
                }
                if (!districtChiefdomMap[parent].includes(child)) {
                    districtChiefdomMap[parent].push(child);
                }
            }
            else {
                if (!chiefdomFacilityMap[parent]) {
                    chiefdomFacilityMap[parent] = [];
                }
                if (!chiefdomFacilityMap[parent].includes(child)) {
                    chiefdomFacilityMap[parent].push(child);
                }
            }
        }
    });
    
    console.log(`Cascading data parsed: ${Object.keys(regionDistrictMap).length} regions`);
}

// ============================================
// LOGIN / LOGOUT HANDLERS
// ============================================
function handleLogin(e) {
    e.preventDefault();
    console.log('Login attempt...');
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorDiv = document.getElementById('loginError');
    
    if (username === LOGIN_USERNAME && password === LOGIN_PASSWORD) {
        console.log('Login successful');
        sessionStorage.setItem('isLoggedIn', 'true');
        state.isLoggedIn = true;
        errorDiv.classList.remove('show');
        showMainContent();
    } else {
        console.log('Login failed - invalid credentials');
        errorDiv.classList.add('show');
    }
}

function handleLogout() {
    console.log('Logging out...');
    sessionStorage.removeItem('isLoggedIn');
    state.isLoggedIn = false;
    document.getElementById('mainContent').classList.remove('show');
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

function showMainContent() {
    console.log('Showing main content...');
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainContent').classList.add('show');
    
    updateOnlineStatus();
    updatePendingCount();
    
    setupCascadingListeners();
    populateRegions();
    
    // Test DHIS2 connection
    if (typeof testDHIS2Connection === 'function') {
        testDHIS2Connection();
    }
    
    if (state.isOnline && state.pendingSubmissions.length > 0) {
        syncPendingSubmissions();
    }
}

// ============================================
// MONTH DROPDOWN
// ============================================
function populateMonthDropdown() {
    const monthSelect = document.getElementById('monthSelect');
    if (!monthSelect) return;
    
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    monthSelect.innerHTML = '<option value="">Select month...</option>';
    
    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = month;
        monthSelect.appendChild(option);
    });
    
    // Set current month
    const currentMonth = new Date().getMonth();
    monthSelect.value = months[currentMonth];
    
    console.log('Month dropdown populated');
}

// ============================================
// CASCADING DROPDOWN HANDLERS
// ============================================
function populateRegions() {
    const regionSelect = document.getElementById('regionSelect');
    if (!regionSelect) return;
    
    regionSelect.innerHTML = '<option value="">Select region...</option>';
    
    const regions = Object.keys(regionDistrictMap).sort();
    regions.forEach(region => {
        const option = document.createElement('option');
        option.value = region;
        option.textContent = region;
        regionSelect.appendChild(option);
    });
    
    console.log('Regions populated:', regions.length);
}

function handleRegionChange(e) {
    const region = e.target.value;
    const districtSelect = document.getElementById('districtSelect');
    const chiefdomSelect = document.getElementById('chiefdomSelect');
    const facilitySelect = document.getElementById('healthFacilitySelect');
    
    districtSelect.innerHTML = '<option value="">Select district...</option>';
    chiefdomSelect.innerHTML = '<option value="">Select district first...</option>';
    chiefdomSelect.disabled = true;
    facilitySelect.innerHTML = '<option value="">Select chiefdom first...</option>';
    facilitySelect.disabled = true;
    
    clearFacilityFields();
    
    if (region && regionDistrictMap[region]) {
        districtSelect.disabled = false;
        
        const districts = regionDistrictMap[region].sort();
        districts.forEach(district => {
            const option = document.createElement('option');
            option.value = district;
            option.textContent = district;
            districtSelect.appendChild(option);
        });
        
        console.log('Districts loaded for', region, ':', districts.length);
    } else {
        districtSelect.disabled = true;
        districtSelect.innerHTML = '<option value="">Select region first...</option>';
    }
}

function handleDistrictChange(e) {
    const district = e.target.value;
    const chiefdomSelect = document.getElementById('chiefdomSelect');
    const facilitySelect = document.getElementById('healthFacilitySelect');
    
    chiefdomSelect.innerHTML = '<option value="">Select chiefdom...</option>';
    facilitySelect.innerHTML = '<option value="">Select chiefdom first...</option>';
    facilitySelect.disabled = true;
    
    clearFacilityFields();
    
    if (district && districtChiefdomMap[district]) {
        chiefdomSelect.disabled = false;
        
        const chiefdoms = districtChiefdomMap[district].sort();
        chiefdoms.forEach(chiefdom => {
            const option = document.createElement('option');
            option.value = chiefdom;
            option.textContent = chiefdom;
            chiefdomSelect.appendChild(option);
        });
        
        console.log('Chiefdoms loaded for', district, ':', chiefdoms.length);
    } else {
        chiefdomSelect.disabled = true;
        chiefdomSelect.innerHTML = '<option value="">Select district first...</option>';
    }
}

function handleChiefdomChange(e) {
    const chiefdom = e.target.value;
    const facilitySelect = document.getElementById('healthFacilitySelect');
    
    facilitySelect.innerHTML = '<option value="">Select health facility...</option>';
    clearFacilityFields();
    
    if (chiefdom && chiefdomFacilityMap[chiefdom]) {
        facilitySelect.disabled = false;
        
        const facilities = [...chiefdomFacilityMap[chiefdom]].sort();
        
        facilities.forEach(facility => {
            const option = document.createElement('option');
            option.value = facility;
            option.textContent = facility;
            facilitySelect.appendChild(option);
        });
        
        facilitySelect.onchange = function() {
            const selectedName = this.value;
            const nameField = document.getElementById('healthFacilityName');
            if (nameField) nameField.value = selectedName;
            console.log('Selected facility:', selectedName);
        };
        
        console.log('Facilities loaded for', chiefdom, ':', facilities.length);
    } else {
        facilitySelect.disabled = true;
        facilitySelect.innerHTML = '<option value="">Select chiefdom first...</option>';
    }
}

function clearFacilityFields() {
    const nameField = document.getElementById('healthFacilityName');
    if (nameField) nameField.value = '';
}

// ============================================
// DYNAMIC FORM GENERATION
// ============================================
function generateVariableFields() {
    const container = document.getElementById('dynamicSections');
    
    if (!state.formType) {
        container.innerHTML = '';
        return;
    }
    
    if (typeof VARIABLE_SECTIONS === 'undefined') {
        console.error('VARIABLE_SECTIONS not found in config.js');
        container.innerHTML = '<p style="color: #dc3545; text-align: center; padding: 20px;">Configuration error.</p>';
        return;
    }
    
    let html = '';
    let sectionNum = 2;
    
    const formSections = VARIABLE_SECTIONS[state.formType === 'under_five' ? 'UNDER_FIVE' : 'GENERAL'];
    
    if (!formSections) {
        container.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No sections available.</p>';
        state.totalSections = 1;
        return;
    }
    
    const sectionKeys = Object.keys(formSections);
    console.log('Generating', sectionKeys.length, 'sections for', state.formType);
    
    sectionKeys.forEach((sectionTitle, index) => {
        const section = formSections[sectionTitle];
        const isLastSection = index === sectionKeys.length - 1;
        
        html += `
            <div class="form-section" data-section="${sectionNum}">
                <div class="section-header">
                    <h2 class="section-title">${sectionTitle}</h2>
                    <p class="section-description">${section.description}</p>
                </div>
        `;
        
        const fields = Object.entries(section.fields);
        for (let i = 0; i < fields.length; i += 2) {
            html += '<div class="form-row">';
            
            for (let j = i; j < Math.min(i + 2, fields.length); j++) {
                const [fieldName, fieldConfig] = fields[j];
                const label = fieldConfig.label || fieldConfig;
                const type = fieldConfig.type || 'text';
                
                html += '<div class="form-group">';
                html += `<label class="form-label">${label} <span class="required">*</span></label>`;
                
                if (type === 'yesno') {
                    html += `
                        <select class="form-select" name="${fieldName}" required>
                            <option value="">Select...</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                        </select>
                    `;
                } else if (type === 'select' && fieldConfig.options) {
                    html += `<select class="form-select" name="${fieldName}" required>`;
                    html += '<option value="">Select...</option>';
                    fieldConfig.options.forEach(option => {
                        html += `<option value="${option}">${option}</option>`;
                    });
                    html += '</select>';
                } else if (type === 'date') {
                    html += `<input type="date" class="form-input" name="${fieldName}" required>`;
                } else if (type === 'number') {
                    html += `<input type="number" class="form-input" name="${fieldName}" min="0" step="0.1" required>`;
                } else {
                    html += `<input type="text" class="form-input" name="${fieldName}" ${type === 'text' ? '' : 'required'}>`;
                }
                
                html += '</div>';
            }
            
            html += '</div>';
        }
        
        // Navigation and action buttons for last section
        if (isLastSection) {
            html += `
                <div class="navigation-buttons">
                    <button type="button" class="btn-nav btn-back" onclick="previousSection()">← Back</button>
                    <button type="submit" class="btn-nav btn-primary" id="submitBtn">Submit Data ✓</button>
                </div>
            </div>`;
            
            // Show action panel
            setTimeout(() => {
                const actionPanel = document.getElementById('actionPanel');
                if (actionPanel) actionPanel.style.display = 'block';
            }, 100);
        } else {
            html += `
                <div class="navigation-buttons">
                    <button type="button" class="btn-nav btn-back" onclick="previousSection()">← Back</button>
                    <button type="button" class="btn-nav btn-next" onclick="nextSection()">Next Section →</button>
                </div>
            </div>`;
        }
        
        sectionNum++;
    });
    
    container.innerHTML = html;
    state.totalSections = sectionNum - 1;
    updateProgress();
    
    console.log('Form sections generated. Total sections:', state.totalSections);
}

// ============================================
// SECTION NAVIGATION
// ============================================
function nextSection() {
    const currentSectionEl = document.querySelector(`.form-section[data-section="${state.currentSection}"]`);
    if (!currentSectionEl) return;
    
    const inputs = currentSectionEl.querySelectorAll('input[required], select[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!input.value) {
            isValid = false;
            input.style.borderColor = '#dc3545';
            setTimeout(() => input.style.borderColor = '', 3000);
        }
    });
    
    if (!isValid) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    if (state.currentSection === 1) {
        currentSectionEl.classList.remove('active');
        const formTypeSection = document.querySelector('.form-section[data-section="0"]');
        if (formTypeSection) {
            formTypeSection.classList.add('active');
            state.currentSection = 0;
            updateProgress();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
    }
    
    if (state.currentSection === 0 && !state.formType) {
        showNotification('Please select a form type', 'error');
        return;
    }
    
    if (state.currentSection === 0) {
        currentSectionEl.classList.remove('active');
        state.currentSection = 2;
        const nextSectionEl = document.querySelector(`.form-section[data-section="${state.currentSection}"]`);
        if (nextSectionEl) {
            nextSectionEl.classList.add('active');
            updateProgress();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return;
    }
    
    if (state.currentSection < state.totalSections) {
        currentSectionEl.classList.remove('active');
        state.currentSection++;
        const nextSectionEl = document.querySelector(`.form-section[data-section="${state.currentSection}"]`);
        if (nextSectionEl) {
            nextSectionEl.classList.add('active');
            updateProgress();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
}

function previousSection() {
    if (state.currentSection === 0) {
        document.querySelector('.form-section[data-section="0"]').classList.remove('active');
        state.currentSection = 1;
        document.querySelector('.form-section[data-section="1"]').classList.add('active');
        updateProgress();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }
    
    if (state.currentSection === 2) {
        document.querySelector('.form-section[data-section="2"]').classList.remove('active');
        state.currentSection = 0;
        document.querySelector('.form-section[data-section="0"]').classList.add('active');
        updateProgress();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }
    
    if (state.currentSection > 1) {
        document.querySelector(`.form-section[data-section="${state.currentSection}"]`).classList.remove('active');
        state.currentSection--;
        document.querySelector(`.form-section[data-section="${state.currentSection}"]`).classList.add('active');
        updateProgress();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function updateProgress() {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    if (!progressFill || !progressText) return;
    
    if (state.currentSection === 0) {
        progressText.textContent = 'Selecting Form Type';
        const progress = (1.5 / state.totalSections) * 100;
        progressFill.style.width = progress + '%';
        return;
    }
    
    let displaySection = state.currentSection;
    let displayTotal = state.totalSections;
    
    if (state.currentSection > 0) {
        displaySection = state.currentSection - 1;
        displayTotal = state.totalSections - 1;
    }
    
    const progress = (state.currentSection / state.totalSections) * 100;
    progressFill.style.width = progress + '%';
    progressText.textContent = `Section ${displaySection} of ${displayTotal}`;
}

// ============================================
// ONLINE/OFFLINE HANDLERS
// ============================================
function handleOnlineEvent() {
    state.isOnline = true;
    updateOnlineStatus();
    showNotification('Back online - Syncing data...', 'info');
    syncPendingSubmissions();
}

function handleOfflineEvent() {
    state.isOnline = false;
    updateOnlineStatus();
    showNotification('You are offline - Data will be saved locally', 'info');
}

function updateOnlineStatus() {
    const indicator = document.getElementById('statusIndicator');
    const text = document.getElementById('statusText');
    
    if (!indicator || !text) return;
    
    if (state.isOnline) {
        indicator.className = 'status-indicator online';
        text.textContent = 'Online';
    } else {
        indicator.className = 'status-indicator offline';
        text.textContent = 'Offline';
    }
}

function updatePendingCount() {
    const pendingCount = document.getElementById('pendingCount');
    if (pendingCount) {
        pendingCount.textContent = state.pendingSubmissions.length;
    }
}

// ============================================
// FORM SUBMISSION
// ============================================
async function handleFormSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Form submission started...');
    
    // Use submitToSheets as the default action
    await submitToSheets();
}

/**
 * Submit to Google Sheets
 */
async function submitToSheets() {
    const formData = new FormData(document.getElementById('dataForm'));
    const facilitySelect = document.getElementById('healthFacilitySelect');
    
    const data = {
        timestamp: new Date().toISOString(),
        formType: state.formType,
        year: formData.get('year'),
        month: formData.get('month'),
        region: formData.get('region'),
        district: formData.get('district'),
        chiefdom: formData.get('chiefdom'),
        healthFacility: facilitySelect.value || ''
    };
    
    // Add all variable fields
    if (typeof VARIABLES !== 'undefined') {
        for (const fieldName of Object.keys(VARIABLES)) {
            const value = formData.get(fieldName);
            if (value !== null) {
                data[fieldName] = value;
            }
        }
    }

    console.log('Submitting data:', data);

    if (state.isOnline) {
        await submitToServer(data);
    } else {
        saveOffline(data);
    }
}

/**
 * Async version for use with submitBoth
 */
async function submitToSheetsAsync() {
    const formData = new FormData(document.getElementById('dataForm'));
    const facilitySelect = document.getElementById('healthFacilitySelect');
    
    const data = {
        timestamp: new Date().toISOString(),
        formType: state.formType,
        year: formData.get('year'),
        month: formData.get('month'),
        region: formData.get('region'),
        district: formData.get('district'),
        chiefdom: formData.get('chiefdom'),
        healthFacility: facilitySelect.value || ''
    };
    
    if (typeof VARIABLES !== 'undefined') {
        for (const fieldName of Object.keys(VARIABLES)) {
            const value = formData.get(fieldName);
            if (value !== null) {
                data[fieldName] = value;
            }
        }
    }

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return true;
    } catch (error) {
        console.error('Submit error:', error);
        return false;
    }
}

async function submitToServer(data) {
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
    }

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        console.log('Submission successful');
        showNotification('Data submitted successfully!', 'success');
        clearForm();
        
    } catch (error) {
        console.error('Submit error:', error);
        showNotification('Failed to submit - Saved offline', 'error');
        saveOffline(data);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Data ✓';
        }
    }
}

function saveOffline(data) {
    state.pendingSubmissions.push(data);
    localStorage.setItem('pendingSubmissions', JSON.stringify(state.pendingSubmissions));
    updatePendingCount();
    showNotification('Data saved offline - Will sync when online', 'info');
    console.log('Data saved offline. Pending:', state.pendingSubmissions.length);
    clearForm();
}

async function syncPendingSubmissions() {
    if (state.pendingSubmissions.length === 0) return;

    console.log('Syncing', state.pendingSubmissions.length, 'pending submissions...');
    showNotification('Syncing pending submissions...', 'info');
    
    const successfulSyncs = [];
    
    for (let i = 0; i < state.pendingSubmissions.length; i++) {
        try {
            await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(state.pendingSubmissions[i])
            });
            successfulSyncs.push(i);
        } catch (error) {
            console.error('Sync error for item', i, ':', error);
        }
    }

    if (successfulSyncs.length > 0) {
        state.pendingSubmissions = state.pendingSubmissions.filter((_, index) => 
            !successfulSyncs.includes(index)
        );
        localStorage.setItem('pendingSubmissions', JSON.stringify(state.pendingSubmissions));
        updatePendingCount();
        showNotification(`Successfully synced ${successfulSyncs.length} submission(s)`, 'success');
    }
}

// ============================================
// FORM CLEARING
// ============================================
function clearForm() {
    console.log('Clearing form...');
    
    const dataForm = document.getElementById('dataForm');
    if (dataForm) {
        dataForm.reset();
    }
    
    const districtSelect = document.getElementById('districtSelect');
    const chiefdomSelect = document.getElementById('chiefdomSelect');
    const facilitySelect = document.getElementById('healthFacilitySelect');
    
    if (districtSelect) {
        districtSelect.innerHTML = '<option value="">Select region first...</option>';
        districtSelect.disabled = true;
    }
    if (chiefdomSelect) {
        chiefdomSelect.innerHTML = '<option value="">Select district first...</option>';
        chiefdomSelect.disabled = true;
    }
    if (facilitySelect) {
        facilitySelect.innerHTML = '<option value="">Select chiefdom first...</option>';
        facilitySelect.disabled = true;
    }
    
    clearFacilityFields();
    
    state.formType = null;
    state.currentSection = 1;
    
    const underFiveRadio = document.getElementById('underFiveRadio');
    const generalRadio = document.getElementById('generalRadio');
    if (underFiveRadio) underFiveRadio.checked = false;
    if (generalRadio) generalRadio.checked = false;
    
    generateVariableFields();
    
    document.querySelectorAll('.form-section').forEach(section => section.classList.remove('active'));
    const section1 = document.querySelector('.form-section[data-section="1"]');
    if (section1) {
        section1.classList.add('active');
    }
    
    // Hide action panel
    const actionPanel = document.getElementById('actionPanel');
    if (actionPanel) actionPanel.style.display = 'none';
    
    // Reset month
    populateMonthDropdown();
    
    updateProgress();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// UI HELPERS
// ============================================
function showNotification(message, type) {
    const notification = document.getElementById('notification');
    const text = document.getElementById('notificationText');
    const icon = document.getElementById('notificationIcon');
    
    if (notification && text) {
        notification.className = `notification ${type} show`;
        text.textContent = message;
        
        // Set icon
        if (icon) {
            const icons = {
                success: '✅',
                error: '❌',
                warning: '⚠️',
                info: 'ℹ️'
            };
            icon.textContent = icons[type] || 'ℹ️';
        }

        setTimeout(() => {
            notification.classList.remove('show');
        }, 4000);
    }
    
    console.log(`[${type.toUpperCase()}] ${message}`);
}

function showLoading(text = 'Processing...') {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    
    if (overlay) {
        overlay.classList.add('active');
    }
    if (loadingText) {
        loadingText.textContent = text;
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

// ============================================
// START APPLICATION
// ============================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
