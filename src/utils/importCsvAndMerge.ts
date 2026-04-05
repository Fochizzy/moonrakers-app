export function parseCSV(csv: string) {
  const [header, ...rows] = csv.split('\n');
  const keys = header.split(',');

  return rows.map((row) => {
    const values = row.split(',');
    return Object.fromEntries(
      keys.map((k, i) => [k, values[i]])
    );
  });
}
