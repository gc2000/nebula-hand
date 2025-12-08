
export enum AppState {
  LOADING = 'LOADING',
  READY = 'READY',
  ERROR = 'ERROR'
}

export interface ParticleConfig {
  count: number;
  color: string;
  size: number;
}

export interface PhraseResponse {
  phrases: string[];
}

export interface CelestialBodyConfig {
  name: string;
  type: 'star' | 'planet' | 'moon';
  radius: number;
  colors: string[]; // Palette
  hasRings: boolean;
  ringColors?: string[];
  textureType: 'banded' | 'noise' | 'solid'; // How to distribute colors
}
