import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "./api";
import { addToPlan, getPlan, removeFromPlan } from "./plan";

/**
 * Plan state for "Add to plan" buttons. Toggling updates the screen right away
 * and undoes it if the server refuses (for example, a missing prerequisite).
 */
export function usePlan(enabled = true) {
  const [codes, setCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getPlan()
      .then((plan) => !cancelled && setCodes(plan.courses.map((c) => c.code)))
      .catch((e) => !cancelled && setError(errorMessage(e, "Couldn't load your plan.")));
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const toggle = useCallback(
    async (code: string) => {
      const inPlan = codes.includes(code);
      setError(null);
      setCodes((current) => (inPlan ? current.filter((c) => c !== code) : [...current, code]));
      try {
        const plan = inPlan ? await removeFromPlan(code) : await addToPlan(code);
        setCodes(plan.courses.map((c) => c.code));
      } catch (e) {
        setCodes((current) => (inPlan ? [...current, code] : current.filter((c) => c !== code)));
        setError(errorMessage(e, "Couldn't update your plan. Please try again."));
      }
    },
    [codes]
  );

  return { codes, toggle, error };
}
