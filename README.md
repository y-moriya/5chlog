# 5ch log downloader

## Usage

main.ts にスレッドURLとユニークな名称を渡して実行する。
スレッドは>>1に記載の前スレURLを辿りながら再帰的に取得するため、最後のスレッドURLを渡すとよい。

```bash
$ deno run -A src/main.ts thread_url title
```

`threads/${title}` ディレクトリに `${thread_id}.json` ファイルが出力される。
対象ディレクトリに含まれる json からメッセージのみを結合する場合は merge.ts を利用する。

```bash
$ deno run -A src/merge.ts title
```

## Test

```bash
$ deno test -A
```

## Lisence

This project is licensed under the MIT License.
