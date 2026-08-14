export function withFormattedSuffix(name: string): string {
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return `${name}_cam_formatted`;
  return `${name.slice(0, dot)}_cam_formatted${name.slice(dot)}`;
}