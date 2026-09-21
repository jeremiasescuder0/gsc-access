// Env vars de test para el sistema de auth. Nunca se commitea un secreto real acá — son valores
// fijos sólo para que los tests corran de forma determinística, no credenciales de verdad.
import bcrypt from "bcryptjs";

process.env.AUTH_USERNAME = "test-admin";
// Hash de "test-password-123456" (bcrypt cost 12) — sólo para tests.
process.env.AUTH_PASSWORD_HASH = bcrypt.hashSync("test-password-123456", 12);
process.env.SESSION_SECRET = "test-session-secret-do-not-use-in-prod";
