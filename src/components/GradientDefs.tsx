/**
 * Hidden SVG that defines reusable gradients referenced by id from CSS
 * (e.g. Recharts bar fills). Mount once at the app root so the gradient
 * id is available everywhere without re-rendering it per chart.
 *
 * The actual `fill: url(#id)` overrides live in globals.css.
 */
export function GradientDefs() {
  return (
    <svg
      width="0"
      height="0"
      aria-hidden
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
    >
      <defs>
        <linearGradient id="bundy-bronze-vertical" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#daad3f" />
          <stop offset="50%" stopColor="#cc9429" />
          <stop offset="100%" stopColor="#a07820" />
        </linearGradient>
      </defs>
    </svg>
  );
}
