
// lib/riskCalc.js
/**
 * Returns a score 0..1
 * Heuristics:
 * - timeLeftRatio = hoursLeft / estimatedHours
 * - if overdue => high risk
 * - if assignee load heavy => increase risk (you can pass workload factor)
 * - if stuck in one status for many days => increase risk
 */
export function calcRisk(task, { now = new Date(), workloadFactor = 1, daysStagnant = 0 } = {}) {
  // overdue
  if (task.dueDate) {
    const due = new Date(task.dueDate);
    const msLeft = due - now;
    const hoursLeft = Math.max(msLeft / (1000 * 60 * 60), 0);
    const est = Math.max(Number(task.estimatedHours || 1), 1);
    const timeRatio = hoursLeft / est; // low is bad

    if (hoursLeft <= 0) return 1.0; // overdue -> max risk

    // base risk is inverse of timeRatio, capped
    let base = Math.max(0, Math.min(1, 1 - Math.min(timeRatio / 72, 1))); // within 3 days matters
    // factor by workload (1 normal, >1 overloaded)
    base = Math.min(1, base * workloadFactor);

    // stagnation penalty
    base = Math.min(1, base + Math.min(daysStagnant * 0.05, 0.3));

    // increase if not started and close to due
    if (task.status === "todo" && timeRatio < 48) base = Math.min(1, base + 0.2);

    return Number(base.toFixed(3));
  } else {
    // no due date: base low risk, but factor by stagnation
    const base = Math.min(1, Math.min(0.1 * workloadFactor + daysStagnant * 0.02, 0.6));
    return Number(base.toFixed(3));
  }
}
