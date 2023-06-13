# 5ch log downloader

[![Deno Test](https://github.com/y-moriya/5chlog/actions/workflows/deno_test.yml/badge.svg)](https://github.com/y-moriya/5chlog/actions/workflows/deno_test.yml)

5ch の特定のスレッドをダウンロードして、commeonで読み込めるxmlファイルに変換します。

また、別途 yt-dlp を用意することで YouTube の動画をダウンロードし、開始時刻を合わせてxmlファイルを生成できます。

## Install

作成中

## Usage

- 動画情報の取得には `config.json` に YouTube Data API の API Key が必要です。
- API Key は Google Cloud Console から YouTube Data API v3 を有効化して API Key を作成してください。
- 動画のダウンロードには yt-dlp を別途インストールして Path を通してください。

`src/main.ts` に YouTube 動画の ID とスレッドURLを渡して実行してください。

```shell
$ 5chlog.exe -v video_id -t url
```

デフォルトでは `dist` フォルダに動画ファイルとxmlファイルが出力されます。 `-o` で出力先ディレクトリを指定できるほか、 `config.json` の `distDir` の設定を変更することでデフォルトの出力先を変更できます。

`list` フォルダに `[video_id].txt` を配置すると `-t` を指定しなかった場合にそのファイルからスレッドURLを取得します。改行区切りでスレッドURLを記載しておいてください。

```list/video_id_hogehoge.txt
https://hogehoge.com/thread_url1
https://hogehoge.com/thread_url2
https://hogehoge.com/thread_url3
```

```shell
$ 5chlog.exe -v video_id_hogehoge
```

## Development

### Test

```bash
$ deno test -A
```

## Lisence

This project is licensed under the MIT License.
