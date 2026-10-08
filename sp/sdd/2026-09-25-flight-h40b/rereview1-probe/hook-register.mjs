// Registers hook.mjs so the UNMODIFIED guard-r09-cal.mjs imports a broken stub instead of guard-r09.mjs.
// R09_STUB unset = pass-through control.
import { register } from 'node:module';
register('./hook.mjs', { parentURL: import.meta.url, data: { stub: process.env.R09_STUB || null } });
