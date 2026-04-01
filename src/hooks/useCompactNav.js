import { useEffect, useState } from "react";

export default function useCompactNav(breakpoint = 900) {
  const [compact, setCompact] = useState(typeof window !== "undefined" ? window.innerWidth <= breakpoint : false);

  useEffect(() => {
    const onResize = () => setCompact(window.innerWidth <= breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);

  return compact;
}
