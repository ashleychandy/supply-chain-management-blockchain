import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App"; // Adjust this path if necessary
import "./index.css"; // Import your CSS file if needed

// Create a root container and render the app
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
