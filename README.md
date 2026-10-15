# ClipNest --- YouTube Media Downloader

ClipNest is a web application with a **React + Vite + Material UI**
frontend and a **FastAPI + yt-dlp** backend. Paste a supported YouTube
URL, preview the video details, and choose to download video, audio, or
available subtitles.

> **Responsible use:** Only download content that you own or have
> permission to save. Respect copyright, YouTube's Terms of Service, and
> applicable laws. This project is provided for learning and personal
> development; you are responsible for how you use it.

## Features

-   Responsive dark-themed user interface built with React and Material
    UI.
-   YouTube URL validation in the frontend and backend.
-   Video metadata preview, including title, thumbnail, duration, and
    channel/uploader.
-   Video downloads with selectable resolution: 360p, 480p, 720p, or
    1080p (subject to source availability).
-   Audio downloads as MP3.
-   Subtitle downloads in WebVTT (`.vtt`) where YouTube exposes
    compatible captions.
-   Subtitle language selection, including English, Hindi, Marathi,
    Spanish, French, German, Japanese, and Portuguese in the current UI.
-   Attempts to use manually uploaded captions first, then
    auto-generated captions for the selected language unless the
    auto-generated option is explicitly selected.
-   Downloaded filenames are based on the video title when available.
-   Loading indicators and user-facing error messages.
-   Temporary backend output files are cleaned up after a response is
    sent or when a download fails.

## Technology stack

### Frontend

-   React 19
-   Vite 7
-   Material UI 7
-   Emotion
-   JavaScript (ES modules)

### Backend

-   Python
-   FastAPI
-   Uvicorn
-   yt-dlp
-   Pydantic (through FastAPI)
-   FFmpeg for merging video/audio streams and extracting MP3 audio

## Project structure

``` text
clipnest_mui/
├── backend/
│   ├── app.py                 # FastAPI routes and yt-dlp processing
│   └── requirements.txt       # Python dependencies
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js         # Vite dev server and /api proxy
│   └── src/
│       ├── main.jsx           # React application
│       └── styles.css         # Application styling
├── .gitignore                # Recommended: keep local files/secrets out of Git
└── README.md
```

## Requirements

Install the following before running the project:

-   **Python 3.10 or newer** (a currently supported Python version is
    recommended).
-   **Node.js LTS and npm**.
-   **Git**, if you plan to use GitHub.
-   **FFmpeg**, required for MP3 extraction and for merging separate
    video and audio streams into MP4.
-   A working internet connection for fetching video information and
    downloading media.

Check your installed versions:

``` powershell
python --version
node --version
npm --version
git --version
ffmpeg -version
```

If `ffmpeg -version` is not recognized, install FFmpeg and make sure its
executable is available in your system `PATH`. On Windows, use the
official FFmpeg download instructions or a trusted package manager.
Restart your terminal after updating `PATH`.

## Run locally on Windows

Open the project folder in VS Code. Use **two separate PowerShell
terminals**: one for the backend and one for the frontend.

### 1. Set up and run the backend

From the project root:

``` powershell
cd backend
python -m venv ytd
.\ytd\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python -m uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

The API should be available at:

-   API base: `http://127.0.0.1:8000`
-   Interactive API documentation: `http://127.0.0.1:8000/docs`
-   OpenAPI schema: `http://127.0.0.1:8000/openapi.json`

Keep this terminal open while using the app.

**If PowerShell blocks virtual-environment activation:** you can run the
environment's Python directly instead:

``` powershell
.\ytd\Scripts\python.exe -m pip install -r requirements.txt
.\ytd\Scripts\python.exe -m uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

### 2. Set up and run the frontend

Open a second PowerShell terminal and go to the frontend folder from the
project root:

``` powershell
cd frontend
npm install
npm run dev
```

Open the local address printed by Vite. With the current Vite
configuration, it is normally:

`http://127.0.0.1:5173`

The Vite development server proxies `/api` requests to
`http://127.0.0.1:8000`. Keep both backend and frontend terminals
running.

### 3. Use the app

1.  Open the frontend in your browser.
2.  Paste a supported YouTube video URL.
3.  Select **Fetch video** to retrieve its metadata.
4.  Choose the **Video** or **Audio** tab.
5.  For video, choose the desired resolution.
6.  To download subtitles, use the subtitle section beneath the video
    quality options, select a language, and choose whether to request
    auto-generated captions.
7.  Click the relevant download button and wait for the browser to save
    the file.

Available formats and resolutions depend on the source video and the
captions YouTube makes available.

## API endpoints

The current backend exposes the following routes.

### `POST /api/info`

Fetches video metadata without downloading the media.

Request body:

``` json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

Typical response:

``` json
{
  "title": "Example video title",
  "thumbnail": "https://example.com/thumbnail.jpg",
  "duration": 123,
  "uploader": "Example channel",
  "webpage_url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

The values above are illustrative. Actual metadata is returned by yt-dlp
and varies by video.

### `POST /api/download`

Downloads the requested media or subtitle file and returns it as a file
response.

Video request:

``` json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "mode": "video",
  "quality": 720,
  "language": "en",
  "automatic_subtitles": false
}
```

Audio request:

``` json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "mode": "audio",
  "quality": 720,
  "language": "en",
  "automatic_subtitles": false
}
```

Subtitle request:

``` json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "mode": "subtitle",
  "quality": 720,
  "language": "en",
  "automatic_subtitles": false
}
```

Fields:

  -----------------------------------------------------------------------
  Field                   Type                    Description
  ----------------------- ----------------------- -----------------------
  `url`                   string                  Supported YouTube URL

  `mode`                  string                  `video`, `audio`, or
                                                  `subtitle`

  `quality`               integer                 Video height limit:
                                                  `360`, `480`, `720`, or
                                                  `1080`

  `language`              string                  Subtitle language code,
                                                  such as `en`, `hi`, or
                                                  `mr`

  `automatic_subtitles`   boolean                 If true, request
                                                  auto-generated
                                                  captions; otherwise,
                                                  the backend tries
                                                  manual captions first
                                                  and falls back to
                                                  auto-generated captions
                                                  for the selected
                                                  language
  -----------------------------------------------------------------------

The `quality`, `language`, and `automatic_subtitles` fields are accepted
by the request model even when they do not affect the selected mode.

### Errors

The API returns an HTTP error when a URL is unsupported, metadata cannot
be retrieved, the requested captions are unavailable, or a media
download fails. The frontend displays the returned error message.
Video/audio downloads may fail if FFmpeg is missing or not available in
`PATH`.

## Build the frontend

To create a production build of the frontend:

``` powershell
cd frontend
npm install
npm run build
```

Vite writes the production assets to `frontend/dist/`. The current setup
is a **local development configuration**: it proxies `/api` to a local
FastAPI server. A production deployment needs an intentional frontend
hosting setup and a reachable backend URL/reverse proxy.

## Git and GitHub

Create one GitHub repository for the complete project. Keep `frontend/`
and `backend/` in that same repository.

Recommended `.gitignore` at the project root:

``` gitignore
# Python
__pycache__/
*.py[cod]
.venv/
venv/
ytd/
.env
.env.*

# Node
node_modules/
frontend/dist/

# Logs and operating-system files
*.log
.DS_Store
Thumbs.db
```

Then, from the project root:

``` powershell
git init
git add .
git status
git commit -m "Initial ClipNest project"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/clipnest-youtube-downloader.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username and use the repository
URL you created. Review `git status` before committing; do not commit
secrets, credentials, virtual environments, `node_modules`, or
downloaded media.

For future changes:

``` powershell
git add .
git commit -m "Describe your changes"
git push
```

## Troubleshooting

### `ffmpeg` is not recognized

Install FFmpeg, add its `bin` directory to the Windows `PATH`, open a
new terminal, and verify:

``` powershell
ffmpeg -version
```

Restart the backend after installing it.

### Frontend cannot reach the API

-   Make sure FastAPI is running on `127.0.0.1:8000`.
-   Make sure Vite is running on `127.0.0.1:5173`.
-   Check that `frontend/vite.config.js` still proxies `/api` to
    `http://127.0.0.1:8000`.
-   Review the backend terminal for errors.

### No subtitles found

Not every video has downloadable captions in every language. Try another
language or enable the auto-generated captions option. The backend can
only download captions that YouTube makes available through yt-dlp; it
does not generate new translations.

### Video or audio download fails

-   Update yt-dlp in the active Python environment:

    ``` powershell
    python -m pip install --upgrade yt-dlp
    ```

-   Check that FFmpeg is installed and available in `PATH`.

-   Try a supported public video URL and another available resolution.

-   Read the error in the UI and the backend terminal. YouTube may
    change its delivery mechanisms, and some videos may be restricted,
    age-gated, private, region-limited, or otherwise unavailable.

### PowerShell activation error

Use the direct interpreter commands shown in the backend setup section,
or adjust the execution policy only if you understand the security
implications of that change.

### Git says `remote origin already exists`

Update the existing remote instead of adding it again:

``` powershell
git remote set-url origin https://github.com/YOUR_USERNAME/clipnest-youtube-downloader.git
git push -u origin main
```

## Security and deployment notes

This project is intended as a local development starter. Before exposing
it publicly:

-   Add authentication or access controls if appropriate, rate limiting,
    request timeouts, and concurrency limits.
-   Limit temporary storage usage and ensure cleanup works for
    interrupted requests.
-   Restrict outbound network access and validate URLs carefully to
    reduce server-side request risks.
-   Do not expose debugging reload mode in production.
-   Configure HTTPS, logging, monitoring, and an appropriate reverse
    proxy.
-   Review the applicable copyright rules, YouTube terms, and local law.
-   Never commit secrets, credentials, or private configuration.

## License

No license is specified by this project yet. If you publish the
repository publicly, add a license only after deciding how you want
others to use, modify, and redistribute the code.
