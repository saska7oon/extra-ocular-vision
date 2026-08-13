/**
 * Vitest setup file — runs before every test suite.
 *
 * Adds custom matchers from @testing-library/jest-dom.
 *
 * Also installs fake-indexeddb globally (before any module that imports Dexie
 * is evaluated), so the storage-layer tests can open an in-memory IndexedDB.
 */

import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
