# Credits

Third-party data and assets used by this project.

## WordNet

Word-level relations (synonyms, antonyms, and related terms) are derived from
[WordNet](https://wordnet.princeton.edu/), a lexical database of English from
Princeton University. Lookups run at capture time against the bundled WordNet
database ([`wordnet-db`](https://www.npmjs.com/package/wordnet-db) via
[`wordpos`](https://www.npmjs.com/package/wordpos)); the results are stored in
each word's JSON, so the site build stays offline.

> WordNet 3.0 Copyright 2006 by Princeton University. All rights reserved.
>
> Permission to use, copy, modify and distribute this software and database and
> its documentation for any purpose and without fee or royalty is hereby
> granted, provided that you agree to comply with the following copyright notice
> and statements, including the disclaimer, and that the same appear on ALL
> copies of the software, database and documentation, including modifications
> that you make for internal use or for distribution.
>
> THIS SOFTWARE AND DATABASE IS PROVIDED "AS IS" AND PRINCETON UNIVERSITY MAKES
> NO REPRESENTATIONS OR WARRANTIES, EXPRESS OR IMPLIED. BY WAY OF EXAMPLE, BUT
> NOT LIMITATION, PRINCETON UNIVERSITY MAKES NO REPRESENTATIONS OR WARRANTIES OF
> MERCHANTABILITY OR FITNESS FOR ANY PARTICULAR PURPOSE OR THAT THE USE OF THE
> LICENSED SOFTWARE, DATABASE OR DOCUMENTATION WILL NOT INFRINGE ANY THIRD PARTY
> PATENTS, COPYRIGHTS, TRADEMARKS OR OTHER RIGHTS.
>
> The name of Princeton University or Princeton may not be used in advertising or
> publicity pertaining to distribution of the software and/or database. Title to
> copyright in this software, database and any associated documentation shall at
> all times remain with Princeton University and LICENSEE agrees to preserve same.

See the full license at <https://wordnet.princeton.edu/license-and-commercial-use>.

## Wordnik

Dictionary definitions and headword data are sourced from
[Wordnik](https://www.wordnik.com/).
