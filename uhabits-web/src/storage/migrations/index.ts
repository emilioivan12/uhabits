import m09 from "./09.sql?raw";
import m10 from "./10.sql?raw";
import m11 from "./11.sql?raw";
import m12 from "./12.sql?raw";
import m13 from "./13.sql?raw";
import m14 from "./14.sql?raw";
import m15 from "./15.sql?raw";
import m16 from "./16.sql?raw";
import m17 from "./17.sql?raw";
import m18 from "./18.sql?raw";
import m19 from "./19.sql?raw";
import m20 from "./20.sql?raw";
import m21 from "./21.sql?raw";
import m22 from "./22.sql?raw";
import m23 from "./23.sql?raw";
import m24 from "./24.sql?raw";
import m25 from "./25.sql?raw";

export const MIGRATIONS: Record<number, string> = {
  9: m09,
  10: m10,
  11: m11,
  12: m12,
  13: m13,
  14: m14,
  15: m15,
  16: m16,
  17: m17,
  18: m18,
  19: m19,
  20: m20,
  21: m21,
  22: m22,
  23: m23,
  24: m24,
  25: m25,
};

export const LATEST_VERSION = 25;
