import type { SVGProps } from "react";
import artwork from "../lib/hero-couple-paths.json";

type Layer = (typeof artwork.paths)[number];

const backHair = new Set([5, 11, 302, 303, 305, 306, 310, 311]);
const maleDetails = new Set([307, 309, 312]);

function layerPath(layer: Layer, fragment = "") {
  return (
    <path
      key={layer.id}
      {...(layer as SVGProps<SVGPathElement>)}
      id={`inv-hero-${layer.id}${fragment}`}
      data-original-id={layer.id}
    />
  );
}

function layers(from: number, to: number, hem = false) {
  return artwork.paths.slice(from, to).map((layer, offset) => {
    const index = from + offset;
    return !hem && backHair.has(index) ? (
      <g key={layer.id}>
        <g clipPath="url(#inv-hero-hair-root)">
          {layerPath(layer)}
        </g>
        <g className="inv-couple-hair" data-part="Hair">
          <g clipPath="url(#inv-hero-hair-tip)">
            {layerPath(layer, "-tip")}
          </g>
        </g>
      </g>
    ) : layerPath(layer, hem ? "-hem" : "");
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
      <defs>
        {/* A small overlap prevents antialias gaps along the shared seams.
            The shear is zero at each seam, keeping roots and hands attached. */}
        <clipPath id="inv-hero-dress-body" clipPathUnits="userSpaceOnUse">
          <rect x="-64" y="-64" width="480" height="228.25" />
        </clipPath>
        <clipPath id="inv-hero-dress-hem" clipPathUnits="userSpaceOnUse">
          <rect x="-64" y="163.75" width="480" height="256" />
        </clipPath>
        <clipPath id="inv-hero-hair-root" clipPathUnits="userSpaceOnUse">
          <rect x="-64" y="-64" width="480" height="157.25" />
        </clipPath>
        <clipPath id="inv-hero-hair-tip" clipPathUnits="userSpaceOnUse">
          <rect x="-64" y="92.75" width="480" height="256" />
        </clipPath>
      </defs>
      <g className="inv-couple-motion">
        <g className="inv-couple-float">
          <g className="inv-couple-sway">
            <g opacity={artwork.opacity}>
              <g className="inv-couple-body inv-couple-female" data-part="Female">
                <g clipPath="url(#inv-hero-dress-body)">
                  {layers(0, 157)}
                </g>
                <g className="inv-couple-dress" data-part="Dress">
                  <g clipPath="url(#inv-hero-dress-hem)">
                    {layers(0, 157, true)}
                  </g>
                </g>
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
      </g>
      {/* Reduced motion uses the unclipped original, not segmented fragments. */}
      <g className="inv-couple-rest">
        <g opacity={artwork.opacity}>
          {artwork.paths.slice(0, 313).map((layer) => layerPath(layer, "-rest"))}
        </g>
        {layerPath(artwork.paths[313], "-rest")}
      </g>
    </svg>
  );
}
