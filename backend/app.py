import shutil
import tempfile
from pathlib import Path
from urllib.parse import urlparse

import yt_dlp
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, HttpUrl
from starlette.background import BackgroundTask

app = FastAPI(title="ClipNest API")


class VideoRequest(BaseModel):
    url: HttpUrl


class DownloadRequest(BaseModel):
    url: HttpUrl
    mode: str = "video"
    quality: int = 720
    language: str = "en"
    automatic_subtitles: bool = False


def checked_url(raw: str) -> str:
    host = (urlparse(raw).hostname or "").lower()
    allowed = {
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtu.be",
        "www.youtube-nocookie.com",
    }
    if host not in allowed:
        raise HTTPException(400, "Please enter a valid YouTube URL.")
    return raw


def subtitle_language_key(available: dict, requested: str):
    """Return the best available subtitle language key for a requested code."""
    if not available:
        return None
    requested = (requested or "en").strip().lower()
    keys = list(available.keys())
    # Exact match first, then variants such as en-US or en-orig.
    for key in keys:
        if key.lower() == requested:
            return key
    for key in keys:
        if key.lower().split("-")[0].split("_")[0] == requested:
            return key
    return None


@app.post("/api/info")
def video_info(request: VideoRequest):
    url = checked_url(str(request.url))
    try:
        options = {
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True,
            "skip_download": True,
        }
        with yt_dlp.YoutubeDL(options) as ydl:
            info = ydl.extract_info(url, download=False)
        return {
            "title": info.get("title") or "Untitled video",
            "thumbnail": info.get("thumbnail"),
            "duration": info.get("duration"),
            "uploader": info.get("uploader") or "YouTube creator",
            "webpage_url": info.get("webpage_url") or url,
        }
    except Exception as exc:
        raise HTTPException(
            400,
            f"Could not fetch video. Check the link and try again. ({str(exc)[:180]})",
        )


@app.post("/api/download")
def download_video(request: DownloadRequest):
    url = checked_url(str(request.url))
    if request.mode not in ("video", "audio", "subtitle"):
        raise HTTPException(400, "Choose video, audio, or subtitles.")
    if request.quality not in (360, 480, 720, 1080):
        raise HTTPException(400, "Unsupported quality.")

    temp_dir = tempfile.mkdtemp(prefix="clipnest_")
    template = str(Path(temp_dir) / "%(title).120B.%(ext)s")

    try:
        if request.mode == "subtitle":
            # Inspect the video first so we can gracefully fall back from manually
            # uploaded captions to auto-generated captions for the same language.
            with yt_dlp.YoutubeDL({
                "quiet": True,
                "no_warnings": True,
                "noplaylist": True,
                "skip_download": True,
            }) as ydl:
                info = ydl.extract_info(url, download=False)

            manual = info.get("subtitles") or {}
            automatic = info.get("automatic_captions") or {}
            requested_language = (request.language or "en").strip()

            manual_key = subtitle_language_key(manual, requested_language)
            auto_key = subtitle_language_key(automatic, requested_language)

            if request.automatic_subtitles:
                chosen_key = auto_key
                use_automatic = True
            elif manual_key:
                chosen_key = manual_key
                use_automatic = False
            elif auto_key:
                # A common case: the creator didn't upload captions, but YouTube
                # has generated captions. Use those instead of failing immediately.
                chosen_key = auto_key
                use_automatic = True
            else:
                available = sorted(set(manual.keys()) | set(automatic.keys()))
                if available:
                    language_list = ", ".join(available[:25])
                    detail = (
                        f"No subtitles were found for '{requested_language}'. "
                        f"Available language codes: {language_list}."
                    )
                else:
                    detail = "This video does not expose any downloadable subtitles or captions."
                raise HTTPException(400, detail)

            opts = {
                "skip_download": True,
                "writesubtitles": not use_automatic,
                "writeautomaticsub": use_automatic,
                "subtitleslangs": [chosen_key],
                "subtitlesformat": "vtt/best",
                "outtmpl": template,
                "noplaylist": True,
                "quiet": True,
                "no_warnings": True,
            }
            with yt_dlp.YoutubeDL(opts) as ydl:
                ydl.download([url])

            files = [
                p for p in Path(temp_dir).iterdir()
                if p.is_file() and p.stat().st_size > 0
                and p.suffix.lower() in {".vtt", ".srt", ".ass", ".lrc"}
            ]
            if not files:
                raise RuntimeError(
                    f"YouTube did not provide a subtitle file for '{chosen_key}'. Try another language."
                )
            output = max(files, key=lambda p: p.stat().st_mtime)
            return FileResponse(
                str(output),
                filename=output.name,
                media_type="text/vtt" if output.suffix.lower() == ".vtt" else "text/plain",
                background=BackgroundTask(shutil.rmtree, temp_dir, True),
            )

        if request.mode == "audio":
            opts = {
                "format": "bestaudio/best",
                "outtmpl": template,
                "noplaylist": True,
                "quiet": True,
                "no_warnings": True,
                "postprocessors": [{
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                    "preferredquality": "192",
                }],
            }
        else:
            opts = {
                "format": f"bestvideo[height<={request.quality}]+bestaudio/best[height<={request.quality}]",
                "outtmpl": template,
                "merge_output_format": "mp4",
                "noplaylist": True,
                "quiet": True,
                "no_warnings": True,
            }

        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.download([url])

        files = [p for p in Path(temp_dir).iterdir() if p.is_file() and p.stat().st_size > 0]
        if not files:
            raise RuntimeError("No output file was produced.")
        output = max(files, key=lambda p: p.stat().st_mtime)
        return FileResponse(
            str(output),
            filename=output.name,
            media_type="audio/mpeg" if request.mode == "audio" else "video/mp4",
            background=BackgroundTask(shutil.rmtree, temp_dir, True),
        )
    except HTTPException:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise
    except Exception as exc:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(
            500,
            f"Download failed. Check FFmpeg if downloading video/audio. ({str(exc)[:220]})",
        )
