export function parseColorToRgb(input: string) {
  const color = input.trim();

  if (color.startsWith("#")) {
    const safe = color.replace("#", "");
    const normalized =
      safe.length === 3
        ? safe
            .split("")
            .map((channel) => channel + channel)
            .join("")
        : safe.padEnd(6, "0").slice(0, 6);

    const numeric = parseInt(normalized, 16);

    return {
      r: (numeric >> 16) & 255,
      g: (numeric >> 8) & 255,
      b: numeric & 255,
    };
  }

  const rgbMatch = color.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i,
  );
  if (rgbMatch) {
    return {
      r: Math.max(0, Math.min(255, Number(rgbMatch[1]))),
      g: Math.max(0, Math.min(255, Number(rgbMatch[2]))),
      b: Math.max(0, Math.min(255, Number(rgbMatch[3]))),
    };
  }

  return { r: 255, g: 255, b: 255 };
}

export function withAlpha(color: string, alpha: number) {
  const { r, g, b } = parseColorToRgb(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function mixWithBlack(color: string, amount = 0.7) {
  const { r, g, b } = parseColorToRgb(color);
  return `rgb(${Math.round(r * (1 - amount))}, ${Math.round(
    g * (1 - amount),
  )}, ${Math.round(b * (1 - amount))})`;
}

export function makePlayerWash(accent: string, alpha = 0.05) {
  return withAlpha(accent, alpha);
}

export function glowStyle(
  color: string,
  opacity = 0.34,
  radius = 10,
  elevation = 8,
) {
  return {
    shadowColor: color,
    shadowOpacity: opacity,
    shadowRadius: radius,
    shadowOffset: { width: 0, height: 0 },
    elevation,
  };
}
