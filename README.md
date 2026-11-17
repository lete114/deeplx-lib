# DeepLX-Lib

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![License][license-src]][license-href]

> 🌍 Powerful free DeepL API wrapper with no token required.
> Easily integrate DeepLX into any application.

## Features

- 📦 Zero dependencies, extremely lightweight
- 🌐 Supports all DeepL languages
- 💡 Targets DeepL's current anonymous `oneshot` endpoint
- 🧪 Fully tested with unit tests for reliability

## Installation

```bash
npm i deeplx-lib
# or
pnpm add deeplx-lib
# or
yarn add deeplx-lib
```

## Usage

```ts
import { parse2DeepLX, translate } from 'deeplx-lib'

const options = { from: 'EN', to: 'ZH', text: 'Hello, world!' } as const
const response = await translate(options)
const data = await response.json()

console.log(parse2DeepLX({ ...options, ...data }))
/*
{
  code: 200,
  id: 1760000000000,
  method: 'Free',
  source_lang: 'EN',
  target_lang: 'ZH',
  data: '你好，世界！',
  alternatives: null
}
*/
```

`translate()` returns the raw `Response`; its JSON body has the oneshot shape:

```json
{
  "translations": [
    {
      "detected_source_language": "en",
      "text": "你好，世界！",
      "is_language_detection_confident": false
    }
  ]
}
```

The request body sent to DeepL is:

```json
{
  "text": ["Hello, world!"],
  "target_lang": "zh-Hans",
  "source_lang": "en",
  "usage_type": "translate"
}
```

## API

### `translate(options: IOptions): Promise<Response>`

Sends a translation request to DeepL's anonymous `oneshot` endpoint.

#### Parameters

| Name   | Type              | Description       |
| ------ | ----------------- | ----------------- |
| `from` | `TSourceLanguage` | Source language   |
| `to`   | `TTargetLanguage` | Target language   |
| `text` | `string`          | Text to translate |

`from: 'AUTO'` omits `source_lang` and lets DeepL detect the source language.

If `text.length` exceeds `MAX_TEXT_LENGTH` (1500 UTF-16 code units), the request is not sent and a `413` response is returned:

```json
{
  "code": 413,
  "message": "text exceeds maximum length: 1501 characters (anonymous oneshot limit is 1500)"
}
```

Upstream `400` / `429` responses are passed through unchanged.

### `parse2DeepLX(data): IDeepLXData`

Normalizes either the oneshot response or a legacy JSON-RPC response into the DeepLX shape:

| Field          | Value                                                |
| -------------- | ---------------------------------------------------- |
| `code`         | `200`                                                |
| `id`           | upstream `id`, or `Date.now()` for oneshot responses |
| `method`       | `'Free'`                                             |
| `source_lang`  | detected language, uppercased                        |
| `target_lang`  | the requested target language                        |
| `data`         | translated text                                      |
| `alternatives` | `null`                                               |

### `getBody(options: IOptions): string`

Builds the oneshot request body. Useful if you want to perform the request with your own `fetch` implementation.

#### Example

```ts
import { DEEPL_URL, getBody } from 'deeplx-lib'

const body = getBody({
  from: 'EN',
  to: 'ZH',
  text: 'Hello, world!',
})

const response = await fetch(DEEPL_URL, {
  method: 'POST',
  body,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'None',
  },
})
```

### Language Types

```ts
// Subsequent changes may be made, see details at: https://github.com/lete114/deeplx-lib/blob/main/src/types.d.ts
export type TLanguage =
  | 'AR' | 'BG' | 'CS' | 'DA' | 'DE' | 'EL' | 'EN' | 'ES' | 'ET'
  | 'FI' | 'FR' | 'HU' | 'ID' | 'IT' | 'JA' | 'KO' | 'LT' | 'LV' | 'NB'
  | 'NL' | 'PL' | 'PT' | 'RO' | 'RU' | 'SK' | 'SL' | 'SV' | 'TR' | 'UK' | 'ZH'
export type TSourceLanguage = 'AUTO' | TLanguage
export type TTargetLanguage = TLanguage

export interface IOptions {
  from: TSourceLanguage
  to: TTargetLanguage
  text: string
}
```

### Other Exports

| Export            | Description                                 |
| ----------------- | ------------------------------------------- |
| `DEEPL_URL`       | DeepL `oneshot` endpoint                    |
| `MAX_TEXT_LENGTH` | Anonymous limit (`1500`)                    |
| `translate`       | Sends the request and returns a `Response`  |
| `parse2DeepLX`    | Normalizes the response into the DLX shape  |
| `getBody`         | Builds the request body                     |

## Limitations

- **Single text only.** The API accepts one string per request.
- **1500 characters.** The limit counts the whole request in UTF-16 code units and cannot be raised for anonymous traffic.
- **No alternatives.** DeepL no longer returns alternative translations, so `alternatives` is always `null`.
- **Server-side only.** DeepL does not send `Access-Control-Allow-Origin`, so this library cannot be called directly from a browser.
- **Unofficial endpoint.** It can change or rate-limit (HTTP 429) without notice. There is no SLA; use the official DeepL API if you need guarantees.

## Upgrading to 0.1.0

- `DEEPL_URL` now points to `https://oneshot-free.www.deepl.com/v1/translate`.
- The raw response shape changed from JSON-RPC (`result.texts`) to `translations`.
- `parse2DeepLX` returns `source_lang` / `target_lang` and always sets `alternatives` to `null`.
- `getICount`, `getTimestamp`, `getRandomNumber`, and `handlerBodyMethod` were removed.

## Testing

Unit tests are written using [Vitest](https://vitest.dev/). Run the tests with:

```bash
pnpm test
```

## License

[MIT](./LICENSE) License © [Lete114](https://github.com/lete114)

---

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/deeplx-lib?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/deeplx-lib
[npm-downloads-src]: https://img.shields.io/npm/dm/deeplx-lib?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/deeplx-lib
[bundle-src]: https://img.shields.io/bundlephobia/minzip/deeplx-lib?style=flat&colorA=080f12&colorB=1fa669&label=minzip
[bundle-href]: https://bundlephobia.com/result?p=deeplx-lib
[license-src]: https://img.shields.io/github/license/lete114/deeplx-lib.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/lete114/deeplx-lib/blob/main/LICENSE
[jsdocs-src]: https://img.shields.io/badge/jsdocs-reference-080f12?colorA=080f12&colorB=1fa669
[jsdocs-href]: https://www.jsdocs.io/package/deeplx-lib
