import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 18,
          background: "#E8A33D",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#1B1A1F",
          fontFamily: "monospace",
          fontWeight: "bold",
          borderRadius: "4px",
        }}
      >
        P
      </div>
    ),
    {
      ...size,
    }
  );
}
