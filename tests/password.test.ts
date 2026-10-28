import { describe, expect, it } from "vitest";

import { hashPassword, validatePasswordStrength, verifyPassword } from "@/server/auth/password";

describe("hash de senha", () => {
  it("gera hash bcrypt verificável", async () => {
    const hash = await hashPassword("SenhaForte123");
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
    expect(await verifyPassword("SenhaForte123", hash)).toBe(true);
    expect(await verifyPassword("outra-senha", hash)).toBe(false);
  });
});

describe("política de senha", () => {
  it("aceita senha forte", () => {
    expect(validatePasswordStrength("SenhaForte123")).toBeNull();
  });

  it.each([
    ["Curta1", "ao menos 10"],
    ["semmaiusculas123", "maiúsculas"],
    ["SemNumerosAqui", "número"],
  ])("rejeita %s", (password, expected) => {
    expect(validatePasswordStrength(password)).toContain(expected);
  });
});
