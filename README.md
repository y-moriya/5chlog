# 5ch log downloader

[![Deno Test](https://github.com/y-moriya/5chlog/actions/workflows/deno_test.yml/badge.svg)](https://github.com/y-moriya/5chlog/actions/workflows/deno_test.yml)

5ch
の特定のスレッドをダウンロードして、commeonで読み込めるxmlファイルに変換します。

また、別途 yt-dlp を用意することで YouTube
の動画をダウンロードし、開始時刻を合わせてxmlファイルを生成できます。

## Install

Releases ページから自分の環境に合った zip
ファイルをダウンロードし、任意のフォルダに解凍してください。`config.json` の
`youtubeApiKey` に自分で取得した YouTube Data API の API Key
を設定する必要があります。

## Usage

- 動画情報の取得には `config.json` に YouTube Data API の API Key が必要です。
- API Key は Google Cloud Console から YouTube Data API v3 を有効化して API Key
  を作成してください。
- 動画のダウンロードには yt-dlp を別途インストールして Path を通してください。

### 動画IDおよびスレッドURLを指定してDL

`5chlog.exe` に YouTube 動画の ID
とスレッドURLを渡して実行してください。スレッドは>>1に記載されている前スレッドのURLを辿りながら再帰的にスレッドを取得します。一連の実況スレッドの最後のURLを渡すとよいでしょう。

```windows
$ 5chlog.exe -v video_id -t url
```

デフォルトでは `dist` フォルダに動画ファイルとxmlファイルが出力されます。 `-o`
で出力先ディレクトリを指定できるほか、 `config.json` の `distDir`
の設定を変更することでデフォルトの出力先を変更できます。

### スレッドURLの一覧をテキストファイルに用意してDL

`list` フォルダに `[video_id].txt` を配置すると `-t`
を指定しなかった場合にそのファイルからスレッドURLを取得します。改行区切りでスレッドURLを記載しておいてください。

```list/video_id_hogehoge.txt
https://hogehoge.com/thread_url1
https://hogehoge.com/thread_url2
https://hogehoge.com/thread_url3
```

```shell
$ 5chlog.exe -v video_id_hogehoge
```

### その他オプション一覧

| Option  | Alias | Default Value     | Description                                                                                                                      |
| ------- | ----- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| videoId | v     | N/A (required)    | YouTubeの動画IDを指定します。                                                                                                    |
| thread  | t     | "" (empty string) | スレッドのURLを指定します。空文字列の場合、`list/${videoId}` ファイルにある改行区切りのスレッドURL一覧ファイルから読み込みます。 |
| output  | o     | `config.distDir`  | 出力先ディレクトリを指定します。デフォルトでは、設定ファイルに定義されたディレクトリが使用されます。                             |
| start   | s     | "" (empty string) | フィルタリング開始時間を指定します。指定しない場合、動画の配信開始時間が使用されます。                                           |
| end     | e     | "" (empty string) | フィルタリング終了時間を指定します。指定しない場合、動画の配信終了時間が使用されます。                                           |
| cache   | c     | `false`           | スレッドのキャッシュを使用するかどうかを指定します。`true`を指定すると、キャッシュが使用されます。                               |

## Development

### Test

```bash
$ deno test -A
```

### Release

- Create a pull request
  - with a title that includes `Release`
  - with a branch name of vX.Y.Z
- Upon merging the PR, a release is automatically created via GitHub Actions
  - The contents of the PR are documented on the release page

## Lisence

This project is licensed under the MIT License.
