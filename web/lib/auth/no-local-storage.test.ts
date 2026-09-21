import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// La sesión tiene que vivir exclusivamente en una cookie HttpOnly server-side — nunca en
// localStorage/sessionStorage, que sí son accesibles desde JS del cliente (superficie de XSS).
// Chequeo estático simple sobre los archivos de auth del frontend, para que un futuro cambio
// que agregue localStorage/sessionStorage rompa el test en vez de pasar desapercibido.
const FILES_TO_CHECK = [
  "../../components/auth/LoginForm.tsx",
  "../../components/auth/LogoutButton.tsx",
  "../../app/login/page.tsx",
];

describe("almacenamiento de sesión en el cliente", () => {
  it("ningún archivo de auth del frontend usa localStorage/sessionStorage", () => {
    for (const relPath of FILES_TO_CHECK) {
      const fullPath = path.resolve(__dirname, relPath);
      const source = fs.readFileSync(fullPath, "utf8");
      expect(source).not.toMatch(/localStorage/);
      expect(source).not.toMatch(/sessionStorage/);
    }
  });
});
