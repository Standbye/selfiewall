import crypto from "node:crypto";

/** Nicht ratbares URL-Token, z. B. "kX3v9qLmZ2pA" */
export function generateEventToken() {
  return crypto.randomBytes(9).toString("base64url");
}
