// ============================================
// DHIS2 INTEGRATION MODULE
// Handles data push and email notifications
// ============================================

// DHIS2 Configuration
const DHIS2_CONFIG = {
    serverUrl: 'https://icf-nmdr.onrender.com',
    username: 'admin',
    password: 'SajeedIslam@2025',
    dataSetId: 'GlBr79yV3OB',
    
    // Proxy for CORS (Google Apps Script Web App URL)
    proxy: {
        enabled: true,
        url: '' // Set your proxy URL here after deployment
    },
    
    // Email configuration
    email: {
        enabled: true,
        recipients: ['mohamed@icf-sl.org'],
        scriptUrl: '' // Set your email script URL here
    }
};

// Data Element Mapping - Maps form field names to DHIS2 data element IDs
const DATA_ELEMENT_MAPPING = {
    // Under Five (0-59 months) - Malaria
    'fever_suspected_malaria': 'KMsiPDGdG6h',
    'rdt_positive': 'GJNa6pX9iyo',
    'rdt_negative': 't3YbzxciBUy',
    'microscopy_positive': 'oAcB37ZpYz3',
    'microscopy_negative': 'x8KuOs9fWK6',
    'act_less_24h': 'tVQsovBqVHk',
    'act_more_24h': 'Tyyg6PWzWpD',
    'treated_without_act_less_24h': 'FbNWIAHcj7T',
    'treated_without_act_more_24h': 'VpTwejnpCPO',
    
    // General (5+ years) - Malaria
    'fever_cases_gen': 'EY9E1SCzLPt',
    'fever_tested_rdt_positive_gen': 'JdNf7ZPtExJ',
    'fever_tested_rdt_negative_gen': 'KEC2JAFzya1',
    'fever_tested_microscopy_positive_gen': 'PyHoMQZLUSg',
    'fever_tested_microscopy_negative_gen': 'GulbIsJ3rwh',
    'malaria_act_less24h_gen': 'AVtqqqMc5pp',
    'malaria_act_more24h_gen': 'upUxPYA682u',
    'malaria_without_act_less24h_gen': 'Maygf7NAgLV',
    'malaria_without_act_more24h_gen': 'k6KFXU9E6eP',
    'severe_malaria_gen': 'xxxx', // Add actual ID
    
    // STI
    'sti_genital_discharge_gen': 'xxxSTI1',
    'sti_genital_ulcer_gen': 'xxxSTI2',
    'sti_pid_gen': 'xxxSTI3',
    
    // Mental Health
    'mental_disorder': 'xxxMH1',
    'epilepsy': 'xxxMH2',
    'mental_disorder_gen': 'xxxMH3',
    'epilepsy_gen': 'xxxMH4',
    
    // NTD
    'schistosomiasis': 'mDmgfQtJUUd',
    'trachoma': 'f64KLpGyFNl',
    'worm_infestation': 'bhXa9qMwXEN',
    'worm_infestation_gen': 'bhXa9qMwXEN',
    'onchocerciasis': 'geGg9czFfSh',
    'animal_bites': 'GAk7ZQpjCfZ',
    'snake_bites': 'GAk7ZQpjCfZ',
    
    // Child Health - Diarrhoea
    'diarrhoea_ors_zinc': 'xxxDIA1',
    'diarrhoea_ors_only': 'xxxDIA2',
    
    // Child Health - ARI/Pneumonia
    'ari_with_antibiotic': 'xxxARI1',
    'ari_without_antibiotic': 'xxxARI2',
    'pneumonia_with_antibiotic': 'xxxPN1',
    'pneumonia_without_antibiotic': 'xxxPN2',
    
    // Neonatal
    'asphyxia': 'xxxNEO1',
    'hypothermia': 'xxxNEO2',
    'respiratory_distress': 'xxxNEO3',
    'sepsis': 'xxxNEO4',
    'jaundice': 'xxxNEO5',
    'congenital_abnormality': 'xxxNEO6',
    'prematurity': 'xxxNEO7',
    
    // Trauma
    'wounds_rta': 'XyMkMH62a5e',
    'wounds_non_rta': 'JPeVDDvF5Zk',
    'burns': 'xxxBURN',
    'wounds_trauma_gen': 'XyMkMH62a5e',
    'burns_gen': 'xxxBURN',
    
    // Other conditions
    'eye_infection': 'tQ2mWuuwAME',
    'eye_infection_gen': 'tQ2mWuuwAME',
    'hepatitis': 'xxxHEP',
    'hepatitis_gen': 'xxxHEP',
    'skin_infection': 'xxxSKIN',
    'tuberculosis': 'xxxTB',
    'aids': 'xxxAIDS',
    'hypertension_gen': 'xxxHTN',
    'diabetes_gen': 'xxxDM',
    
    // Malnutrition
    'moderate_malnutrition': 'xxxMAL1',
    'severe_malnutrition': 'xxxMAL2',
    'moderate_malnutrition_gen': 'xxxMAL1',
    'severe_malnutrition_gen': 'xxxMAL2',
    'anaemia': 'xxxANE',
    'anaemia_gen': 'xxxANE',
    
    // GBV
    'gbv': 'xxxGBV1',
    'sexual_assault': 'xxxGBV2',
    'gbv_gen': 'xxxGBV1',
    'sexual_assault_gen': 'xxxGBV2',
    
    // Special Categories
    'disability': 'xxxDIS',
    'evd_survivor': 'xxxEVD',
    'adverse_drug_reaction': 'xxxADR',
    'adverse_drug_reaction_gen': 'xxxADR',
    
    // Death
    'death': 'xxxDEATH',
    'death_gen': 'xxxDEATH'
};

// Org Unit Cache
let orgUnitCache = {};
let orgUnitsByName = {};

// ============================================
// DHIS2 API FUNCTIONS
// ============================================

/**
 * Make authenticated request to DHIS2
 */
async function dhis2Request(endpoint, method = 'GET', payload = null) {
    const targetUrl = `${DHIS2_CONFIG.serverUrl}/api/${endpoint}`;
    
    const headers = {
        'Authorization': 'Basic ' + btoa(`${DHIS2_CONFIG.username}:${DHIS2_CONFIG.password}`),
        'Content-Type': 'application/json'
    };
    
    try {
        // Use proxy if enabled
        if (DHIS2_CONFIG.proxy.enabled && DHIS2_CONFIG.proxy.url) {
            const proxyUrl = `${DHIS2_CONFIG.proxy.url}?url=${encodeURIComponent(targetUrl)}&auth=${btoa(`${DHIS2_CONFIG.username}:${DHIS2_CONFIG.password}`)}`;
            
            const options = {
                method: method === 'GET' ? 'GET' : 'POST',
                headers: { 'Content-Type': 'application/json' }
            };
            
            if (payload) {
                options.body = JSON.stringify(payload);
            }
            
            const response = await fetch(proxyUrl, options);
            return response;
        }
        
        // Direct request
        const options = {
            method: method,
            headers: headers,
            mode: 'cors'
        };
        
        if (payload) {
            options.body = JSON.stringify(payload);
        }
        
        return await fetch(targetUrl, options);
        
    } catch (error) {
        console.error('DHIS2 Request Error:', error);
        throw error;
    }
}

/**
 * Test DHIS2 connection
 */
async function testDHIS2Connection() {
    try {
        updateDHIS2Status('Connecting...');
        
        const response = await dhis2Request('system/info.json');
        
        if (response.ok) {
            const data = await response.json();
            updateDHIS2Status('Connected', true);
            console.log('DHIS2 Connected:', data.version);
            return { success: true, version: data.version };
        } else {
            updateDHIS2Status('Failed', false);
            return { success: false, error: `HTTP ${response.status}` };
        }
    } catch (error) {
        updateDHIS2Status('Offline', false);
        console.error('DHIS2 Connection Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update DHIS2 status display
 */
function updateDHIS2Status(status, connected = null) {
    const statusEl = document.getElementById('dhis2Status');
    if (statusEl) {
        statusEl.textContent = status;
        statusEl.className = 'dhis2-status';
        
        if (connected === true) {
            statusEl.classList.add('connected');
        } else if (connected === false) {
            statusEl.classList.add('disconnected');
        }
    }
}

/**
 * Initialize org units from DHIS2
 */
async function initializeOrgUnits() {
    try {
        showLoading('Loading facilities from DHIS2...');
        
        const response = await dhis2Request('organisationUnits.json?fields=id,displayName,name,shortName,code&paging=false');
        
        if (response.ok) {
            const data = await response.json();
            const orgUnits = data.organisationUnits || [];
            
            // Build lookup cache
            orgUnitCache = {};
            orgUnitsByName = {};
            
            orgUnits.forEach(ou => {
                orgUnitCache[ou.id] = ou;
                
                // Index by various name forms (case-insensitive)
                const names = [ou.displayName, ou.name, ou.shortName, ou.code].filter(n => n);
                names.forEach(name => {
                    const key = name.toLowerCase().trim();
                    if (!orgUnitsByName[key]) {
                        orgUnitsByName[key] = ou;
                    }
                });
            });
            
            console.log(`Loaded ${orgUnits.length} org units from DHIS2`);
            hideLoading();
            return { success: true, count: orgUnits.length };
        } else {
            hideLoading();
            return { success: false, error: 'Failed to fetch org units' };
        }
    } catch (error) {
        hideLoading();
        console.error('Error loading org units:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Find org unit ID by facility name
 */
function findOrgUnitId(facilityName) {
    if (!facilityName) return null;
    
    const searchKey = facilityName.toLowerCase().trim();
    
    // Direct match
    if (orgUnitsByName[searchKey]) {
        return orgUnitsByName[searchKey].id;
    }
    
    // Try common abbreviation expansions
    const expansions = {
        'chc': 'Community Health Centre',
        'mchp': 'Maternal and Child Health Post',
        'chp': 'Community Health Post',
        'chu': 'Community Health Unit',
        'phu': 'Peripheral Health Unit'
    };
    
    // Partial matching
    for (const [key, ou] of Object.entries(orgUnitsByName)) {
        if (key.includes(searchKey) || searchKey.includes(key)) {
            return ou.id;
        }
    }
    
    return null;
}

/**
 * Convert form data to DHIS2 data values
 * IMPORTANT: This includes 0 values!
 */
function convertToDataValues(formData) {
    const dataValues = [];
    
    for (const [fieldName, value] of Object.entries(formData)) {
        // Skip non-data fields
        if (['timestamp', 'formType', 'year', 'month', 'region', 'district', 
             'chiefdom', 'healthFacility', 'healthFacilityName'].includes(fieldName)) {
            continue;
        }
        
        // Get DHIS2 data element ID
        const dataElementId = DATA_ELEMENT_MAPPING[fieldName];
        if (!dataElementId || dataElementId.startsWith('xxx')) {
            continue; // Skip unmapped fields
        }
        
        // Convert value
        let dhis2Value = value;
        
        // Handle Yes/No values
        if (value === 'Yes') {
            dhis2Value = '1';
        } else if (value === 'No') {
            dhis2Value = '0';
        }
        
        // IMPORTANT: Include 0 values - don't skip them!
        // Only skip null, undefined, or empty strings
        if (dhis2Value !== null && dhis2Value !== undefined && dhis2Value !== '') {
            dataValues.push({
                dataElement: dataElementId,
                value: String(dhis2Value)
            });
        }
    }
    
    return dataValues;
}

/**
 * Push data to DHIS2
 */
async function pushToDHIS2() {
    // Get form data
    const formData = collectFormData();
    
    if (!formData) {
        showNotification('Please complete the form first', 'error');
        return;
    }
    
    // Validate required fields
    if (!formData.healthFacility) {
        showNotification('Health facility is required', 'error');
        return;
    }
    
    showLoading('Pushing data to DHIS2...');
    
    try {
        // Find org unit ID
        let orgUnitId = findOrgUnitId(formData.healthFacility);
        
        if (!orgUnitId) {
            // Try to load org units if not cached
            if (Object.keys(orgUnitsByName).length === 0) {
                await initializeOrgUnits();
                orgUnitId = findOrgUnitId(formData.healthFacility);
            }
        }
        
        if (!orgUnitId) {
            hideLoading();
            showNotification(`Facility "${formData.healthFacility}" not found in DHIS2`, 'error');
            showDHIS2Modal('error', `Could not find org unit for: ${formData.healthFacility}`);
            return;
        }
        
        // Build period (YYYYMM format)
        const monthMap = {
            'January': '01', 'February': '02', 'March': '03', 'April': '04',
            'May': '05', 'June': '06', 'July': '07', 'August': '08',
            'September': '09', 'October': '10', 'November': '11', 'December': '12'
        };
        const period = formData.year + (monthMap[formData.month] || '01');
        
        // Convert to data values (includes 0 values)
        const dataValues = convertToDataValues(formData);
        
        if (dataValues.length === 0) {
            hideLoading();
            showNotification('No data values to submit', 'warning');
            return;
        }
        
        // Build payload
        const payload = {
            dataSet: DHIS2_CONFIG.dataSetId,
            completeDate: new Date().toISOString().split('T')[0],
            period: period,
            orgUnit: orgUnitId,
            dataValues: dataValues
        };
        
        console.log('DHIS2 Payload:', payload);
        
        // Submit to DHIS2
        const response = await dhis2Request('dataValueSets', 'POST', payload);
        
        hideLoading();
        
        if (response.ok) {
            const result = await response.json();
            
            if (result.status === 'SUCCESS' || result.status === 'OK' || result.status === 'WARNING') {
                showNotification(`Successfully pushed ${dataValues.length} values to DHIS2!`, 'success');
                showDHIS2Modal('success', {
                    facility: formData.healthFacility,
                    period: period,
                    valuesCount: dataValues.length,
                    result: result
                });
                
                // Send email notification if enabled
                if (document.getElementById('sendEmailNotification')?.checked) {
                    await sendEmailNotification(formData, result);
                }
                
                return { success: true, result };
            } else {
                showNotification('DHIS2 submission had issues', 'warning');
                showDHIS2Modal('warning', result);
                return { success: false, result };
            }
        } else {
            const errorText = await response.text();
            showNotification('DHIS2 submission failed', 'error');
            showDHIS2Modal('error', errorText);
            return { success: false, error: errorText };
        }
        
    } catch (error) {
        hideLoading();
        console.error('DHIS2 Push Error:', error);
        showNotification(`DHIS2 Error: ${error.message}`, 'error');
        showDHIS2Modal('error', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Submit to both Google Sheets and DHIS2
 */
async function submitBoth() {
    showLoading('Submitting to both systems...');
    
    // Submit to Google Sheets first
    const sheetsResult = await submitToSheetsAsync();
    
    // Then push to DHIS2
    const dhis2Result = await pushToDHIS2();
    
    hideLoading();
    
    if (sheetsResult && dhis2Result?.success) {
        showNotification('Successfully submitted to both systems!', 'success');
        clearForm();
    }
}

/**
 * Collect form data
 */
function collectFormData() {
    const form = document.getElementById('dataForm');
    if (!form) return null;
    
    const formData = new FormData(form);
    const data = {
        timestamp: new Date().toISOString(),
        formType: state.formType,
        year: formData.get('year'),
        month: formData.get('month'),
        region: formData.get('region'),
        district: formData.get('district'),
        chiefdom: formData.get('chiefdom'),
        healthFacility: document.getElementById('healthFacilitySelect')?.value || ''
    };
    
    // Add all form fields
    for (const [key, value] of formData.entries()) {
        if (!data[key]) {
            data[key] = value;
        }
    }
    
    return data;
}

/**
 * Show DHIS2 modal with results
 */
function showDHIS2Modal(status, data) {
    const modal = document.getElementById('dhis2Modal');
    const body = document.getElementById('dhis2ModalBody');
    
    if (!modal || !body) return;
    
    let html = '';
    
    if (status === 'success') {
        html = `
            <div class="modal-status success">
                <span class="status-icon">✅</span>
                <h4>Data Successfully Pushed!</h4>
            </div>
            <div class="modal-details">
                <p><strong>Facility:</strong> ${data.facility}</p>
                <p><strong>Period:</strong> ${data.period}</p>
                <p><strong>Values Submitted:</strong> ${data.valuesCount}</p>
                <p><strong>Status:</strong> ${data.result.status}</p>
            </div>
        `;
    } else if (status === 'warning') {
        html = `
            <div class="modal-status warning">
                <span class="status-icon">⚠️</span>
                <h4>Submission Completed with Warnings</h4>
            </div>
            <div class="modal-details">
                <pre>${JSON.stringify(data, null, 2)}</pre>
            </div>
        `;
    } else {
        html = `
            <div class="modal-status error">
                <span class="status-icon">❌</span>
                <h4>Submission Failed</h4>
            </div>
            <div class="modal-details">
                <p>${typeof data === 'string' ? data : JSON.stringify(data)}</p>
            </div>
        `;
    }
    
    body.innerHTML = html;
    modal.classList.add('active');
}

/**
 * Close modal
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// ============================================
// EMAIL NOTIFICATION FUNCTIONS
// ============================================

/**
 * Generate email HTML with ICF branding
 */
function generateEmailHTML(formData, dhis2Result) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    const timeStr = now.toLocaleTimeString('en-GB');
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
        }
        .header {
            background: linear-gradient(135deg, #1a5276 0%, #2980b9 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }
        .header img {
            height: 60px;
            margin: 0 15px;
        }
        .header h1 {
            margin: 15px 0 5px 0;
            font-size: 24px;
        }
        .header p {
            margin: 0;
            opacity: 0.9;
            font-size: 14px;
        }
        .content {
            background: #f8f9fa;
            padding: 30px;
            border: 1px solid #ddd;
        }
        .success-badge {
            background: #27ae60;
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            display: inline-block;
            font-weight: bold;
            margin-bottom: 20px;
        }
        .details-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
        }
        .details-table th {
            background: #34495e;
            color: white;
            padding: 12px;
            text-align: left;
        }
        .details-table td {
            padding: 12px;
            border-bottom: 1px solid #eee;
        }
        .details-table tr:last-child td {
            border-bottom: none;
        }
        .highlight {
            background: #e8f6f3;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #1abc9c;
            margin: 20px 0;
        }
        .footer {
            background: #2c3e50;
            color: white;
            padding: 25px;
            text-align: center;
            border-radius: 0 0 10px 10px;
        }
        .footer img {
            height: 40px;
            margin: 0 10px;
            opacity: 0.9;
        }
        .footer p {
            margin: 10px 0 0 0;
            font-size: 12px;
            opacity: 0.8;
        }
        .footer a {
            color: #3498db;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="header">
        <img src="https://icf-sl.org/nmcp-logo.png" alt="NMCP">
        <img src="https://icf-sl.org/icf-logo.png" alt="ICF-SL">
        <h1>DHIS2 Data Submission Notification</h1>
        <p>National Malaria Control Programme | ICF Sierra Leone</p>
    </div>
    
    <div class="content">
        <div style="text-align: center;">
            <span class="success-badge">✅ SUCCESSFUL SUBMISSION</span>
        </div>
        
        <p>Dear Team,</p>
        
        <p>A new data submission has been successfully pushed to DHIS2. Below are the details:</p>
        
        <table class="details-table">
            <tr>
                <th colspan="2">📋 Submission Details</th>
            </tr>
            <tr>
                <td><strong>Date & Time</strong></td>
                <td>${dateStr} at ${timeStr}</td>
            </tr>
            <tr>
                <td><strong>Form Type</strong></td>
                <td>${formData.formType === 'under_five' ? 'Under Five Register' : 'General Form'}</td>
            </tr>
            <tr>
                <td><strong>Health Facility</strong></td>
                <td>${formData.healthFacility}</td>
            </tr>
            <tr>
                <td><strong>Region</strong></td>
                <td>${formData.region}</td>
            </tr>
            <tr>
                <td><strong>District</strong></td>
                <td>${formData.district}</td>
            </tr>
            <tr>
                <td><strong>Chiefdom</strong></td>
                <td>${formData.chiefdom}</td>
            </tr>
            <tr>
                <td><strong>Period</strong></td>
                <td>${formData.month} ${formData.year}</td>
            </tr>
        </table>
        
        <div class="highlight">
            <strong>📊 DHIS2 Status:</strong> ${dhis2Result?.status || 'SUCCESS'}<br>
            <strong>Values Submitted:</strong> ${dhis2Result?.importCount?.imported || 'N/A'} imported, 
            ${dhis2Result?.importCount?.updated || '0'} updated
        </div>
        
        <p>You can verify this submission by logging into DHIS2 and checking the data entry for the specified facility and period.</p>
        
        <p style="margin-top: 30px;">Best regards,<br>
        <strong>ICF-SL Data Collection System</strong></p>
    </div>
    
    <div class="footer">
        <img src="https://icf-sl.org/nmcp-logo-white.png" alt="NMCP">
        <img src="https://icf-sl.org/icf-logo-white.png" alt="ICF-SL">
        <p>National Malaria Control Programme | Informatics Consultancy Firm - Sierra Leone</p>
        <p>📧 <a href="mailto:info@icf-sl.org">info@icf-sl.org</a> | 🌐 <a href="https://icf-sl.org">www.icf-sl.org</a></p>
        <p>© 2025 ICF-SL. All rights reserved.</p>
    </div>
</body>
</html>
    `;
}

/**
 * Send email notification via Google Apps Script
 */
async function sendEmailNotification(formData, dhis2Result) {
    if (!DHIS2_CONFIG.email.enabled || !DHIS2_CONFIG.email.scriptUrl) {
        console.log('Email notifications not configured');
        return;
    }
    
    try {
        const emailHTML = generateEmailHTML(formData, dhis2Result);
        
        const payload = {
            action: 'sendEmail',
            to: DHIS2_CONFIG.email.recipients.join(','),
            subject: `[DHIS2] Data Submitted - ${formData.healthFacility} - ${formData.month} ${formData.year}`,
            htmlBody: emailHTML
        };
        
        const response = await fetch(DHIS2_CONFIG.email.scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        console.log('Email notification sent');
        showNotification('Email notification sent!', 'success');
        
    } catch (error) {
        console.error('Email notification error:', error);
        showNotification('Failed to send email notification', 'warning');
    }
}

/**
 * Preview email before sending
 */
function previewEmail(formData, dhis2Result) {
    const modal = document.getElementById('emailModal');
    const body = document.getElementById('emailPreviewBody');
    
    if (!modal || !body) return;
    
    body.innerHTML = generateEmailHTML(formData, dhis2Result);
    modal.classList.add('active');
}

// ============================================
// INITIALIZATION
// ============================================

// Test DHIS2 connection on load
document.addEventListener('DOMContentLoaded', () => {
    // Delay to allow main.js to initialize
    setTimeout(() => {
        testDHIS2Connection();
    }, 2000);
});

console.log('DHIS2 Module loaded');
