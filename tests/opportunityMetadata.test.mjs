import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/opportunityMetadata.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { resolveDeadlineFacts } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const opportunities = JSON.parse(await readFile(new URL('../src/data/opportunities.json', import.meta.url), 'utf8'));
const fact = (en, value = 'January 20, 2027', az = 'Son tarix', azValue = '20 yanvar 2027') => ({
  label: { en, az }, value: { en: value, az: azValue },
});

test('all current opportunities retain non-deadline facts and resolve the primary deadline once', () => {
  for (const opportunity of opportunities) {
    const original = JSON.stringify(opportunity);
    const result = resolveDeadlineFacts(opportunity.deadline, opportunity.detailFacts);
    assert.equal(JSON.stringify(opportunity), original, 'does not mutate source content');
    for (const item of opportunity.detailFacts ?? []) {
      if (!/deadline/i.test(item.label.en)) assert.ok(result.detailFacts.includes(item), `${opportunity.slug}: ${item.label.en}`);
    }
    const matches = (opportunity.detailFacts ?? []).filter(item => /deadline/i.test(item.label.en));
    if (matches.length === 1) {
      assert.deepEqual(result.primaryDeadline, matches[0], opportunity.slug);
      assert.ok(!result.detailFacts.includes(matches[0]), opportunity.slug);
    }
  }
});

test('NASA keeps its precise bilingual submission deadline and event date range', () => {
  const opportunity = opportunities.find(item => item.slug === 'nasa-space-apps-2026');
  const result = resolveDeadlineFacts(opportunity.deadline, opportunity.detailFacts);
  assert.match(result.primaryDeadline.value.az, /23:59/);
  assert.match(result.primaryDeadline.value.en, /11:59 p.m./);
  assert.equal(result.primaryDeadline.label.en, 'Submission deadline');
  assert.ok(result.detailFacts.includes(opportunity.detailFacts[0]));
});

test('preserves registration and submission as distinct milestones even on the same day', () => {
  const registration = fact('Registration deadline');
  const submission = fact('Submission deadline');
  const result = resolveDeadlineFacts('2027-01-20', [registration, submission]);
  assert.equal(result.primaryDeadline, undefined, 'ambiguous generic date is not assigned to either milestone');
  assert.deepEqual(result.detailFacts, [registration, submission]);
});

test('merges synonymous deadlines and prioritizes exact time without removing other dates', () => {
  const plain = fact('Application deadline');
  const precise = fact('Apply by', 'January 20, 2027 at 13:00 Baku time', 'Müraciətin son tarixi', '20 yanvar 2027, saat 13:00');
  const event = fact('Event date');
  const submission = fact('Submission deadline', 'January 31, 2027', 'Təqdimetmə son tarixi', '31 yanvar 2027');
  const result = resolveDeadlineFacts('2027-01-20', [plain, precise, event, submission]);
  assert.deepEqual(result.primaryDeadline.value, precise.value);
  assert.deepEqual(result.detailFacts, [event, submission]);
});

test('preserves conflicting times, unknown labels, ranges, qualifiers, and bilingual date mismatches', () => {
  for (const facts of [
    [fact('Deadline', 'January 20, 2027 at 12:00', 'Son tarix', '20 yanvar 2027, 12:00'), fact('Deadline', 'January 20, 2027 at 13:00', 'Son tarix', '20 yanvar 2027, 13:00')],
    [fact('Early application deadline')],
    [fact('Deadline', 'January 19–20, 2027', 'Son tarix', '19–20 yanvar 2027')],
    [fact('Deadline', 'January 20, 2027', 'Son tarix', '21 yanvar 2027')],
    [fact('Deadline', 'Check official source', 'Son tarix', 'Rəsmi mənbəyə baxın')],
  ]) {
    const result = resolveDeadlineFacts('2027-01-20', facts);
    assert.equal(result.primaryDeadline, undefined);
    assert.deepEqual(result.detailFacts, facts);
  }
});

test('handles absent metadata, no generic date, and ISO-formatted values', () => {
  assert.deepEqual(resolveDeadlineFacts(null), { primaryDeadline: undefined, detailFacts: [] });
  const deadline = fact('Deadline', '2027-01-20', 'Son tarix', '2027-01-20');
  assert.deepEqual(resolveDeadlineFacts('2027-01-20', [deadline]).primaryDeadline, deadline);
  assert.deepEqual(resolveDeadlineFacts(null, [deadline]).detailFacts, [deadline]);
});
