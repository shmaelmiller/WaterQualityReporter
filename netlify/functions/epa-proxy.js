const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    const pwsid = event.queryStringParameters.pwsid;

    if (!pwsid) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'PWSID is required' }),
        };
    }

    try {
        const response = await fetch(`https://data.epa.gov/efservice/WATER_SYSTEM/PWSID/${pwsid}/json`);
        
        if (!response.ok) {
            console.error(`EPA Envirofacts API proxy request failed for PWSID ${pwsid} with status: ${response.status}`);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: `Failed to fetch EPA data: ${response.statusText}` }),
            };
        }

        const data = await response.json();
        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };
    } catch (error) {
        console.error('Error fetching EPA Envirofacts data via proxy:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch EPA Envirofacts data' }),
        };
    }
};
