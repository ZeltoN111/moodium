import { withAlpha } from '../constants/color';

describe('withAlpha', () => {
  it('turns a hex colour into rgba with the given alpha', () => {
    expect(withAlpha('#8F8CFF', 0.5)).toBe('rgba(143, 140, 255, 0.5)');
    expect(withAlpha('07080c', 1)).toBe('rgba(7, 8, 12, 1)');
  });

  it('leaves anything else untouched', () => {
    expect(withAlpha('rgba(1,2,3,0.4)', 1)).toBe('rgba(1,2,3,0.4)');
  });
});
