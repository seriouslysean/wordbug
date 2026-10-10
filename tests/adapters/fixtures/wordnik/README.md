# Wordnik fixtures

Constructed, not recorded: no response here was captured from the live API. Each file is the body of a `GET /word.json/{word}/definitions` response, built from the `Definition`, `ExampleUsage`, `Related` and `TextPron` models in Wordnik's published OpenAPI spec (<https://developer.wordnik.com/api-docs/swagger.json>), plus `wordnikUrl`, which the adapter reads but the spec does not list.

- `amblypygi.json`: the part of speech, text, attribution, source dictionary and URL of the stored demo record `data/demo/words/2023/20230106.json`, with the empty lists the spec's list fields allow.
- `break.json`: invented text. It carries `textProns` objects, `relatedWords` objects of the types `synonym`, `antonym` and `same-context` (values of the spec's `relationshipTypes` enum; the canonical definition has no field for the last) and a `variant` with no `words`, an example, text split into fragments (the adapter's `WordnikDefinition` type allows an array; the spec types `text` as a string), and two values of the spec's `partOfSpeech` filter enum: `verb-transitive`, which the adapter maps to `verb`, and `idiom`, which it keeps as a label.

Replace a file with a recorded response when one is available.
