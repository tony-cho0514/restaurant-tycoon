import { won, manwon, pct, pp } from '../../src/ui/format';

test('돈 표기', () => { expect(won(1234000)).toBe('1,234,000원'); expect(won(-500)).toBe('-500원'); expect(manwon(20_000_000)).toBe('2,000만 원'); });

test('비율 표기', () => { expect(pct(0.433)).toBe('43.3%'); expect(pp(-3.616)).toBe('−3.6%p'); expect(pp(1.25)).toBe('+1.3%p'); });
