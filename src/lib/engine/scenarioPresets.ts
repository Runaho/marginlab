import type { AnchorPoint } from '../engine/types';

export interface PathTemplate {
  id: string;
  nameKey: string;
  descriptionKey: string;
  icon: 'trending-down' | 'trending' | 'shield-check' | 'wallet';
  tradePath: AnchorPoint[];
  portfolioPath: AnchorPoint[];
}

/**
 * Eğitsel preset'ler. Kullanıcı path editor'de "Şablon uygula" dediğinde
 * draft scenario bu path'lerle dolar. Düzenlenebilir başlangıç noktalarıdır,
 * hard-coded sonuç değildir.
 */
export const PATH_PRESETS: PathTemplate[] = [
  {
    id: 'sharp-drop',
    nameKey: 'presetSharpDropName',
    descriptionKey: 'presetSharpDropDesc',
    icon: 'trending-down',
    tradePath: [
      { day: 0, changePct: 0 },
      { day: 1, changePct: -0.5 },
      { day: 30, changePct: -0.5 }
    ],
    portfolioPath: [
      { day: 0, changePct: 0 },
      { day: 1, changePct: -0.1 },
      { day: 30, changePct: -0.1 }
    ]
  },
  {
    id: 'gradual',
    nameKey: 'presetGradualName',
    descriptionKey: 'presetGradualDesc',
    icon: 'trending',
    tradePath: [
      { day: 0, changePct: 0 },
      { day: 30, changePct: -0.5 }
    ],
    portfolioPath: [
      { day: 0, changePct: 0 },
      { day: 30, changePct: -0.1 }
    ]
  },
  {
    id: 'v-shape',
    nameKey: 'presetVShapeName',
    descriptionKey: 'presetVShapeDesc',
    icon: 'shield-check',
    tradePath: [
      { day: 0, changePct: 0 },
      { day: 10, changePct: -0.5 },
      { day: 20, changePct: -0.2 },
      { day: 30, changePct: -0.05 }
    ],
    portfolioPath: [
      { day: 0, changePct: 0 },
      { day: 10, changePct: -0.1 },
      { day: 20, changePct: -0.03 },
      { day: 30, changePct: 0 }
    ]
  },
  {
    id: 'flat',
    nameKey: 'presetFlatName',
    descriptionKey: 'presetFlatDesc',
    icon: 'wallet',
    tradePath: [
      { day: 0, changePct: 0 },
      { day: 30, changePct: 0 }
    ],
    portfolioPath: [
      { day: 0, changePct: 0 },
      { day: 30, changePct: 0 }
    ]
  }
];

export function getPreset(id: string): PathTemplate | undefined {
  return PATH_PRESETS.find((p) => p.id === id);
}