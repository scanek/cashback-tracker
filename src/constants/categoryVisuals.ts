import {
  ShoppingCart,
  Utensils,
  Fuel,
  HeartPulse,
  Car,
  Shirt,
  Package,
  Tv,
  Home,
  Film,
  Sparkles,
  Coins,
  Dog,
  Plane,
  ShoppingBag,
} from 'lucide-react-native';

export interface CategoryVisual {
  Icon: any;
  color: string;
  bg: string;
}

export function getCategoryVisual(categoryName: string): CategoryVisual {
  const lower = categoryName.toLowerCase();

  if (
    lower.includes('супермаркет') ||
    lower.includes('продукт') ||
    lower.includes('еда') ||
    lower.includes('пятерочк') ||
    lower.includes('магнит') ||
    lower.includes('перекрест') ||
    lower.includes('лент') ||
    lower.includes('ашан') ||
    lower.includes('вкусвилл') ||
    lower.includes('самокат')
  ) {
    return { Icon: ShoppingCart, color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' };
  }
  if (
    lower.includes('ресторан') ||
    lower.includes('кафе') ||
    lower.includes('фастфуд') ||
    lower.includes('кофе') ||
    lower.includes('додо') ||
    lower.includes('бургер') ||
    lower.includes('пицц') ||
    lower.includes('суши')
  ) {
    return { Icon: Utensils, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' };
  }
  if (
    lower.includes('азс') ||
    lower.includes('топлив') ||
    lower.includes('бензин') ||
    lower.includes('заправк') ||
    lower.includes('лукойл') ||
    lower.includes('газпром') ||
    lower.includes('роснефт') ||
    lower.includes('teboil')
  ) {
    return { Icon: Fuel, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' };
  }
  if (
    lower.includes('аптек') ||
    lower.includes('лекарств') ||
    lower.includes('здоровь') ||
    lower.includes('медицин') ||
    lower.includes('клиник') ||
    lower.includes('еаптек')
  ) {
    return { Icon: HeartPulse, color: '#EC4899', bg: 'rgba(236, 72, 153, 0.12)' };
  }
  if (
    lower.includes('такси') ||
    lower.includes('транспорт') ||
    lower.includes('каршеринг') ||
    lower.includes('яндекс го') ||
    lower.includes('uber') ||
    lower.includes('автобус') ||
    lower.includes('метро')
  ) {
    return { Icon: Car, color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.12)' };
  }
  if (
    lower.includes('одежд') ||
    lower.includes('обув') ||
    lower.includes('вещ') ||
    lower.includes('lamoda') ||
    lower.includes('спортмастер') ||
    lower.includes('zara')
  ) {
    return { Icon: Shirt, color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)' };
  }
  if (
    lower.includes('маркетплейс') ||
    lower.includes('озон') ||
    lower.includes('ozon') ||
    lower.includes('wildberries') ||
    lower.includes('вайлдберриз') ||
    lower.includes('wb') ||
    lower.includes('мегамаркет') ||
    lower.includes('яндекс маркет')
  ) {
    return { Icon: Package, color: '#6366F1', bg: 'rgba(99, 102, 241, 0.12)' };
  }
  if (
    lower.includes('техник') ||
    lower.includes('электроник') ||
    lower.includes('мвидео') ||
    lower.includes('днс') ||
    lower.includes('dns') ||
    lower.includes('эльдорадо') ||
    lower.includes('компьютер')
  ) {
    return { Icon: Tv, color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.12)' };
  }
  if (
    lower.includes('дом') ||
    lower.includes('ремонт') ||
    lower.includes('мебель') ||
    lower.includes('леруа') ||
    lower.includes('лемана') ||
    lower.includes('петрович') ||
    lower.includes('ikea') ||
    lower.includes('хофф')
  ) {
    return { Icon: Home, color: '#D97706', bg: 'rgba(217, 119, 6, 0.12)' };
  }
  if (
    lower.includes('кино') ||
    lower.includes('развлечен') ||
    lower.includes('билет') ||
    lower.includes('театр') ||
    lower.includes('концерт') ||
    lower.includes('афиш')
  ) {
    return { Icon: Film, color: '#F43F5E', bg: 'rgba(244, 63, 94, 0.12)' };
  }
  if (
    lower.includes('косметик') ||
    lower.includes('красот') ||
    lower.includes('парфюм') ||
    lower.includes('золотое яблоко') ||
    lower.includes('лэтуаль') ||
    lower.includes('рив гош')
  ) {
    return { Icon: Sparkles, color: '#F472B6', bg: 'rgba(244, 114, 182, 0.12)' };
  }
  if (
    lower.includes('все покупк') ||
    lower.includes('на все') ||
    lower.includes('на всё') ||
    lower.includes('базов') ||
    lower.includes('любые покупк')
  ) {
    return { Icon: Coins, color: '#EAB308', bg: 'rgba(234, 179, 8, 0.12)' };
  }
  if (
    lower.includes('животн') ||
    lower.includes('зоо') ||
    lower.includes('корм') ||
    lower.includes('вет')
  ) {
    return { Icon: Dog, color: '#14B8A6', bg: 'rgba(20, 184, 166, 0.12)' };
  }
  if (
    lower.includes('путешеств') ||
    lower.includes('отел') ||
    lower.includes('авиа') ||
    lower.includes('ржд') ||
    lower.includes('билет') ||
    lower.includes('тур')
  ) {
    return { Icon: Plane, color: '#0EA5E9', bg: 'rgba(14, 165, 233, 0.12)' };
  }

  return { Icon: ShoppingBag, color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.12)' };
}

export const MANDATORY_CATEGORIES = [
  {
    name: 'Супермаркеты и продукты',
    shortName: 'Супермаркеты',
    keywords: ['супермаркет', 'продукт', 'еда', 'пятерочк', 'магнит', 'перекрест', 'лент', 'ашан', 'вкусвилл', 'самокат', 'чижик'],
  },
  {
    name: 'Аптеки и здоровье',
    shortName: 'Аптеки',
    keywords: ['аптек', 'лекарств', 'здоровь', 'медицин', 'клиник', 'еаптек', 'горздрав', 'ригла', 'вита'],
  },
  {
    name: 'АЗС и топливо',
    shortName: 'АЗС (Топливо)',
    keywords: ['азс', 'топлив', 'бензин', 'заправк', 'лукойл', 'газпром', 'роснефт', 'teboil', 'татнефть'],
  },
];

export function getCategoryPriority(categoryName: string): number {
  const lower = categoryName.toLowerCase();
  if (
    lower.includes('супермаркет') ||
    lower.includes('продукт') ||
    lower.includes('еда') ||
    lower.includes('пятерочк') ||
    lower.includes('магнит') ||
    lower.includes('перекрест') ||
    lower.includes('лент') ||
    lower.includes('ашан')
  ) {
    return 1; // 🛒 #1 Супермаркеты
  }
  if (
    lower.includes('аптек') ||
    lower.includes('лекарств') ||
    lower.includes('здоровь') ||
    lower.includes('медицин') ||
    lower.includes('еаптек')
  ) {
    return 2; // 💊 #2 Аптеки
  }
  if (
    lower.includes('азс') ||
    lower.includes('топлив') ||
    lower.includes('бензин') ||
    lower.includes('заправк') ||
    lower.includes('лукойл') ||
    lower.includes('газпром') ||
    lower.includes('роснефт') ||
    lower.includes('teboil')
  ) {
    return 3; // ⛽ #3 АЗС и Топливо
  }
  return 99; // Все остальные категории
}
