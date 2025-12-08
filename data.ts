
import { CelestialBodyConfig } from './types';

export const CELESTIAL_BODIES: CelestialBodyConfig[] = [
  {
    name: "Sun",
    type: "star",
    radius: 4.0, 
    // Fiery Palette: Bright Yellow, Deep Orange, Red, Dark Red
    colors: ["#FFF700", "#FF8C00", "#FF4500", "#8B0000"], 
    hasRings: false,
    textureType: "noise"
  },
  {
    name: "Mercury",
    type: "planet",
    radius: 1.5,
    colors: ["#A5A5A5", "#8C8C8C", "#686868", "#4A4A4A"],
    hasRings: false,
    textureType: "noise"
  },
  {
    name: "Venus",
    type: "planet",
    radius: 2.8,
    colors: ["#F5DEB3", "#E6C288", "#D2B48C", "#FFFACD"], 
    hasRings: false,
    textureType: "noise"
  },
  {
    name: "Earth",
    type: "planet",
    radius: 3.0,
    // Realistic Earth Palette (Blue Marble Style)
    colors: [
        "#020614", // 0 Deepest Ocean (Almost Black/Blue)
        "#0a2452", // 1 Mid Ocean (Navy)
        "#1c6ba0", // 2 Shallow Water (Teal/Blue)
        "#0f2b0f", // 3 Deep Forest (Dark Green)
        "#3a5f28", // 4 Grassland (Green)
        "#827054", // 5 Mountain/Desert (Brown/Beige)
        "#ffffff"  // 6 Cloud/Ice (White)
    ], 
    hasRings: false,
    textureType: "noise"
  },
  {
    name: "Moon",
    type: "moon",
    radius: 1.0,
    colors: ["#D3D3D3", "#A9A9A9", "#808080", "#F5F5F5"],
    hasRings: false,
    textureType: "noise"
  },
  {
    name: "Mars",
    type: "planet",
    radius: 2.2,
    colors: ["#8B0000", "#B22222", "#CD5C5C", "#E9967A"], 
    hasRings: false,
    textureType: "noise"
  },
  {
    name: "Jupiter",
    type: "planet",
    radius: 4.5,
    colors: ["#8B4513", "#D2691E", "#F4A460", "#FFE4B5", "#A0522D"], 
    hasRings: false,
    textureType: "banded"
  },
  {
    name: "Saturn",
    type: "planet",
    radius: 3.8,
    colors: ["#D8C398", "#C7B283", "#BDB76B", "#8B7355"], 
    hasRings: true,
    ringColors: ["#C0C0C0", "#D2B48C", "#8B4513"],
    textureType: "banded"
  },
  {
    name: "Uranus",
    type: "planet",
    radius: 3.2,
    colors: ["#E0FFFF", "#AFEEEE", "#7FFFD4", "#40E0D0"], 
    hasRings: true,
    ringColors: ["#E0FFFF", "#AFEEEE"],
    textureType: "solid"
  },
  {
    name: "Neptune",
    type: "planet",
    radius: 3.2,
    colors: ["#000080", "#0000CD", "#191970", "#4169E1"], 
    hasRings: false,
    textureType: "noise" 
  },
  {
    name: "Pluto",
    type: "planet",
    radius: 0.8,
    colors: ["#F5DEB3", "#D2B48C", "#C0C0C0", "#FFF8DC"],
    hasRings: false,
    textureType: "noise"
  }
];
