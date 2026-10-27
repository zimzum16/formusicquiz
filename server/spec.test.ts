import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import openapiTS, { astToString } from 'openapi-typescript';
import { describe, expect, it } from 'vitest';
import app, { SPEC_CONFIG } from './app.js';

const typesPath = fileURLToPath(new URL('../src/lib/api-types.ts', import.meta.url));

// Типы фронта генерируются из zod-схем роутов. Тест падает, если схему поменяли,
// а `npm run gen:types` не запустили — иначе фронт молча разойдётся с API
describe('src/lib/api-types.ts', () => {
  it('совпадает со спецификацией бэкенда', async () => {
    const spec = app.getOpenAPIDocument(SPEC_CONFIG);
    const generated = astToString(await openapiTS(JSON.parse(JSON.stringify(spec))));
    const committed = readFileSync(typesPath, 'utf8');
    expect(committed.endsWith(generated), 'api-types.ts устарел — запустите npm run gen:types').toBe(true);
  });
});
