import crypto from 'crypto';

export const md5 = (text: string | number): string =>
  crypto.createHash('md5').update(String(text), 'utf8').digest('hex');

export const isProd = (): boolean => process.env.NODE_ENV === 'production';

export const isString = (val: any): boolean => typeof val === 'string';

export const parseIntIfExists = (val: any): number | undefined => (val ? parseInt(val) : undefined);

export const outOfLimit = <T>(list: T[], limit: number): T[] => {
  const offset = limit - 1;

  if (list.length > offset) {
    return list.slice(0, list.length - offset);
  }

  return [];
};

export const round = (val: number, precision = 0): number => {
  const d = Math.pow(10, precision);
  return Math.round(val * d) / d;
};
