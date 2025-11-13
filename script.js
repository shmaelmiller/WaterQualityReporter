document.addEventListener('DOMContentLoaded', () => {
    // Get references to DOM elements
    const zipForm = document.getElementById('zip-form');
    const zipInput = document.getElementById('zip-input');
    const resultsDiv = document.getElementById('results');
    const reportSummaryDiv = document.getElementById('report-summary');
    const reportDetailsDiv = document.getElementById('report-details');

    // Add event listener for form submission
    zipForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent default form submission behavior
        const zip = zipInput.value;
        
        // Validate zip code input
        if (!zip) {
            reportDetailsDiv.innerHTML = '<p class="error">Please enter a valid zip code.</p>';
            return;
        }

        reportSummaryDiv.innerHTML = ''; // Clear previous summary
        reportDetailsDiv.innerHTML = '<p class="loading">Fetching your water report...</p>';

        try {
            // Step 1: Get water systems for the given zip code from our proxy server
            const systemsResponse = await fetch(`/.netlify/functions/ewg-systems-proxy?zip=${zip}`);
            const systemsData = await systemsResponse.json();

            // Check if any water systems were found
            if (!systemsData.systemList || systemsData.systemList.length === 0) {
                reportDetailsDiv.innerHTML = `<p class="error">No water systems found for zip code ${zip}. Please check the zip code and try again.</p>`;
                return;
            }

            // Always display the first system's report immediately
            const mainSystem = systemsData.systemList[0];
            await fetchAndDisplayContaminants(mainSystem.PWS, mainSystem.SystemName, mainSystem);

            // If there are other systems, display them as selectable options
            if (systemsData.systemList.length > 1) {
                displayOtherSystems(systemsData.systemList.slice(1)); // Pass all systems except the first one
            } else {
                // Clear other systems if only one is found
                let otherSystemsContainer = document.getElementById('other-systems-container');
                if (otherSystemsContainer) {
                    otherSystemsContainer.remove();
                }
            }

        } catch (error) {
            console.error('Error fetching water data:', error);
            reportDetailsDiv.innerHTML = '<p class="error">An error occurred while fetching the report. Please try again later.</p>';
        }
    });

    /**
     * Fetches and displays contaminant data for a given PWSID and system name.
     * @param {string} pwsid - The Public Water System ID.
     * @param {string} systemName - The name of the water system.
     * @param {object} systemDetails - The full system object from the API.
     */
    async function fetchAndDisplayContaminants(pwsid, systemName, systemDetails) {
        reportDetailsDiv.innerHTML = `<p class="loading">Fetching report for ${systemName}...</p>`;
        reportSummaryDiv.innerHTML = ''; // Clear summary while loading new report

        try {
            // Initiate both API calls concurrently
            const epaDataPromise = fetchEpaFacilityData(pwsid);
            const contaminantsResponsePromise = fetch(`/.netlify/functions/ewg-contaminants-proxy?pwsid=${pwsid}`);

            const [epaData, contaminantsResponse] = await Promise.all([epaDataPromise, contaminantsResponsePromise]);

            // Parse contaminants response
            const contaminantsData = await contaminantsResponse.json();
            
            const enrichedSystemDetails = { ...systemDetails, ...epaData };

            if (!contaminantsData.information || (!contaminantsData.information.exceedsList.length && !contaminantsData.information.othersList.length)) {
                reportDetailsDiv.innerHTML = `<p>No contaminant data found for ${systemName}. This may mean the water is clean, or data is unavailable.</p>`;
                displayReportSummary(enrichedSystemDetails, { exceedsList: [], othersList: [] }); // Display summary even if no contaminants
                return;
            }
            
            // Client-side re-categorization of contaminants based on EWG Health Guideline
            const actualExceedingList = [];
            const actualOthersList = [];

            const allContaminants = [
                ...(contaminantsData.information.exceedsList || []),
                ...(contaminantsData.information.othersList || [])
            ];

            allContaminants.forEach(contaminant => {
                // Ensure ContaminantHGValue is a valid number and not zero to avoid division by zero or incorrect comparison
                const systemAverage = parseFloat(contaminant.SystemAverage);
                const hgValue = parseFloat(contaminant.ContaminantHGValue);

                if (!isNaN(systemAverage) && !isNaN(hgValue) && hgValue > 0 && systemAverage > hgValue) {
                    actualExceedingList.push(contaminant);
                } else {
                    actualOthersList.push(contaminant);
                }
            });

            const processedInformation = {
                exceedsList: actualExceedingList,
                othersList: actualOthersList
            };

            displayReportSummary(enrichedSystemDetails, processedInformation);
            displayContaminantCards(processedInformation, systemName);
        } catch (error) {
            console.error('Error fetching water data:', error);
            reportDetailsDiv.innerHTML = '<p class="error">An error occurred while fetching the report. Please try again later.</p>';
        }
    }

    /**
     * Fetches population and water source data from EPA Envirofacts API.
     * @param {string} pwsid - The Public Water System ID.
     * @returns {object} An object containing population and water source.
     */
    async function fetchEpaFacilityData(pwsid) {
        // Removed debugging log
        try {
            // Using proxy endpoint for EPA Envirofacts API
            const response = await fetch(`/.netlify/functions/epa-proxy?pwsid=${pwsid}`);
            
            if (!response.ok) {
                console.error(`Proxy request for EPA Envirofacts API failed for PWSID ${pwsid} with status: ${response.status}`);
                return { PopulationServed: 'N/A', SourceWaterType: 'N/A' };
            }

            const data = await response.json();
            // Removed debugging log

            let population = 'N/A';
            let waterSource = 'N/A';

            // Envirofacts API often returns an array of results
            if (data && data.length > 0) {
                const systemInfo = data[0]; // Take the first result
                
                if (systemInfo.population_served_count) { // Corrected field name
                    population = parseInt(systemInfo.population_served_count).toLocaleString();
                }
                if (systemInfo.primary_source_code) { // Corrected field name
                    switch (systemInfo.primary_source_code) {
                        case 'GW':
                            waterSource = 'Groundwater';
                            break;
                        case 'SW':
                            waterSource = 'Surface Water';
                            break;
                        case 'GU':
                            waterSource = 'Groundwater Under Direct Influence of Surface Water';
                            break;
                        case 'C':
                            waterSource = 'Consecutive Connection';
                            break;
                        default:
                            waterSource = systemInfo.primary_source_code; // Use code if unknown
                    }
                }
            }
            return { PopulationServed: population, SourceWaterType: waterSource };
        } catch (error) {
            console.error('Error fetching EPA Envirofacts data via proxy:', error);
            return { PopulationServed: 'N/A', SourceWaterType: 'N/A' };
        }
    }

    /**
     * Displays the report summary information.
     * @param {object} system - The water system object, potentially enriched with EPA data.
     * @param {object} information - The contaminant information object.
     */
    function displayReportSummary(system, information) {
        reportSummaryDiv.innerHTML = ''; // Clear previous summary
        const totalExceeding = information.exceedsList ? information.exceedsList.length : 0;
        const totalContaminants = (information.exceedsList ? information.exceedsList.length : 0) + (information.othersList ? information.othersList.length : 0);

        const summaryHtml = `
            <div class="summary-header">
                <div class="exceeds-badge">
                    <span class="exceeds-count">${totalExceeding}</span>
                    <span class="exceeds-text">Contaminants EXCEED EWG HEALTH GUIDELINES</span>
                </div>
                <div class="total-contaminants">
                    ${totalContaminants} Total Contaminants in Your Water
                </div>
            </div>
            <div class="summary-cards">
                <div class="summary-card">
                    <i class="fas fa-tint icon-blue"></i>
                    <h4>Water Provider:</h4>
                    <p>${system.SystemName}</p>
                    <p class="small-text">${system.PWS}</p>
                </div>
                <div class="summary-card">
                    <i class="fas fa-users icon-blue"></i>
                    <h4>Population Affected:</h4>
                    <p>${system.PopulationServed || 'N/A'}</p>
                </div>
                <div class="summary-card">
                    <i class="fas fa-water icon-blue"></i>
                    <h4>Water Source:</h4>
                    <p>${system.SourceWaterType || 'N/A'}</p>
                </div>
            </div>
        `;
        reportSummaryDiv.innerHTML = summaryHtml;
    }

    /**
     * Displays contaminant cards with toggle functionality.
     * @param {object} information - The contaminant information object from the API.
     * @param {string} systemName - The name of the water system.
     */
    function displayContaminantCards(information, systemName) {
        reportDetailsDiv.innerHTML = `
            <h2>Contaminants Detected in ${systemName}</h2>
            <div class="contaminant-toggle-buttons">
                <button id="exceeds-btn" class="toggle-btn active">Exceeds Guidelines</button>
                <button id="others-btn" class="toggle-btn">Others Detected</button>
            </div>
            <div id="contaminant-cards-container" class="contaminant-cards-grid"></div>
        `;

        const cardsContainer = document.getElementById('contaminant-cards-container');
        const exceedsBtn = document.getElementById('exceeds-btn');
        const othersBtn = document.getElementById('others-btn');

        const renderCards = (list, isExceeding) => {
            cardsContainer.innerHTML = ''; // Clear previous cards
            if (list && list.length > 0) {
                list.forEach(contaminant => {
                    const multiplier = (contaminant.SystemAverage && contaminant.ContaminantHGValue && contaminant.ContaminantHGValue !== 0) 
                                       ? (contaminant.SystemAverage / contaminant.ContaminantHGValue).toFixed(2) 
                                       : null;
                    const healthRiskColor = isExceeding ? 'red' : 'green'; // Simple color for now

                    const cardHtml = `
                        <div class="contaminant-card ${isExceeding ? 'exceeds' : ''}">
                            <h3>${contaminant.ContaminantName}</h3>
                            <p class="health-risk" style="color: ${healthRiskColor};">Health Risk: ${contaminant.ContaminantEffect || 'N/A'}</p>
                            ${isExceeding && multiplier ? `<div class="multiplier-badge">${multiplier}X</div>` : ''}
                            <div class="contaminant-levels">
                                <p><strong>Your Water:</strong> <span>${contaminant.SystemAverage} ${contaminant.ContaminantDisplayUnits}</span></p>
                                <p><strong>EWG Health Guideline:</strong> <span>${contaminant.ContaminantHGValue} ${contaminant.ContaminantDisplayUnits}</span></p>
                                <p><strong>Legal Limit:</strong> <span>${contaminant.ContaminantMCLValue} ${contaminant.ContaminantDisplayUnits}</span></p>
                            </div>
                        </div>
                    `;
                    cardsContainer.innerHTML += cardHtml;
                });
            } else {
                cardsContainer.innerHTML = `<p class="no-contaminants">No ${isExceeding ? 'exceeding' : 'other'} contaminants found for this system.</p>`;
            }
        };

        // Initial render
        renderCards(information.exceedsList, true);

        exceedsBtn.addEventListener('click', () => {
            exceedsBtn.classList.add('active');
            othersBtn.classList.remove('active');
            renderCards(information.exceedsList, true);
        });

        othersBtn.addEventListener('click', () => {
            othersBtn.classList.add('active');
            exceedsBtn.classList.remove('active');
            renderCards(information.othersList, false);
        });
    }

    /**
     * Displays a list of other water systems for the user to choose from.
     * @param {Array} otherSystemsList - An array of water system objects (excluding the primary one).
     */
    function displayOtherSystems(otherSystemsList) {
        let otherSystemsContainer = document.getElementById('other-systems-container');
        if (!otherSystemsContainer) {
            otherSystemsContainer = document.createElement('div');
            otherSystemsContainer.id = 'other-systems-container';
            otherSystemsContainer.className = 'other-systems-container';
            resultsDiv.appendChild(otherSystemsContainer); // Append to the main results div
        }
        otherSystemsContainer.innerHTML = '<h3>VIEW OTHER WATER PROVIDERS IN YOUR AREA</h3>';
        
        const ul = document.createElement('ul');
        ul.className = 'other-system-list';

        otherSystemsList.forEach(system => {
            const li = document.createElement('li');
            li.className = 'other-system-item';
            li.innerHTML = `
                <span>${system.SystemName}</span>
                <button class="select-other-system-btn" data-pwsid="${system.PWS}" data-systemname="${system.SystemName}">View Report</button>
            `;
            ul.appendChild(li);
        });
        otherSystemsContainer.appendChild(ul);
        
        // Add event listeners to the "View Report" buttons for other systems
        document.querySelectorAll('.select-other-system-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const pwsid = event.target.dataset.pwsid;
                const systemName = event.target.dataset.systemname;
                // Clear previous summary and details, then fetch and display new report
                reportSummaryDiv.innerHTML = '';
                reportDetailsDiv.innerHTML = '';
                fetchAndDisplayContaminants(pwsid, systemName, otherSystemsList.find(s => s.PWS === pwsid));
            });
        });
    }
});
