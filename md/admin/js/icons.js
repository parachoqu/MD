// Icones SVG inline do painel admin, seguindo o mesmo estilo do site publico
// (fill="none" stroke="currentColor", aria-hidden="true", traco reto tipo
// square/miter na tab bar). Construidos via DOM API (svg()/element importados
// de dom.js), nunca via innerHTML -- nao ha sprite nem biblioteca externa.

import { svg } from "./dom.js";

const PATHS = {
  menu: ["M4 7h16", "M4 12h16", "M4 17h16"],
  close: ["M6 6l12 12", "M18 6L6 18"],
  chevronUp: ["M6 15l6-6 6 6"],
  chevronDown: ["M6 9l6 6 6-6"],
  chevronLeft: ["M15 6l-6 6 6 6"],
  chevronRight: ["M9 6l6 6-6 6"],
  search: ["M11 4a7 7 0 100 14 7 7 0 000-14z", "M21 21l-4.3-4.3"],
  plus: ["M12 5v14", "M5 12h14"],
  edit: ["M4 20h4L18.5 9.5a2.1 2.1 0 00-3-3L5 17v3z"],
  duplicate: ["M9 9h10v10H9z", "M5 15V5h10"],
  archive: ["M4 5h16v4H4z", "M6 9v10h12V9", "M10 13h4"],
  trash: ["M5 7h14", "M9 7V5h6v2", "M7 7l1 12h8l1-12"],
  eye: ["M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z", "M12 14.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"],
  check: ["M5 13l4 4L19 7"],
  alert: ["M12 4l9 16H3z", "M12 10v4", "M12 17h.01"],
  logout: ["M9 4H5v16h4", "M15 12H4", "M12 8l4 4-4 4"],
  dashboard: ["M4 4h7v7H4z", "M13 4h7v4h-7z", "M13 11h7v9h-7z", "M4 14h7v6H4z"],
  calendar: ["M4 5h16v15H4z", "M4 9h16", "M8 3v4", "M16 3v4"],
  image: ["M4 5h16v14H4z", "M4 15l5-5 4 4 3-3 4 4"],
  settings: [
    "M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z",
    "M19 12a7 7 0 00-.1-1.3l2-1.5-2-3.5-2.3.9a7 7 0 00-2.2-1.3L14 3h-4l-.4 2.3a7 7 0 00-2.2 1.3l-2.3-.9-2 3.5 2 1.5a7 7 0 000 2.6l-2 1.5 2 3.5 2.3-.9a7 7 0 002.2 1.3L10 21h4l.4-2.3a7 7 0 002.2-1.3l2.3.9 2-3.5-2-1.5c.07-.43.1-.86.1-1.3z",
  ],
  upload: ["M12 16V4", "M7 9l5-5 5 5", "M4 20h16"],
  externalLink: ["M14 4h6v6", "M20 4L10 14", "M18 13v7H5V6h7"],
  arrowLeft: ["M19 12H5", "M11 6l-6 6 6 6"],
  media: ["M4 4h16v16H4z", "M4 15l4-4 4 4 4-6 4 4"],
  content: ["M5 4h14v16H5z", "M8 8h8", "M8 12h8", "M8 16h5"],
  projects: ["M4 7h6v6H4z", "M14 7h6v10h-6z", "M4 17h6v3H4z"],
  users: ["M8 8a3 3 0 100-6 3 3 0 000 6z", "M2 20c0-3.3 2.7-6 6-6s6 2.7 6 6", "M16 4a3 3 0 010 6", "M18 14c2 .6 4 2.5 4 6"],
  home: ["M4 11l8-7 8 7", "M6 10v10h12V10"],
  moveUp: ["M12 19V5", "M6 11l6-6 6 6"],
  moveDown: ["M12 5v14", "M6 13l6 6 6-6"],
  info: ["M12 3a9 9 0 100 18 9 9 0 000-18z", "M12 8h.01", "M11 12h1v5h1"],
};

export function createIcon(name, options) {
  const size = (options && options.size) || 20;
  const strokeWidth = (options && options.strokeWidth) || 2;
  const data = PATHS[name] || PATHS.info;
  const children = data.map((d) =>
    svg("path", { d, fill: "none" })
  );
  return svg(
    "svg",
    {
      viewBox: "0 0 24 24",
      width: String(size),
      height: String(size),
      fill: "none",
      stroke: "currentColor",
      "stroke-width": String(strokeWidth),
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true",
      focusable: "false",
    },
    children
  );
}
