export function toCSV(data: any[]) {
  if (!data.length) return '';

  const keys = Object.keys(data[0]);
  const rows = data.map((row) =>
    keys.map((k) => row[k]).join(',')
  );

  return [keys.join(','), ...rows].join('\n');
}
