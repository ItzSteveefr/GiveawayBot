import assert from 'node:assert/strict';
import test from 'node:test';
import * as listModule from './list.js';

const buildGiveaway = (id: number, name: string, createdAt: Date) => ({
  id,
  name,
  winnerCount: 1,
  endsAt: new Date('2026-04-05T00:00:00.000Z'),
  createdAt
});

test('buildGiveawayListPages sorts newest first and splits before the embed limit', () => {
  const buildPages = (listModule as Record<string, unknown>).buildGiveawayListPages as
    | ((giveaways: Array<{ id: number; name: string; winnerCount: number; endsAt: Date; createdAt: Date }>) => string[])
    | undefined;
  const oversizedName = 'x'.repeat(1700);
  const pages = buildPages!([
    buildGiveaway(1, `Oldest ${oversizedName}`, new Date('2026-04-01T00:00:00.000Z')),
    buildGiveaway(3, `Newest ${oversizedName}`, new Date('2026-04-03T00:00:00.000Z')),
    buildGiveaway(2, `Middle ${oversizedName}`, new Date('2026-04-02T00:00:00.000Z'))
  ]);

  assert.equal(pages.length, 2);
  assert.match(pages[0], /Newest/);
  assert.match(pages[0], /Middle/);
  assert.doesNotMatch(pages[0], /Oldest/);
  assert.match(pages[1], /Oldest/);
  for (const page of pages) {
    assert.ok(page.length <= 3800);
  }
});

test('getWrappedGiveawayPageIndex wraps previous and next navigation', () => {
  const getPageIndex = (listModule as Record<string, unknown>).getWrappedGiveawayPageIndex as
    | ((currentPage: number, direction: 'previous' | 'next', totalPages: number) => number)
    | undefined;

  assert.equal(getPageIndex!(0, 'previous', 3), 2);
  assert.equal(getPageIndex!(2, 'next', 3), 0);
  assert.equal(getPageIndex!(1, 'next', 3), 2);
});
