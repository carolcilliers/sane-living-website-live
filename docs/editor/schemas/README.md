# Proposed schemas and examples

These JSON Schema 2020-12 documents are architecture artifacts, not runtime application code. They validate envelopes only. Full server validation must additionally enforce component-specific props/variants, safe URL/CSS/media contexts, unique IDs, depth/total-node limits, allowed binding keys/resources, page permissions, route ownership, selected revision validity and publication scope.

`page-document.schema.json` pairs with `../examples/about-layout.example.json`. `publication-request.schema.json` pairs with `../examples/publication-request.example.json`. IDs/hashes/revisions in examples are synthetic. Do not submit them to production.

The structural schema deliberately cannot prove that an About resource, image, staff actor, preview or publication revision exists. Passing these schemas is one validation layer, not the publication gate. Add real component schemas and semantic tests in E02.
