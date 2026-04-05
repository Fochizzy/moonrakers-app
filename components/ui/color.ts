export function getPlayerColors(color: string) {
  const map: any = {
    green: '#2ecc71',
    purple: '#9b59b6',
    blue: '#3498db',
    yellow: '#f1c40f',
    orange: '#e67e22',
  };

  const base = map[color] || '#ccc';

  return {
    base,
    light: base + '33', // transparency
  };
}
