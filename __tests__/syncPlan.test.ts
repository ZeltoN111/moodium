import { planSync, toMillis } from '../utils/syncPlan';

const empty = { push: [], pushDelete: [], pull: [], deleteLocal: [] };

describe('toMillis', () => {
  it('reads SQLite and Postgres timestamps as the same instant', () => {
    expect(toMillis('2026-03-20 08:15:00')).toBe(toMillis('2026-03-20T08:15:00+00:00'));
    expect(toMillis('garbage')).toBe(0);
  });
});

describe('planSync', () => {
  it('pushes what the cloud lacks and pulls what the device lacks', () => {
    const plan = planSync([{ date: '2026-03-01', updatedAt: 1 }], [], [{ date: '2026-03-02', updatedAt: 1, deleted: false }]);
    expect(plan).toEqual({ ...empty, push: ['2026-03-01'], pull: ['2026-03-02'] });
  });

  it('keeps the newer version of a day edited on both sides', () => {
    const local = [
      { date: 'a', updatedAt: 5 },
      { date: 'b', updatedAt: 1 },
      { date: 'c', updatedAt: 3 },
    ];
    const remote = [
      { date: 'a', updatedAt: 1, deleted: false },
      { date: 'b', updatedAt: 5, deleted: false },
      { date: 'c', updatedAt: 3, deleted: false },
    ];
    expect(planSync(local, [], remote)).toEqual({ ...empty, push: ['a'], pull: ['b'] });
  });

  it('propagates a deletion made on another device', () => {
    const plan = planSync([{ date: 'a', updatedAt: 2 }], [], [{ date: 'a', updatedAt: 3, deleted: true }]);
    expect(plan).toEqual({ ...empty, deleteLocal: ['a'] });
  });

  it('lets a later edit win over an older deletion', () => {
    const plan = planSync([{ date: 'a', updatedAt: 9 }], [], [{ date: 'a', updatedAt: 3, deleted: true }]);
    expect(plan).toEqual({ ...empty, push: ['a'] });
  });

  it('sends a local deletion to the cloud, unless the cloud copy is newer', () => {
    const tombstones = [
      { date: 'a', deletedAt: 5 },
      { date: 'b', deletedAt: 1 },
    ];
    const remote = [
      { date: 'a', updatedAt: 2, deleted: false },
      { date: 'b', updatedAt: 4, deleted: false },
    ];
    expect(planSync([], tombstones, remote)).toEqual({ ...empty, pushDelete: ['a'], pull: ['b'] });
  });

  it('ignores cloud tombstones for days the device never had', () => {
    expect(planSync([], [], [{ date: 'a', updatedAt: 1, deleted: true }])).toEqual(empty);
  });
});
