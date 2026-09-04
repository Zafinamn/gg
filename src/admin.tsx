import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { AdminDashboard } from "./components/AdminDashboard";

const root = document.getElementById("admin-root");
if (!root) throw new Error("Missing #admin-root");
createRoot(root).render(
  <React.StrictMode>
    <AdminDashboard />
  </React.StrictMode>
);
