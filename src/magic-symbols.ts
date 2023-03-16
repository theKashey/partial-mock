/**
 * A magic symbol allowing access to a field, yet keeping field undefined.
 * Matches any key but dont hold any value
 */
export const DOES_NOT_MATTER: any = Symbol('DOES_NOT_MATTER');
/**
 * A magic symbol marking field as non-accessible.
 * @throws on field access
 */
export const DO_NOT_USE: any = Symbol('DO_NOT_USE');
/**
 * A magic symbol marking field as non-callbable
 * @throws on field invocation
 */
export const DO_NOT_CALL: any = Symbol('DO_NOT_CALL');

