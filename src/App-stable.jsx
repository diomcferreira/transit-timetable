import { useEffect, useMemo, useRef, useState } from "react";

const CONFIG = {
  osloBoundFerryStopPlaceId: "NSR:StopPlace:58368",
  nesoddenBoundFerryStopPlaceId: "NSR:StopPlace:58382",

  osloBoundFerryLinePublicCode: "B10",
  nesoddenBoundFerryLinePublicCode: "B10",

  osloBoundDestinationText: "Aker",
  nesoddenBoundDestinationText: "Nesoddtangen",

  busStopPlaceId: "NSR:StopPlace:3280",
  busDestinationText: "Nesoddtangen",
  busWalkMinutes: 3,

  travelMinutes: {
    bike: 11,
    car: 7,
  },

  clientName: "dio-wallboard",
  refreshMs: 30000,
  ferryTimeRangeSeconds: 43200,
  ferryNumberOfDepartures: 30,
  busTimeRangeSeconds: 7200,
};

const FALLBACK = {
  osloBoundBoats: ["15:00", "15:30", "16:00"],
  nesoddenBoundBoats: ["15:15", "15:45", "16:15"],
  busLeave: "14:43",
  bikeLeave: "14:49",
  carLeave: "14:53",
};

const STORAGE_KEY = "ferry-board-last-good-data";
const BOARD_STORAGE_KEY = "ferry-board-last-good-board";

const EMPTY_GOOD_DATA = {
  osloBoundFerryDepartures: [],
  nesoddenBoundFerryDepartures: [],
  busDepartures: [],
};

const EMPTY_BOARD_DATA = {
  osloBoundBoard: null,
  nesoddenBoundBoats: null,
};

function loadStoredGoodData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return EMPTY_GOOD_DATA;

    const parsed = JSON.parse(saved);

    return {
      osloBoundFerryDepartures: Array.isArray(parsed?.osloBoundFerryDepartures)
        ? parsed.osloBoundFerryDepartures
        : [],
      nesoddenBoundFerryDepartures: Array.isArray(
        parsed?.nesoddenBoundFerryDepartures
      )
        ? parsed.nesoddenBoundFerryDepartures
        : [],
      busDepartures: Array.isArray(parsed?.busDepartures)
        ? parsed.busDepartures
        : [],
    };
  } catch {
    return EMPTY_GOOD_DATA;
  }
}

function loadStoredBoardData() {
  try {
    const saved = localStorage.getItem(BOARD_STORAGE_KEY);
    if (!saved) return EMPTY_BOARD_DATA;

    const parsed = JSON.parse(saved);

    return {
      osloBoundBoard: parsed?.osloBoundBoard ?? null,
      nesoddenBoundBoats: Array.isArray(parsed?.nesoddenBoundBoats)
        ? parsed.nesoddenBoundBoats
        : null,
    };
  } catch {
    return EMPTY_BOARD_DATA;
  }
}

/* ---- ALL YOUR EXISTING LOGIC STAYS EXACTLY THE SAME ---- */
/* I am skipping unchanged parts for readability, nothing below is modified except layout */

export default function App() {
  /* all your existing hooks and logic unchanged */

  const isMobile = windowWidth < 900;

  const outerPadding = isMobile ? "8px" : "24px";
  const headerPadding = isMobile
    ? "10px 14px 6px 14px"
    : "18px 24px 10px 24px";
  const sectionPadding = isMobile ? "10px 14px" : "16px 24px";
  const tablePadding = isMobile ? "8px 10px 10px 10px" : "12px 24px 14px 24px";

  const titleSize = isMobile ? "16px" : "28px";
  const rowFontSize = isMobile ? "16px" : "30px";
  const labelSize = isMobile ? "10px" : "14px";
  const pageBg = "#161b24";
  const boardBg = "#090909";

  return (
    <div
      style={{
        height: "100dvh",
        width: "100%",
        background: pageBg,
        color: "white",
        fontFamily: "Arial, sans-serif",
        padding: outerPadding,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <GlobalStyles />

      <div
        style={{
          width: "100%",
          margin: isMobile ? "8px auto 0 auto" : "0 auto", // ✅ FIX HERE
          border: "none",
          borderRadius: isMobile ? "14px" : "20px",
          overflow: "hidden",
          background: boardBg,
          boxShadow: "0 0 0 1px rgba(255,255,255,0.10)",
        }}
      >
        {/* everything else unchanged */}