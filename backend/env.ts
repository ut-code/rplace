import dotenv from "dotenv";

// switch environment variable on production
dotenv.config(
  process.env.NODE_ENV === "production"
    ? {
        path: ".env.production",
      }
    : undefined,
);

const NODE_ENV = process.env.NODE_ENV,
  WEB_ORIGIN = process.env.WEB_ORIGIN,
  VITE_API_ENDPOINT = process.env.VITE_API_ENDPOINT;

export { NODE_ENV, WEB_ORIGIN, VITE_API_ENDPOINT };
