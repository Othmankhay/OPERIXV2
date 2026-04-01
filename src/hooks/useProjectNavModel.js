import { useMemo } from "react";

const normalizeProjectName = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const getProjectFamily = (projectName) => {
  const n = normalizeProjectName(projectName);
  if (!n) return "other";
  if (n.includes("biw") || n.includes("ferrage")) return "biw";
  if (n.includes("vie serie") || n.includes("vieserie") || /(^|[\s\-_])vs($|[\s\-_])/.test(n)) return "vie_serie";
  if (n.includes("multi projet") || /(^|[\s\-_])ga($|[\s\-_])/.test(n)) return "ga";
  return "other";
};

export default function useProjectNavModel(tableData) {
  return useMemo(() => {
    const gaNames = new Set();
    const vieSerieNames = new Set();
    const biwNames = new Set();
    const otherMap = new Map();
    let gaCount = 0;
    let vieSerieCount = 0;
    let biwCount = 0;

    tableData.forEach((row) => {
      const projectName = String(row.nomProjet || "").trim();
      if (!projectName) return;
      const family = getProjectFamily(projectName);
      if (family === "ga") {
        gaCount += 1;
        gaNames.add(projectName);
      } else if (family === "vie_serie") {
        vieSerieCount += 1;
        vieSerieNames.add(projectName);
      } else if (family === "biw") {
        biwCount += 1;
        biwNames.add(projectName);
      } else {
        otherMap.set(projectName, (otherMap.get(projectName) || 0) + 1);
      }
    });

    const otherProjects = Array.from(otherMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));

    return {
      ga: { count: gaCount, projects: Array.from(gaNames).sort((a, b) => a.localeCompare(b, "fr")) },
      vie_serie: { count: vieSerieCount, projects: Array.from(vieSerieNames).sort((a, b) => a.localeCompare(b, "fr")) },
      biw: { count: biwCount, projects: Array.from(biwNames).sort((a, b) => a.localeCompare(b, "fr")) },
      other: { count: otherProjects.reduce((sum, p) => sum + p.count, 0), projects: otherProjects },
    };
  }, [tableData]);
}
