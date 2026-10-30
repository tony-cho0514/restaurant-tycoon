import { FX_BASE, IMPORT_PASS_THROUGH, VEG_SEASONAL } from './balance';

export type IngredientId =
  | 'flour' | 'mozzarella' | 'tomatoSauce' | 'pepperoni' | 'veg' | 'box' | 'cola' | 'cola500'
  | 'potato' | 'bulgogi' | 'sweetPotato' | 'pineapple' | 'ham';

export interface IngredientDef {
  name: string;
  unit: string;
  basePrice: number;
  imported: boolean;
  seasonal: boolean;
  shelfLifeDays: number;
  storageMaxDays: number;
}

export const INGREDIENTS: Record<IngredientId, IngredientDef> = {
  flour: { name: '밀가루', unit: 'kg', basePrice: 1500, imported: true, seasonal: false, shelfLifeDays: 90, storageMaxDays: 45 },
  mozzarella: { name: '모짜렐라 치즈', unit: 'kg', basePrice: 12000, imported: true, seasonal: false, shelfLifeDays: 60, storageMaxDays: 30 },
  tomatoSauce: { name: '토마토소스', unit: 'kg', basePrice: 6000, imported: true, seasonal: false, shelfLifeDays: 45, storageMaxDays: 30 },
  pepperoni: { name: '페퍼로니', unit: 'kg', basePrice: 20000, imported: true, seasonal: false, shelfLifeDays: 45, storageMaxDays: 30 },
  veg: { name: '채소 믹스', unit: 'kg', basePrice: 5000, imported: false, seasonal: true, shelfLifeDays: 5, storageMaxDays: 7 },
  box: { name: '피자 박스', unit: '개', basePrice: 700, imported: false, seasonal: false, shelfLifeDays: 365, storageMaxDays: 60 },
  cola: { name: '콜라 1.25L', unit: '병', basePrice: 1300, imported: false, seasonal: false, shelfLifeDays: 180, storageMaxDays: 30 },
  cola500: { name: '콜라 500ml(서비스용)', unit: '병', basePrice: 800, imported: false, seasonal: false, shelfLifeDays: 180, storageMaxDays: 30 },
  potato: { name: '감자', unit: 'kg', basePrice: 3000, imported: false, seasonal: false, shelfLifeDays: 14, storageMaxDays: 14 },
  bulgogi: { name: '불고기', unit: 'kg', basePrice: 18000, imported: false, seasonal: false, shelfLifeDays: 5, storageMaxDays: 5 },
  sweetPotato: { name: '고구마무스', unit: 'kg', basePrice: 8000, imported: false, seasonal: false, shelfLifeDays: 10, storageMaxDays: 10 },
  pineapple: { name: '파인애플(통조림)', unit: 'kg', basePrice: 7000, imported: true, seasonal: false, shelfLifeDays: 30, storageMaxDays: 30 },
  ham: { name: '햄', unit: 'kg', basePrice: 11000, imported: true, seasonal: false, shelfLifeDays: 20, storageMaxDays: 20 },
};

export const INGREDIENT_IDS = Object.keys(INGREDIENTS) as IngredientId[];

export function ingredientPrice(
  id: IngredientId,
  ctx: { fx: number; inflation: number; month: number; shockMult: number; noise: number },
): number {
  const def = INGREDIENTS[id];
  const fxFactor = def.imported ? Math.pow(ctx.fx / FX_BASE, IMPORT_PASS_THROUGH) : 1;
  const seasonFactor = def.seasonal ? VEG_SEASONAL[ctx.month] : 1;
  return Math.round(def.basePrice * ctx.inflation * fxFactor * seasonFactor * ctx.shockMult * ctx.noise);
}
