export function getPlayerAccentColor(color?: string) {
  switch ((color ?? '').toLowerCase()) {
    case 'green':
      return '#22c55e';
    case 'purple':
      return '#a855f7';
    case 'blue':
      return '#3b82f6';
    case 'orange':
      return '#f97316';
    case 'yellow':
      return '#eab308';
    default:
      return '#94a3b8';
  }
}

export function getPlayerBackgroundColor(color?: string) {
  switch ((color ?? '').toLowerCase()) {
    case 'green':
      return '#052e16';
    case 'purple':
      return '#2e1065';
    case 'blue':
      return '#0c1f3f';
    case 'orange':
      return '#3b1d0a';
    case 'yellow':
      return '#3a2f00';
    default:
      return '#050816';
  }
}

export function getPlayerTintColor(color?: string) {
  switch ((color ?? '').toLowerCase()) {
    case 'green':
      return 'rgba(34,197,94,0.14)';
    case 'purple':
      return 'rgba(168,85,247,0.14)';
    case 'blue':
      return 'rgba(59,130,246,0.14)';
    case 'orange':
      return 'rgba(249,115,22,0.14)';
    case 'yellow':
      return 'rgba(234,179,8,0.14)';
    default:
      return 'rgba(148,163,184,0.12)';
  }
}
