/**
 * Curated Tabler icons registry. The icon picker grid renders THIS subset only — it would
 * be wasteful to dynamic-import 5800 icons. Add new icons here as needed.
 *
 * Icons are stored by string name (e.g. "IconCar") on `categories.icon` / `subcategories.icon`,
 * and resolved at render time via `getIcon()`.
 */
import {
  IconApps,
  IconArmchair,
  IconBabyCarriage,
  IconBarbell,
  IconBolt,
  IconBowl,
  IconBrain,
  IconBrandApple,
  IconBrandNetflix,
  IconBrandOpenai,
  IconBrandYoutube,
  IconBriefcase,
  IconBuildingCommunity,
  IconBusStop,
  IconCalculator,
  IconCar,
  IconCarSuv,
  IconCash,
  IconCategory,
  IconChartLine,
  IconCloud,
  IconCode,
  IconCoin,
  IconCreditCard,
  IconDental,
  IconDeviceLaptop,
  IconDeviceMobile,
  IconDots,
  IconDroplet,
  IconFlame,
  IconGasStation,
  IconGift,
  IconGlass,
  IconHeart,
  IconHeartbeat,
  IconHome,
  IconKey,
  IconMovie,
  IconPalette,
  IconParking,
  IconPaw,
  IconPigMoney,
  IconPill,
  IconPlane,
  IconPlaneTilt,
  IconReceipt,
  IconReceiptTax,
  IconRobot,
  IconSchool,
  IconScissors,
  IconShield,
  IconShirt,
  IconShoppingBag,
  IconShoppingCart,
  IconSofa,
  IconStethoscope,
  IconTicket,
  IconTool,
  IconToolsKitchen2,
  IconToolsKitchen3,
  IconTruckDelivery,
  IconUserPlus,
  IconUsers,
  IconWallet,
  IconWifi,
} from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';

export const iconRegistry: Record<string, Icon> = {
  IconApps, IconArmchair, IconBabyCarriage, IconBarbell, IconBolt, IconBowl, IconBrain,
  IconBrandApple, IconBrandNetflix, IconBrandOpenai, IconBrandYoutube,
  IconBriefcase, IconBuildingCommunity, IconBusStop, IconCalculator,
  IconCar, IconCarSuv, IconCash, IconCategory, IconChartLine, IconCloud,
  IconCode, IconCoin, IconCreditCard, IconDental, IconDeviceLaptop,
  IconDeviceMobile, IconDots, IconDroplet, IconFlame, IconGasStation,
  IconGift, IconGlass, IconHeart, IconHeartbeat, IconHome, IconKey,
  IconMovie, IconPalette, IconParking, IconPaw, IconPigMoney, IconPill,
  IconPlane, IconPlaneTilt, IconReceipt, IconReceiptTax, IconRobot,
  IconSchool, IconScissors, IconShield, IconShirt, IconShoppingBag,
  IconShoppingCart, IconSofa, IconStethoscope, IconTicket, IconTool,
  IconToolsKitchen2, IconToolsKitchen3, IconTruckDelivery, IconUserPlus,
  IconUsers, IconWallet, IconWifi,
};

export function getIcon(name: string | null | undefined): Icon {
  if (name && iconRegistry[name]) return iconRegistry[name];
  return IconCategory;
}

export const iconNames = Object.keys(iconRegistry);

export const categoryColors = [
  '#f97316', '#ea580c', '#ef4444', '#f43f5e', '#ec4899', '#a855f7', '#8b5cf6',
  '#6366f1', '#3b82f6', '#06b6d4', '#0ea5e9', '#14b8a6', '#22c55e', '#84cc16',
  '#eab308', '#f59e0b', '#64748b', '#94a3b8', '#475569',
];
