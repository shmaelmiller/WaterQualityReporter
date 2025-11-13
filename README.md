# Water Quality Report Application

This is a simple web application that allows users to check the water quality in their area by entering a zip code. The application fetches water quality data from the Waterdrop EWG API (via a proxy server) and displays it in a user-friendly format.

## Features

-   **Zip Code Search:** Enter a zip code to get a water quality report.
-   **Contaminant Information:** Displays a list of contaminants found in the water, including levels, EWG health guidelines, legal limits, and potential health effects.

## Technologies Used

-   **Frontend:** HTML, CSS, JavaScript
-   **Backend (Proxy Server):** Node.js, Express.js
-   **API:** Waterdrop EWG API (proxied)

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd TDS
    ```

2.  **Install dependencies for the proxy server:**
    ```bash
    npm install
    ```

3.  **Start the proxy server:**
    ```bash
    npm start
    ```
    The server will start on `http://localhost:3000`.

4.  **Open the application in your browser:**
    Navigate to `http://localhost:3000` in your web browser.

## Usage

1.  Enter a 5-digit zip code in the input field.
2.  Click the "Get My Report" button.
3.  The water quality report for the entered zip code will be displayed below the form.

## Project Structure

-   `index.html`: The main HTML file for the application.
-   `style.css`: Contains the CSS styles for the application.
-   `script.js`: Contains the frontend JavaScript logic for fetching and displaying data.
-   `server.js`: The Node.js Express server that acts as a proxy to the Waterdrop EWG API.
-   `package.json`: Defines project metadata and dependencies for the Node.js server.

## API Endpoints (Proxy Server)

The `server.js` acts as a proxy for the following Waterdrop EWG API endpoints:

-   `/get-systems?zip=<zip_code>`: Fetches a list of water systems for the given zip code.
-   `/get-contaminants?pwsid=<pwsid>`: Fetches detailed contaminant information for a specific Public Water System ID (PWSID).

## Development Notes

-   **CORS Bypass:** The Node.js proxy server is essential to bypass Cross-Origin Resource Sharing (CORS) restrictions that would otherwise prevent the frontend JavaScript from directly accessing the Waterdrop EWG API.
-   **API Source:** The data is sourced from a private API endpoint used by `waterdropfilter.com`. While this API is currently functional, its long-term availability and terms of use should be considered for production environments.
-   **Error Handling:** Basic error handling is implemented to inform the user if data cannot be fetched or if a zip code is invalid.
-   **Frontend Logic:** The `script.js` file handles form submission, API calls to the proxy server, and dynamic rendering of the water quality report.
-   **DOM Content Loaded:** The `defer` attribute is used on the `<script>` tag in `index.html` to ensure the JavaScript executes after the HTML document has been parsed, preventing `ReferenceError` issues.
