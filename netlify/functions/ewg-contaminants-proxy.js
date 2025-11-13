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
        const response = await fetch(`https://ewgapi.waterdropfilter.com/information?pws=${pwsid}`);
        const data = await response.json();
        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };
    } catch (error) {
        console.error('Error fetching EWG contaminants data via proxy:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch EWG contaminants data' }),
        };
    }
};
