import React from "react";
import { createRoot } from "react-dom/client";
import { GuideSite } from "../app/GuideSite";
import "../app/globals.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GuideSite />
  </React.StrictMode>,
);

