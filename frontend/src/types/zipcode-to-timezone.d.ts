declare module 'zipcode-to-timezone' {
  /**
   * Returns the IANA timezone string for the given US 5-digit ZIP code,
   * or `null` if the ZIP is unknown / non-US / malformed.
   */
  export function lookup(zip: string): string | null;
  const _default: { lookup: typeof lookup };
  export default _default;
}
