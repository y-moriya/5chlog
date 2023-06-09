# 5ch log downloader

[![Deno Test](https://github.com/y-moriya/5chlog/actions/workflows/deno_test.yml/badge.svg)](https://github.com/y-moriya/5chlog/actions/workflows/deno_test.yml)

5ch の特定のスレッドをダウンロードして、commeonで読み込めるxmlファイルに変換します。

また、別途 yt-dlp を用意することで YouTube の動画をダウンロードし、開始時刻を合わせてxmlファイルを生成できます。

## Usage

### スレッドデータのみDL

`src/5chlog.ts` にスレッドURLとユニークな名称を渡して実行してください。

スレッドは>>1に記載の前スレURLを辿りながら再帰的に取得するため、最後のスレッドURLを渡すとよいです。

結果は `xml` ディレクトリに出力されます。

```shell
$ deno run -A src/5chlog.ts thread_url title
```

開始時刻と終了時刻を渡すとその時間内で切り取った書き込みのみを出力します。

出力されるデータの vpos パラメータは開始時刻を起点として計算されます。

```shell
$ deno run -A src/5chlog.ts thread_url title 2023-03-23T10:01:29.980Z 2023-03-23T10:01:54.320Z
```

`threads` にはスレごとの json ファイルが保存され、ファイルが存在する場合は新規にダウンロードされません。 `merged`, `filtered` ディレクトリにはそれぞれの中間データが保存されています。（今後削除されるかも）

また、 `thread_url` に `cache` を指定しても同様にダウンロード済みの `threads` ディレクトリのデータを利用します。

### 動画もDL

- `config.json` に YouTube Data API の API Key が必要です。
- `config.sample.json` を `config.json` にリネームしてファイルを作成してください。
- API Key は Google Cloud Console から YouTube Data API v3 を有効化して API Key を作成してください。
- yt-dlp を別途インストールして Path を通してください。

`src/main.ts` に YouTube 動画の ID とスレッドURLを渡して実行してください。

```shell
$ deno run -A src/main.ts -v video_id -t url
```

デフォルトでは `dist` フォルダに動画ファイルとxmlファイルが出力されます。 `-o` で出力先ディレクトリを指定できるほか、 `config.json` の `distDir` の設定を変更することでデフォルトの出力先を変更できます。

`list` フォルダに `[video_id].txt` を配置すると `-t` を指定しなかった場合にそのファイルからスレッドURLを取得します。改行区切りでスレッドURLを記載しておいてください。

## Test

```bash
$ deno test -A
```

## Lisence

This project is licensed under the MIT License.
