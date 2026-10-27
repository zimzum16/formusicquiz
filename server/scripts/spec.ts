// Печатает OpenAPI-спецификацию в stdout — источник для типов фронта (npm run gen:types в корне).
// Сервер запускать не нужно: документ собирается из zod-схем роутов
import app, { SPEC_CONFIG } from '../app.js';

process.stdout.write(JSON.stringify(app.getOpenAPIDocument(SPEC_CONFIG), null, 2));
