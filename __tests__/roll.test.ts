import { rollDirection, slotsOf } from '../utils/roll';

describe('slotsOf', () => {
  it('keys characters from the right and marks digits', () => {
    expect(slotsOf('4,5')).toEqual([
      { key: 's2', char: '4', digit: true },
      { key: 's1', char: ',', digit: false },
      { key: 's0', char: '5', digit: true },
    ]);
  });

  it('keeps the units slot stable when a digit is added in front', () => {
    expect(slotsOf('9').at(-1)?.key).toBe('s0');
    expect(slotsOf('10').at(-1)?.key).toBe('s0');
    expect(slotsOf('10')[0].key).toBe('s1');
  });
});

describe('rollDirection', () => {
  it('rolls up on increase, down on decrease, not at all otherwise', () => {
    expect(rollDirection(4, 4.5)).toBe(1);
    expect(rollDirection(7, 6.5)).toBe(-1);
    expect(rollDirection(3, 3)).toBe(0);
    expect(rollDirection(null, 3)).toBe(0);
    expect(rollDirection(3, null)).toBe(0);
  });
});
