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

const FERRY_DEPARTURES_QUERY = `
  query GetFerryDepartures(
    $stopId: String!
    $timeRange: Int!
    $count: Int!
  ) {
    stopPlace(id: $stopId) {
      estimatedCalls(
        numberOfDepartures: $count
        whiteListedModes: [water]
        includeCancelledTrips: true
        timeRange: $timeRange
      ) {
        realtime
        aimedDepartureTime
        expectedDepartureTime
        actualDepartureTime
        destinationDisplay {
          frontText
        }
        serviceJourney {
          journeyPattern {
            line {
              publicCode
            }
          }
        }
        cancellation
      }
    }
  }
`;

const BUS_DEPARTURES_QUERY = `
  query GetBusDepartures($stopId: String!, $timeRange: Int!) {
    stopPlace(id: $stopId) {
      estimatedCalls(
        numberOfDepartures: 30
        whiteListedModes: [bus]
        includeCancelledTrips: true
        timeRange: $timeRange
      ) {
        realtime
        aimedDepartureTime
        expectedDepartureTime
        actualDepartureTime
        destinationDisplay {
          frontText
        }
        serviceJourney {
          journeyPattern {
            line {
              publicCode
            }
          }
        }
        cancellation
      }
    }
  }
`;

function GlobalStyles() {
  return (
    <style>{`
     html, body, #root {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  max-width: none !important;
  background: #161b24;
}

body {
  overflow: hidden;
}

      @keyframes flapFlash {
        0% { transform: rotateX(0deg); filter: brightness(1); }
        50% { transform: rotateX(-90deg); filter: brightness(1.2); }
        100% { transform: rotateX(0deg); filter: brightness(1); }
      }

      .split-flap-char {
        position: relative;
        overflow: hidden;
        transform-origin: center center;
        backface-visibility: hidden;
      }

      .split-flap-char.flip {
        animation: flapFlash 260ms ease;
      }
    `}</style>
  );
}

function SplitFlapText({
  value,
  isMobile,
  active = false,
  align = "left",
  dimmed = false,
  compact = false,
}) {
  const text = String(value ?? "");
  const chars = text.split("");
  const prevRef = useRef(chars);
  const [flipMap, setFlipMap] = useState([]);

  useEffect(() => {
    const prev = prevRef.current;
    const next = chars;
    const changed = next.map((char, i) => prev[i] !== char);

    if (changed.some(Boolean)) {
      setFlipMap(changed);
      const timeout = setTimeout(() => setFlipMap([]), 280);
      prevRef.current = next;
      return () => clearTimeout(timeout);
    }

    prevRef.current = next;
  }, [text, chars]);

  const charWidth = compact ? (isMobile ? 12 : 18) : isMobile ? 15 : 24;
  const charHeight = compact ? (isMobile ? 18 : 24) : isMobile ? 28 : 42;
  const charFontSize = compact ? (isMobile ? 10 : 14) : isMobile ? 18 : 28;
  const gap = compact ? (isMobile ? 1 : 2) : isMobile ? 2 : 3;

  const justifyContent =
    align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";

  return (
    <div
      style={{
        display: "flex",
        justifyContent,
        alignItems: "center",
        gap,
        opacity: dimmed ? 0.72 : 1,
        flexWrap: "nowrap",
      }}
    >
      {chars.map((char, i) => {
        const isSeparator = char === ":" || char === "." || char === " ";
        const isSpecialNarrow = char === "m" || char === "<";
        const width = isSeparator
          ? compact
            ? isMobile
              ? 6
              : 8
            : isMobile
            ? 7
            : 10
          : isSpecialNarrow
          ? charWidth - (isMobile ? 3 : 5)
          : charWidth;

        return (
          <div
            key={`${i}-${char}`}
            className={`split-flap-char ${flipMap[i] ? "flip" : ""}`}
            style={{
              width,
              height: charHeight,
              borderRadius: isMobile ? 3 : 4,
              background: isSeparator
                ? "transparent"
                : active
                ? "#1a1a1a"
                : "#181818",
              border: isSeparator
                ? "none"
                : active
                ? "1px solid rgba(255,212,0,0.28)"
                : "1px solid rgba(255,255,255,0.10)",
              boxShadow: isSeparator
                ? "none"
                : "inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: active ? "#FFD400" : "#F2F2F2",
              fontWeight: 700,
              fontSize: charFontSize,
              lineHeight: 1,
              position: "relative",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: 0,
            }}
          >
            {!isSeparator && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: "50%",
                  height: 1,
                  background: active
                    ? "rgba(255,212,0,0.14)"
                    : "rgba(255,255,255,0.08)",
                  transform: "translateY(-0.5px)",
                }}
              />
            )}
            <span style={{ position: "relative", zIndex: 1 }}>{char}</span>
          </div>
        );
      })}
    </div>
  );
}

function ArrowTriangle({ isMobile }) {
  return (
    <div
      style={{
        width: 0,
        height: 0,
        borderTop: `${isMobile ? 7 : 9}px solid transparent`,
        borderBottom: `${isMobile ? 7 : 9}px solid transparent`,
        borderLeft: `${isMobile ? 12 : 16}px solid #FFD400`,
        filter: "drop-shadow(0 0 2px rgba(255,212,0,0.15))",
        flexShrink: 0,
      }}
    />
  );
}

export default function App() {
  const initialStoredData = useMemo(() => loadStoredGoodData(), []);
  const initialStoredBoard = useMemo(() => loadStoredBoardData(), []);
  const lastGoodDataRef = useRef(initialStoredData);
  const lastGoodBoardRef = useRef(initialStoredBoard);

  const [currentTime, setCurrentTime] = useState("");
  const [currentMinutes, setCurrentMinutes] = useState(0);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const [osloBoundFerryDepartures, setOsloBoundFerryDepartures] = useState(
    initialStoredData.osloBoundFerryDepartures
  );
  const [nesoddenBoundFerryDepartures, setNesoddenBoundFerryDepartures] =
    useState(initialStoredData.nesoddenBoundFerryDepartures);
  const [busDepartures, setBusDepartures] = useState(
    initialStoredData.busDepartures
  );

  useEffect(() => {
    function updateTime() {
      const now = new Date();

      const formatted = now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      setCurrentTime(formatted);
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
    }

    function handleResize() {
      setWindowWidth(window.innerWidth);
    }

    updateTime();
    handleResize();

    const interval = setInterval(updateTime, 1000);
    window.addEventListener("resize", handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchLiveData() {
      try {
        const osloBoundFerryPromise = fetch(
          "https://api.entur.io/journey-planner/v3/graphql",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "ET-Client-Name": CONFIG.clientName,
            },
            body: JSON.stringify({
              query: FERRY_DEPARTURES_QUERY,
              variables: {
                stopId: CONFIG.osloBoundFerryStopPlaceId,
                timeRange: CONFIG.ferryTimeRangeSeconds,
                count: CONFIG.ferryNumberOfDepartures,
              },
            }),
          }
        );

        const nesoddenBoundFerryPromise = fetch(
          "https://api.entur.io/journey-planner/v3/graphql",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "ET-Client-Name": CONFIG.clientName,
            },
            body: JSON.stringify({
              query: FERRY_DEPARTURES_QUERY,
              variables: {
                stopId: CONFIG.nesoddenBoundFerryStopPlaceId,
                timeRange: CONFIG.ferryTimeRangeSeconds,
                count: CONFIG.ferryNumberOfDepartures,
              },
            }),
          }
        );

        const busPromise = fetch(
          "https://api.entur.io/journey-planner/v3/graphql",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "ET-Client-Name": CONFIG.clientName,
            },
            body: JSON.stringify({
              query: BUS_DEPARTURES_QUERY,
              variables: {
                stopId: CONFIG.busStopPlaceId,
                timeRange: CONFIG.busTimeRangeSeconds,
              },
            }),
          }
        );

        const [osloBoundFerryResponse, nesoddenBoundFerryResponse, busResponse] =
          await Promise.all([
            osloBoundFerryPromise,
            nesoddenBoundFerryPromise,
            busPromise,
          ]);

        if (!osloBoundFerryResponse.ok) {
          throw new Error(`Oslo-bound ferry HTTP ${osloBoundFerryResponse.status}`);
        }

        if (!nesoddenBoundFerryResponse.ok) {
          throw new Error(
            `Nesodden-bound ferry HTTP ${nesoddenBoundFerryResponse.status}`
          );
        }

        if (!busResponse.ok) {
          throw new Error(`Bus HTTP ${busResponse.status}`);
        }

        const osloBoundFerryJson = await osloBoundFerryResponse.json();
        const nesoddenBoundFerryJson = await nesoddenBoundFerryResponse.json();
        const busJson = await busResponse.json();

        if (osloBoundFerryJson.errors?.length) {
          throw new Error(
            osloBoundFerryJson.errors[0].message || "Oslo-bound ferry GraphQL error"
          );
        }

        if (nesoddenBoundFerryJson.errors?.length) {
          throw new Error(
            nesoddenBoundFerryJson.errors[0].message ||
              "Nesodden-bound ferry GraphQL error"
          );
        }

        if (busJson.errors?.length) {
          throw new Error(busJson.errors[0].message || "Bus GraphQL error");
        }

        const nextOsloBoundFerryCalls =
          osloBoundFerryJson?.data?.stopPlace?.estimatedCalls ?? [];
        const nextNesoddenBoundFerryCalls =
          nesoddenBoundFerryJson?.data?.stopPlace?.estimatedCalls ?? [];
        const nextBusCalls = busJson?.data?.stopPlace?.estimatedCalls ?? [];

        if (!cancelled) {
          setOsloBoundFerryDepartures(nextOsloBoundFerryCalls);
          setNesoddenBoundFerryDepartures(nextNesoddenBoundFerryCalls);
          setBusDepartures(nextBusCalls);

          const nextGoodData = {
            osloBoundFerryDepartures: nextOsloBoundFerryCalls,
            nesoddenBoundFerryDepartures: nextNesoddenBoundFerryCalls,
            busDepartures: nextBusCalls,
          };

          lastGoodDataRef.current = nextGoodData;

          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(nextGoodData));
          } catch (error) {
            console.error("Failed to save cached ferry data", error);
          }
        }
      } catch {
        if (!cancelled) {
          if (lastGoodDataRef.current.osloBoundFerryDepartures.length) {
            setOsloBoundFerryDepartures(
              lastGoodDataRef.current.osloBoundFerryDepartures
            );
          }

          if (lastGoodDataRef.current.nesoddenBoundFerryDepartures.length) {
            setNesoddenBoundFerryDepartures(
              lastGoodDataRef.current.nesoddenBoundFerryDepartures
            );
          }

          if (lastGoodDataRef.current.busDepartures.length) {
            setBusDepartures(lastGoodDataRef.current.busDepartures);
          }
        }
      }
    }

    fetchLiveData();
    const refreshTimer = setInterval(fetchLiveData, CONFIG.refreshMs);

    return () => {
      cancelled = true;
      clearInterval(refreshTimer);
    };
  }, []);

  function formatTime(date) {
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  function subtractMinutes(date, minutes) {
    return new Date(date.getTime() - minutes * 60000);
  }

  function normalizeDeparture(call) {
    const departureIso =
      call.expectedDepartureTime ||
      call.actualDepartureTime ||
      call.aimedDepartureTime;

    if (!departureIso) return null;

    const departureDate = new Date(departureIso);

    if (Number.isNaN(departureDate.getTime())) return null;
    if (call.cancellation) return null;

    return {
      departureDate,
      destination: call.destinationDisplay?.frontText || "",
      linePublicCode:
        call.serviceJourney?.journeyPattern?.line?.publicCode || "",
    };
  }

  function getNextFerries(calls, linePublicCode, destinationText) {
    const now = new Date();

    return calls
      .map(normalizeDeparture)
      .filter(Boolean)
      .filter(
        (dep) =>
          dep.departureDate > now || now - dep.departureDate < 15 * 60000
      )
      .filter((dep) => {
        if (linePublicCode && dep.linePublicCode !== linePublicCode) {
          return false;
        }

        if (
          destinationText &&
          !dep.destination.toLowerCase().includes(destinationText.toLowerCase())
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => a.departureDate - b.departureDate)
      .slice(0, 8);
  }

  function getBusForNextFerry(calls, nextFerryDate) {
    if (!nextFerryDate) return null;

    const now = new Date();

    const candidates = calls
      .map(normalizeDeparture)
      .filter(Boolean)
      .filter((dep) => dep.departureDate > now)
      .filter((dep) =>
        dep.destination.toLowerCase().includes(
          CONFIG.busDestinationText.toLowerCase()
        )
      )
      .filter((dep) => dep.departureDate < nextFerryDate)
      .sort((a, b) => a.departureDate - b.departureDate);

    if (candidates.length === 0) return null;

    return candidates[candidates.length - 1];
  }

  function getLeaveInText(leaveDate, nowDate, options = {}) {
    if (!leaveDate) {
      return options.missingText || "LOST CONNECTION, CHECK RUTER";
    }

    const diffMs = leaveDate.getTime() - nowDate.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMs <= 0) return "DEPARTED";
    if (diffMinutes <= 0) return "<1m";
    return `${diffMinutes}m`;
  }

  function buildFallbackBoard() {
    return {
      boats: FALLBACK.osloBoundBoats,
      rows: [
        {
          mode: "Bus",
          leaveAt: FALLBACK.busLeave,
          leaveIn: "LOST CONNECTION, CHECK RUTER",
          departed: false,
          missing: true,
          primary: true,
        },
        {
          mode: "Bike",
          leaveAt: FALLBACK.bikeLeave,
          leaveIn: "DEPARTED",
          departed: true,
          primary: false,
        },
        {
          mode: "Car",
          leaveAt: FALLBACK.carLeave,
          leaveIn: "DEPARTED",
          departed: true,
          primary: false,
        },
      ],
    };
  }

  const hasAnyCachedBoard = Boolean(
    lastGoodBoardRef.current?.osloBoundBoard || lastGoodBoardRef.current?.nesoddenBoundBoats
  );

  const osloBoundBoard = useMemo(() => {
    const ferries = getNextFerries(
      osloBoundFerryDepartures,
      CONFIG.osloBoundFerryLinePublicCode,
      CONFIG.osloBoundDestinationText
    );

    const now = new Date();

    if (ferries.length === 0) {
      if (lastGoodBoardRef.current?.osloBoundBoard) {
        return lastGoodBoardRef.current.osloBoundBoard;
      }

      return buildFallbackBoard();
    }

    for (let i = 0; i < ferries.length; i += 1) {
      const primaryFerry = ferries[i].departureDate;
      const secondFerry = ferries[i + 1]?.departureDate || null;
      const thirdFerry = ferries[i + 2]?.departureDate || null;

      const busForFerry = getBusForNextFerry(busDepartures, primaryFerry);

      const busLeaveDate = busForFerry
        ? subtractMinutes(busForFerry.departureDate, CONFIG.busWalkMinutes)
        : null;

      const bikeLeaveDate = subtractMinutes(
        primaryFerry,
        CONFIG.travelMinutes.bike
      );
      const carLeaveDate = subtractMinutes(
        primaryFerry,
        CONFIG.travelMinutes.car
      );

      const rows = [
        {
          mode: "Bus",
          leaveAt: busLeaveDate ? formatTime(busLeaveDate) : "--:--",
          leaveIn: getLeaveInText(busLeaveDate, now, {
            missingText: hasAnyCachedBoard
              ? lastGoodBoardRef.current?.osloBoundBoard?.rows?.[0]?.leaveIn ||
                "<1m"
              : "LOST CONNECTION, CHECK RUTER",
          }),
          departed: Boolean(busLeaveDate && busLeaveDate <= now),
          missing: !busLeaveDate,
          primary: true,
        },
        {
          mode: "Bike",
          leaveAt: formatTime(bikeLeaveDate),
          leaveIn: getLeaveInText(bikeLeaveDate, now),
          departed: bikeLeaveDate <= now,
          primary: false,
        },
        {
          mode: "Car",
          leaveAt: formatTime(carLeaveDate),
          leaveIn: getLeaveInText(carLeaveDate, now),
          departed: carLeaveDate <= now,
          primary: false,
        },
      ];

      const allUnavailable = rows.every((row) => row.departed || row.missing);

      if (!allUnavailable || i === ferries.length - 1) {
        return {
          boats: [
            formatTime(primaryFerry),
            secondFerry ? formatTime(secondFerry) : "--:--",
            thirdFerry ? formatTime(thirdFerry) : "--:--",
          ],
          rows,
        };
      }
    }

    if (lastGoodBoardRef.current?.osloBoundBoard) {
      return lastGoodBoardRef.current.osloBoundBoard;
    }

    return buildFallbackBoard();
  }, [osloBoundFerryDepartures, busDepartures, currentMinutes, hasAnyCachedBoard]);

  const nesoddenBoundBoats = useMemo(() => {
    const ferries = getNextFerries(
      nesoddenBoundFerryDepartures,
      CONFIG.nesoddenBoundFerryLinePublicCode,
      CONFIG.nesoddenBoundDestinationText
    );

    if (ferries.length === 0) {
      if (lastGoodBoardRef.current?.nesoddenBoundBoats) {
        return lastGoodBoardRef.current.nesoddenBoundBoats;
      }

      return FALLBACK.nesoddenBoundBoats;
    }

    return [
      ferries[0] ? formatTime(ferries[0].departureDate) : "--:--",
      ferries[1] ? formatTime(ferries[1].departureDate) : "--:--",
      ferries[2] ? formatTime(ferries[2].departureDate) : "--:--",
    ];
  }, [nesoddenBoundFerryDepartures, currentMinutes]);

  useEffect(() => {
    const shouldSaveBoard =
      osloBoundBoard &&
      Array.isArray(osloBoundBoard.boats) &&
      Array.isArray(osloBoundBoard.rows) &&
      !osloBoundBoard.rows.some(
        (row) =>
          row.mode === "Bus" && row.leaveIn === "LOST CONNECTION, CHECK RUTER"
      );

    const shouldSaveNesodden =
      Array.isArray(nesoddenBoundBoats) &&
      nesoddenBoundBoats.length > 0;

    const nextBoardData = {
      osloBoundBoard: shouldSaveBoard
        ? osloBoundBoard
        : lastGoodBoardRef.current?.osloBoundBoard ?? null,
      nesoddenBoundBoats: shouldSaveNesodden
        ? nesoddenBoundBoats
        : lastGoodBoardRef.current?.nesoddenBoundBoats ?? null,
    };

    lastGoodBoardRef.current = nextBoardData;

    try {
      localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(nextBoardData));
    } catch (error) {
      console.error("Failed to save cached board data", error);
    }
  }, [osloBoundBoard, nesoddenBoundBoats]);

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

  function renderFlapOrText(
    value,
    align,
    active = false,
    dimmed = false,
    compact = false
  ) {
    const text = String(value ?? "");
    const shortEnough = text.length <= 8 && !text.includes("CHECK RUTER");

    if (shortEnough) {
      return (
        <SplitFlapText
          value={text}
          isMobile={isMobile}
          active={active}
          align={align}
          dimmed={dimmed}
          compact={compact}
        />
      );
    }

    return (
      <div
        style={{
          textAlign: align,
          color: dimmed ? "rgba(255,255,255,0.7)" : "white",
          fontWeight: 700,
          fontSize: compact ? (isMobile ? "10px" : "17px") : rowFontSize,
          lineHeight: compact ? 1.15 : 1.4,
        }}
      >
        {text}
      </div>
    );
  }

  function renderBoatRow(title, boats) {
    return (
      <div
        style={{
          padding: sectionPadding,
          borderBottom: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        <div
          style={{
            fontSize: titleSize,
            fontWeight: "700",
            letterSpacing: "2px",
            marginBottom: isMobile ? "6px" : "8px",
            textAlign: "center",
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            alignItems: "center",
            columnGap: isMobile ? "8px" : "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: isMobile ? "6px" : "10px",
              justifyContent: "flex-start",
            }}
          >
            <ArrowTriangle isMobile={isMobile} />
            <SplitFlapText
              value={boats[0]}
              isMobile={isMobile}
              active={true}
              align="left"
            />
          </div>

          <SplitFlapText
            value={boats[1]}
            isMobile={isMobile}
            align="center"
            dimmed={true}
          />

          <SplitFlapText
            value={boats[2]}
            isMobile={isMobile}
            align="right"
            dimmed={true}
          />
        </div>
      </div>
    );
  }

  function renderRow(row, padding) {
    const { mode, leaveAt, leaveIn, departed, missing, primary } = row;
    const rowOpacity = primary ? 1 : departed ? 0.42 : 0.82;

    return (
      <div
        key={mode}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          alignItems: "center",
          minHeight: isMobile ? 44 : 58,
          padding,
          borderTop: "1px solid rgba(255,255,255,0.08)",
          fontSize: rowFontSize,
          opacity: rowOpacity,
          position: "relative",
          background: primary ? "rgba(255,255,255,0.02)" : "transparent",
        }}
      >
        {primary && (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: isMobile ? 2 : 3,
              background: "#FFD400",
            }}
          />
        )}

        <div
          style={{
            textAlign: "left",
            fontWeight: primary ? 700 : 500,
            display: "flex",
            alignItems: "center",
            height: "100%",
            lineHeight: 1,
          }}
        >
          {mode}
        </div>

        <div>{renderFlapOrText(leaveAt, "center", primary, false, false)}</div>

        <div>
          {departed || missing ? (
            <div
              style={{
                textAlign: "right",
                color: "rgba(255,255,255,0.72)",
                fontWeight: 700,
                fontSize: missing
                  ? isMobile
                    ? "9px"
                    : "16px"
                  : isMobile
                  ? "11px"
                  : "18px",
                lineHeight: 1.1,
                letterSpacing: missing ? "0.3px" : "1px",
                whiteSpace: "nowrap",
              }}
            >
              {leaveIn}
            </div>
          ) : (
            renderFlapOrText(leaveIn, "right", false, false, false)
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100dvh",
        width: "100%",
        background: pageBg,
        color: "white",
        fontFamily: "Arial, sans-serif",
        padding: isMobile
    ? `calc(${outerPadding} + env(safe-area-inset-top)) ${outerPadding} ${outerPadding} ${outerPadding}`
    : outerPadding,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <GlobalStyles />

      <div
        style={{
          width: "100%",
          margin: isMobile ? "18px auto 0 auto" : "0 auto",
          border: "none",
          borderRadius: isMobile ? "14px" : "20px",
          overflow: "hidden",
          background: boardBg,
          boxShadow: "0 0 0 1px rgba(255,255,255,0.10)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "flex-end",
            padding: headerPadding,
            borderBottom: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <div
            style={{
              textAlign: "left",
            }}
          >
            <div
              style={{
                fontSize: labelSize,
                color: "rgba(255,255,255,0.75)",
                letterSpacing: "2px",
                fontWeight: 700,
                marginBottom: isMobile ? "4px" : "6px",
              }}
            >
              CURRENT TIME
            </div>

            <SplitFlapText
              value={currentTime}
              isMobile={isMobile}
              active={false}
              align="left"
            />
          </div>
        </div>

        {renderBoatRow("OSLO BOUND BOATS", osloBoundBoard.boats)}

        <div
          style={{
            padding: tablePadding,
            width: "100%",
            boxSizing: "border-box",
            borderBottom: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          {isMobile ? (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  fontSize: labelSize,
                  letterSpacing: "2px",
                  color: "rgba(255,255,255,0.75)",
                  fontWeight: 700,
                  marginBottom: "4px",
                  padding: "0 6px",
                }}
              >
                <div style={{ textAlign: "left" }}>MODE</div>
                <div style={{ textAlign: "center" }}>LEAVE BY TIME</div>
                <div style={{ textAlign: "right" }}>LEAVE IN</div>
              </div>

              {osloBoundBoard.rows.map((row) => renderRow(row, "6px 6px"))}
            </>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  fontSize: labelSize,
                  letterSpacing: "2px",
                  color: "rgba(255,255,255,0.75)",
                  fontWeight: 700,
                  marginBottom: "6px",
                  padding: "0 14px",
                }}
              >
                <div style={{ textAlign: "left" }}>MODE</div>
                <div style={{ textAlign: "center" }}>LEAVE BY TIME</div>
                <div style={{ textAlign: "right" }}>LEAVE IN</div>
              </div>

              {osloBoundBoard.rows.map((row) => renderRow(row, "6px 12px"))}
            </>
          )}
        </div>

        {renderBoatRow("NESODDEN BOUND BOATS", nesoddenBoundBoats)}
      </div>
    </div>
  );
}