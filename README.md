# 5ch log downloader

[![Deno Test](https://github.com/y-moriya/5chlog/actions/workflows/deno_test.yml/badge.svg)](https://github.com/y-moriya/5chlog/actions/workflows/deno_test.yml)

5ch の特定のスレッドをダウンロードして、commeonで読み込めるxmlファイルに変換します。

## Usage

main.ts にスレッドURLとユニークな名称を渡して実行する。

スレッドは>>1に記載の前スレURLを辿りながら再帰的に取得するため、最後のスレッドURLを渡すとよい。

結果は `xml` ディレクトリに出力される。

```bash
$ deno run -A src/main.ts thread_url title
```

開始時刻と終了時刻を渡すとその時間内で切り取った書き込みのみを出力する。

出力されるデータの vpos パラメータは開始時刻を起点として計算されます。

```bash
$ deno run -A src/main.ts thread_url title 2023-03-23T10:01:29.980Z 2023-03-23T10:01:54.320Z
```

`threads` にはスレごとの json ファイルが保存され、ファイルが存在する場合は新規にダウンロードされません。 `merged`, `filtered` ディレクトリにはそれぞれの中間データが保存される。（今後削除されるかも）

## Test

```bash
$ deno test -A
```

## Lisence

This project is licensed under the MIT License.
