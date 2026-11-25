import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("combina clases y resuelve conflictos de Tailwind", () => {
    expect(cn("px-2", "px-4", { "text-primary-600": true })).toBe(
      "px-4 text-primary-600",
    );
  });

  it("ignora valores falsy", () => {
    expect(cn("rounded-xl", false && "hidden", undefined, null)).toBe(
      "rounded-xl",
    );
  });
});
