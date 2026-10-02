import { describe, it, expect } from "vitest";
import { en } from "../en";
import { es } from "../es";
import { translate } from "..";
import { LESSONS, lessonKey } from "../../game/tutorial/lessons";

const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();

describe("i18n", () => {
  it("el español tiene exactamente las mismas claves que el inglés", () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  });

  it("cada traducción conserva los mismos {marcadores}", () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(placeholders(es[key]), key).toEqual(placeholders(en[key]));
    }
  });

  it("ninguna traducción está vacía", () => {
    for (const dict of [en, es]) {
      for (const [key, value] of Object.entries(dict)) {
        expect(value.trim().length, key).toBeGreaterThan(0);
      }
    }
  });

  it("cada lección tiene su texto en ambos idiomas", () => {
    for (const lesson of LESSONS) {
      expect(en[lessonKey(lesson.id)], lesson.id).toBeTruthy();
      expect(es[lessonKey(lesson.id)], lesson.id).toBeTruthy();
    }
  });

  it("rellena los marcadores", () => {
    expect(translate("es", "help.rolled", { a: 3, b: 5 })).toBe("Sacaste 3 y 5.");
    expect(translate("en", "help.rolled", { a: 3, b: 5 })).toBe("You rolled 3 and 5.");
  });
});
