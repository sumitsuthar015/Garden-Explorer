/**
 * Centralised validation surface.
 *
 * Every server action and route handler imports its schema from here, so the
 * exact same rules run on the client (React Hook Form resolvers) and on the
 * server. Nothing that mutates data may skip these schemas.
 */
export * from "./common";
export * from "./location";
export * from "./activity";
export * from "./quiz";
export * from "./trail";
export * from "./qr";
export * from "./badge";
export * from "./settings";
export * from "./analytics";
