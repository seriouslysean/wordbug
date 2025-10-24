# Current Focus

## Active Task
Address missing locale entry for newly added part-of-speech value (`initialism`) to restore successful builds.

## Acceptance Criteria
- `locales/en.json` includes a translation for the `initialism` part of speech.
- Required validation commands (lint, typecheck, test, build) complete without errors.

## Files Modified
- `locales/en.json`

## Progress Notes
- Identified that `t('parts_of_speech.initialism')` fails during page metadata generation because the key is not defined in the English locale file.

## Related Documentation
- [Improvements Backlog](./improvements-backlog.md)
- [Technical Documentation](./technical.md)
- [AGENTS.md](../AGENTS.md)
