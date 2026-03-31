/**
 * Status Color Management System
 * Handles persistent color assignments for statuses across imports
 * - Maintains existing status colors
 * - Auto-generates colors for new statuses
 * - Ensures color contrast for readability
 */

// Core predefined status colors (from STATUT_CONFIG in config.js)
const PREDEFINED_COLORS = {
  "Manquants Plus": { bg: "#fde8e8", color: "#c0392b", dot: "#c0392b" },
  "Point dur":      { bg: "#f3e8fd", color: "#7d3c98", dot: "#7d3c98" },
  "À venir":        { bg: "#fdf0e0", color: "#6e2c00", dot: "#a0522d" },
  "Retard":         { bg: "#fff3e0", color: "#e67e22", dot: "#e67e22" },
  "Manquant":       { bg: "#fde8f3", color: "#e84393", dot: "#e84393" },
  "Confirmé":       { bg: "#e8f4fd", color: "#2e86c1", dot: "#2e86c1" },
  "Faux manquant":  { bg: "#f2f3f4", color: "#7f8c8d", dot: "#7f8c8d" },
  "Reçu":           { bg: "#eafaf1", color: "#27ae60", dot: "#27ae60" },
  "En cours":       { bg: "#d5f5e3", color: "#1e8449", dot: "#1e8449" },
};

// Palette de couleurs pour les nouveaux statuts (distinct colors with good contrast)
const COLOR_PALETTE = [
  { bg: "#e3f2fd", color: "#1565c0", dot: "#1565c0" }, // bleu foncé
  { bg: "#f3e5f5", color: "#6a1b9a", dot: "#6a1b9a" }, // violet foncé
  { bg: "#e0f2f1", color: "#00695c", dot: "#00695c" }, // teal foncé
  { bg: "#fce4ec", color: "#c2185b", dot: "#c2185b" }, // rose foncé
  { bg: "#fff3e0", color: "#e65100", dot: "#e65100" }, // orange foncé
  { bg: "#f1f8e9", color: "#33691e", dot: "#33691e" }, // vert foncé
  { bg: "#ede7f6", color: "#4527a0", dot: "#4527a0" }, // indigo foncé
  { bg: "#efebe9", color: "#3e2723", dot: "#3e2723" }, // marron foncé
  { bg: "#eceff1", color: "#1c1c1c", dot: "#1c1c1c" }, // gris foncé
  { bg: "#fff9c4", color: "#f57f17", dot: "#f57f17" }, // jaune foncé
  { bg: "#ffe0b2", color: "#e65100", dot: "#e65100" }, // orange
  { bg: "#c8e6c9", color: "#1b5e20", dot: "#1b5e20" }, // vert
];

/**
 * Load status color mapping from localStorage or initialize with predefined colors
 */
export function loadStatusColors() {
  try {
    const stored = localStorage.getItem("statusColors");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn("Failed to load status colors from localStorage:", e);
  }
  // Initialize with predefined colors
  return { ...PREDEFINED_COLORS };
}

/**
 * Save status color mapping to localStorage
 */
export function saveStatusColors(colors) {
  try {
    localStorage.setItem("statusColors", JSON.stringify(colors));
    return true;
  } catch (e) {
    console.warn("Failed to save status colors to localStorage:", e);
    return false;
  }
}

/**
 * Get color for a specific status
 * Returns the color object with bg, color, dot properties
 */
export function getStatusColor(statusName) {
  const colors = loadStatusColors();
  return colors[statusName] || { bg: "#f3f4f6", color: "#64748b", dot: "#64748b" };
}

/**
 * Detect new statuses from imported data
 * Returns: { newStatuses: string[], report: StatusMapping[] }
 */
export function detectNewStatuses(importedRows) {
  const currentColors = loadStatusColors();
  const existingStatuses = new Set(Object.keys(currentColors));
  const newStatuses = new Set();

  // Collect all statuses from imported rows
  importedRows.forEach(row => {
    if (row.statut && !existingStatuses.has(row.statut)) {
      newStatuses.add(row.statut);
    }
  });

  return Array.from(newStatuses);
}

/**
 * Assign colors to new statuses automatically
 * Ensures colors are unique and have good contrast
 */
export function assignColorsToNewStatuses(newStatuses) {
  const currentColors = loadStatusColors();
  const usedPaletteIndices = new Set();
  
  // Track which palette colors are already in use
  Object.values(currentColors).forEach(colorObj => {
    const paletteIdx = COLOR_PALETTE.findIndex(
      p => p.color === colorObj.color
    );
    if (paletteIdx >= 0) usedPaletteIndices.add(paletteIdx);
  });

  const updatedColors = { ...currentColors };
  const assignedMapping = [];

  // Assign colors to new statuses
  newStatuses.forEach((status, idx) => {
    // Find next available palette color
    let paletteIdx = (idx % COLOR_PALETTE.length);
    let attempts = 0;
    while (usedPaletteIndices.has(paletteIdx) && attempts < COLOR_PALETTE.length) {
      paletteIdx = (paletteIdx + 1) % COLOR_PALETTE.length;
      attempts++;
    }

    if (attempts < COLOR_PALETTE.length) {
      const assignedColor = COLOR_PALETTE[paletteIdx];
      updatedColors[status] = assignedColor;
      usedPaletteIndices.add(paletteIdx);
      assignedMapping.push({
        statut: status,
        state: "Nouveau",
        action: "Généré",
        color: assignedColor.color,
      });
    }
  });

  // Save to localStorage
  saveStatusColors(updatedColors);

  return {
    updatedColors,
    newAssignments: assignedMapping,
  };
}

/**
 * Generate complete status mapping report
 * Shows existing statuses (kept) and new statuses (generated)
 */
export function generateStatusMappingReport(importedRows) {
  const newStatuses = detectNewStatuses(importedRows);
  const currentColors = loadStatusColors();

  // Build report for all statuses in imported data
  const reportMap = new Map();
  
  // Add existing statuses
  Object.entries(currentColors).forEach(([status, colorObj]) => {
    // Only include if this status appears in the import
    const hasThisStatus = importedRows.some(r => r.statut === status);
    if (hasThisStatus) {
      reportMap.set(status, {
        statut: status,
        state: "Existant",
        action: "Conservé",
        color: colorObj.color,
        isNew: false,
      });
    }
  });

  // Process new statuses and assign colors
  if (newStatuses.length > 0) {
    const { newAssignments } = assignColorsToNewStatuses(newStatuses);
    newAssignments.forEach(assignment => {
      reportMap.set(assignment.statut, {
        ...assignment,
        isNew: true,
      });
    });
  }

  return Array.from(reportMap.values());
}

/**
 * Update validation to accept new statuses
 * Instead of rejecting unknown statuses, we now accept them
 */
export function validateStatusWithNewSupport(statusValue) {
  // Accept any non-empty status value
  // It will be added to the color palette if it's new
  return statusValue && statusValue.trim() !== "";
}

/**
 * Get all current status-color mappings
 */
export function getAllStatusColors() {
  return loadStatusColors();
}

/**
 * Reset status colors to predefined defaults
 */
export function resetStatusColors() {
  const defaults = { ...PREDEFINED_COLORS };
  saveStatusColors(defaults);
  return defaults;
}

/**
 * Manually add or update a status color
 */
export function setStatusColor(statusName, colorObj) {
  const colors = loadStatusColors();
  colors[statusName] = colorObj;
  saveStatusColors(colors);
  return colors;
}
