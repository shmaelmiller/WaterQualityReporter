const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    const zip = event.queryStringParameters.zip;

    if (!zip) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Zip code is required' }),
        };
    }

    try {
        const response = await fetch(`https://ewgapi.waterdropfilter.com/zip_systems?zip=${zip}`);
        const data = await response.json();
        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };
    } catch (error) {
        console.error('Error fetching EWG systems data via proxy:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch EWG systems data' }),
        };
    }
};
