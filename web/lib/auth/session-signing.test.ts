import { describe, it, expect } from "vitest";
import { signSessionId, verifySignedSessionId } from "./session";

describe("firma de la cookie de sesión (SESSION_SECRET)", () => {
  it("una cookie recién firmada verifica correctamente", () => {
    const signed = signSessionId("abc123");
    expect(verifySignedSessionId(signed)).toBe("abc123");
  });

  it("rechaza un valor manipulado (id cambiado, firma vieja)", () => {
    const signed = signSessionId("abc123");
    const [, mac] = signed.split(".");
    const tampered = `otro-id-distinto.${mac}`;
    expect(verifySignedSessionId(tampered)).toBeNull();
  });

  it("rechaza un valor sin firma", () => {
    expect(verifySignedSessionId("solo-un-id-sin-punto")).toBeNull();
  });

  it("rechaza una firma con el formato correcto pero inválida", () => {
    expect(verifySignedSessionId("abc123.firma-inventada-que-no-matchea")).toBeNull();
  });
});
