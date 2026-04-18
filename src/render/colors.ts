import { Face } from "../cube/types";

/** Standard WCA color scheme. */
export type FaceColors = Record<Face, string>;

export const FACE_COLORS: FaceColors = {
  U: "#ffffff", // white
  D: "#f5f500", // yellow
  F: "#22db14", // green
  B: "#0a5cff", // blue
  R: "#e60000", // red
  L: "#ff8800", // orange
};

export const CUBIE_BODY = "#161b23";
