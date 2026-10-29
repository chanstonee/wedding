import type { SVGProps } from "react";
import artwork from "../lib/hero-couple-paths.json";

type Layer = (typeof artwork.paths)[number];

// Keep the original paint order. These are separate interior folds, not the
// continuous silhouette that also draws the bride's arm and bodice.
const dressFolds = new Set([
  107, 109, 110, 114, 115, 117, 118, 119, 120, 121, 123, 124, 125,
  126, 127, 129, 130, 131, 133, 135, 136, 140, 145, 146, 148, 150,
  151, 152, 153, 154, 155,
]);
const backHair = new Set([5, 11, 302, 303, 305, 306, 310, 311]);
const maleDetails = new Set([307, 309, 312]);

function layerPath(layer: Layer) {
  return (
    <path
      key={layer.id}
      {...(layer as SVGProps<SVGPathElement>)}
      id={`inv-hero-${layer.id}`}
      data-original-id={layer.id}
    />
  );
}

function layers(from: number, to: number) {
  return artwork.paths.slice(from, to).map((layer, offset) => {
    const index = from + offset;
    const detail = backHair.has(index) ? "hair" : dressFolds.has(index) ? "dress" : null;
    return detail ? (
      <g key={layer.id} className={`inv-couple-${detail}`} data-part={detail === "hair" ? "Hair" : "Dress"}>
        {layerPath(layer)}
      </g>
    ) : layerPath(layer);
  });
}

export default function HeroCouple() {
  return (
    <svg
      className="inv-couple-art"
      width={artwork.width}
      height={artwork.height}
      viewBox={artwork.viewBox}
      preserveAspectRatio="none"
      fill="none"
      role="img"
      aria-label="손을 맞잡고 춤추는 신랑과 신부"
      focusable="false"
    >
      <g className="inv-couple-float">
        <g className="inv-couple-sway">
          <g opacity={artwork.opacity}>
            <g className="inv-couple-body inv-couple-female" data-part="Female">
              {layers(0, 157)}
            </g>
            <g className="inv-couple-body inv-couple-male" data-part="Male">
              {layers(157, 301)}
            </g>
            <g className="inv-couple-heart" data-part="Decoration">
              {layerPath(artwork.paths[301])}
            </g>
            {/* These final original details must remain above both figures. */}
            {artwork.paths.slice(302, 313).map((layer, offset) => {
              const index = 302 + offset;
              const person = maleDetails.has(index) ? "male" : "female";
              return (
                <g key={layer.id} className={`inv-couple-body inv-couple-${person}`} data-part={person === "male" ? "Male" : "Female"}>
                  {layers(index, index + 1)}
                </g>
              );
            })}
          </g>
        </g>
      </g>
      <g className="inv-couple-star" data-part="Decoration">
        {layerPath(artwork.paths[313])}
      </g>
    </svg>
  );
}
