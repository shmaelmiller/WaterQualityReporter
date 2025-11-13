const express = require('express');
const fetch = require('node-fetch'); // Used for making HTTP requests
const app = express();
const port = 3000;

// Serve static files from the current directory (e.g., index.html, script.js, style.css)
app.use(express.static(__dirname));

/**
 * Proxy endpoint to fetch water systems for a given zip code from the Waterdrop EWG API.
 * This bypasses CORS issues by making the request from the server.
 */
app.get('/get-systems', async (req, res) => {
    const zip = req.query.zip;
    if (!zip) {
        return res.status(400).json({ error: 'Zip code is required' });
    }
    try {
        // Make a request to the external Waterdrop EWG API
        const response = await fetch(`https://ewgapi.waterdropfilter.com/zip_systems?zip=${zip}`);
        const data = await response.json();
        res.json(data); // Send the data back to the client
    } catch (error) {
        console.error('Error fetching systems data:', error);
        res.status(500).json({ error: 'Failed to fetch systems data' });
    }
});

/**
 * Proxy endpoint to fetch contaminant information for a specific Public Water System ID (PWSID).
 * This bypasses CORS issues by making the request from the server.
 */
app.get('/get-contaminants', async (req, res) => {
    const pwsid = req.query.pwsid;
    if (!pwsid) {
        return res.status(400).json({ error: 'PWSID is required' });
    }
    try {
        // Make a request to the external Waterdrop EWG API
        const response = await fetch(`https://ewgapi.waterdropfilter.com/information?pws=${pwsid}`);
        const data = await response.json();
        res.json(data); // Send the data back to the client
    } catch (error) {
        console.error('Error fetching contaminants data:', error);
        res.status(500).json({ error: 'Failed to fetch contaminants data' });
    }
});

/**
 * Proxy endpoint to fetch water system data (population, source) from EPA Envirofacts API.
 * This bypasses CORS issues by making the request from the server.
 */
app.get('/get-epa-data', async (req, res) => {
    const pwsid = req.query.pwsid;
    if (!pwsid) {
        return res.status(400).json({ error: 'PWSID is required' });
    }
    try {
        // Make a request to the EPA Envirofacts API
        const response = await fetch(`https://data.epa.gov/efservice/WATER_SYSTEM/PWSID/${pwsid}/json`);
        
        if (!response.ok) {
            console.error(`EPA Envirofacts API proxy request failed for PWSID ${pwsid} with status: ${response.status}`);
            return res.status(response.status).json({ error: `Failed to fetch EPA data: ${response.statusText}` });
        }

        const data = await response.json();
        res.json(data); // Send the data back to the client
    } catch (error) {
        console.error('Error fetching EPA Envirofacts data via proxy:', error);
        res.status(500).json({ error: 'Failed to fetch EPA Envirofacts data' });
    }
});

// Start the proxy server
app.listen(port, () => {
    console.log(`Proxy server listening at http://localhost:${port}`);
});