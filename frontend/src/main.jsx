import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  CssBaseline,
  Divider,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from "@mui/material";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import LinkRounded from "@mui/icons-material/LinkRounded";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import MovieRounded from "@mui/icons-material/MovieRounded";
import MusicNoteRounded from "@mui/icons-material/MusicNoteRounded";
import TranslateRounded from "@mui/icons-material/TranslateRounded";
import HighQualityRounded from "@mui/icons-material/HighQualityRounded";
import BoltRounded from "@mui/icons-material/BoltRounded";
import SecurityRounded from "@mui/icons-material/SecurityRounded";
import ArrowOutwardRounded from "@mui/icons-material/ArrowOutwardRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import "./styles.css";

const theme = createTheme({
  palette: {
    mode: "dark",
    background: { default: "#0b1020", paper: "#121a2d" },
    primary: { main: "#a99bff", contrastText: "#17142b" },
    secondary: { main: "#ff8278" },
    success: { main: "#72ddb0" },
    text: { primary: "#f6f7ff", secondary: "#9ba7c1" },
    divider: "rgba(178,190,226,.14)",
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: '"DM Sans",sans-serif',
    button: { textTransform: "none", fontWeight: 700 },
    h1: { fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700 },
    h2: { fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700 },
  },
  components: {
    MuiButton: {
      styleOverrides: { root: { borderRadius: 12, padding: "12px 17px" } },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
  },
});

function duration(s) {
  if (s == null) return "";
  s = Number(s);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

async function apiError(r) {
  try {
    return (await r.json()).detail || "Something went wrong. Please try again.";
  } catch {
    return "Something went wrong. Please try again.";
  }
}

function App() {
  const [url, setUrl] = useState("");
  const [video, setVideo] = useState(null);
  const [mode, setMode] = useState(0);
  const [quality, setQuality] = useState(720);
  const [subtitleLanguage, setSubtitleLanguage] = useState("en");
  const [automaticSubtitles, setAutomaticSubtitles] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function fetchVideo(e) {
    e?.preventDefault();
    setError("");
    setSuccess("");

    if (!url.trim()) return setError("Paste a YouTube link first.");

    let p;
    try {
      p = new URL(url.trim());
    } catch {
      return setError("That does not look like a valid URL.");
    }

    if (
      ![
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtu.be",
        "www.youtube-nocookie.com",
      ].includes(p.hostname.toLowerCase())
    ) {
      return setError("Please enter a supported YouTube link.");
    }

    setBusy("info");
    setVideo(null);

    try {
      const r = await fetch("/api/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!r.ok) throw Error(await apiError(r));
      setVideo(await r.json());
    } catch (e) {
      setError(e.message || "Could not fetch video details.");
    } finally {
      setBusy("");
    }
  }

  async function download(requestedMode) {
    // Never treat a React click event as the download mode.
    if (requestedMode !== "video" && requestedMode !== "audio" && requestedMode !== "subtitle") {
      requestedMode = mode === 0 ? "video" : "audio";
    }
    if (!video) return setError("Fetch a video first.");

    setError("");
    setSuccess("");
    setBusy("download");

    try {
      const r = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: video.webpage_url || url.trim(),
          mode: requestedMode,
          quality,
          language: subtitleLanguage,
          automatic_subtitles: automaticSubtitles,
        }),
      });

      if (!r.ok) throw Error(await apiError(r));

      const blob = await r.blob();
      const disposition = r.headers.get("Content-Disposition") || "";
      const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const basicMatch = disposition.match(/filename="?([^";]+)"?/i);

      const fallbackTitle = (video.title || "youtube-download")
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
        .trim();

      const extension = requestedMode === "video" ? "mp4" : requestedMode === "audio" ? "mp3" : "vtt";
      const name = utf8Match
        ? decodeURIComponent(utf8Match[1])
        : basicMatch
          ? basicMatch[1]
          : `${fallbackTitle}.${extension}`;

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
      setSuccess(requestedMode === "subtitle" ? "Your subtitle file has been prepared." : "Your download has been prepared.");
    } catch (e) {
      setError(e.message || "Download failed. Check FFmpeg and try again.");
    } finally {
      setBusy("");
    }
  }

  const downloadLabel = mode === 0 ? "Download video" : "Download audio";

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box className="app-shell">
        <Box className="glow glow-a" />
        <Box className="glow glow-b" />

        <AppBar position="static" elevation={0} color="transparent" className="nav-bar">
          <Toolbar className="nav-toolbar">
            <Stack direction="row" alignItems="center" spacing={1.2}>
              <Avatar variant="rounded" className="brand-logo">
                <PlayArrowRounded />
              </Avatar>
              <Typography className="brand-name">
                clipnest<span>.</span>
              </Typography>
            </Stack>

            <Stack direction="row" spacing={3} className="nav-links">
              <Button color="inherit" href="#features">Features</Button>
              <Button color="inherit" href="#how">How it works</Button>
            </Stack>

            <Chip
              icon={<span className="status-dot" />}
              label="Simple & fast"
              variant="outlined"
              className="status-chip"
            />
          </Toolbar>
        </AppBar>

        <Container maxWidth="md" className="main-container">
          <Box className="hero">
            <Chip
              icon={<AutoAwesomeRounded />}
              label="YOUR PERSONAL MEDIA TOOLKIT"
              className="eyebrow-chip"
            />

            <Typography variant="h1" className="hero-title">
              Your videos.
              <br />
              <span>Your way.</span>
            </Typography>

            <Typography className="hero-subtitle">
              One link is all it takes. Paste a YouTube URL, choose your format,
              and get ready to go offline.
            </Typography>

            <Paper
              component="form"
              onSubmit={fetchVideo}
              elevation={0}
              className="url-panel"
            >
              <Typography className="field-label">VIDEO LINK</Typography>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.2}
                alignItems="stretch"
              >
                <TextField
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste your YouTube link here..."
                  aria-label="YouTube URL"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LinkRounded color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  color="secondary"
                  disabled={busy === "info"}
                  endIcon={
                    busy === "info" ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <ArrowOutwardRounded />
                    )
                  }
                  className="fetch-button"
                >
                  {busy === "info" ? "Fetching…" : "Fetch video"}
                </Button>
              </Stack>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                spacing={1}
                className="input-caption"
              >
                <Stack direction="row" alignItems="center" spacing={0.7}>
                  <SecurityRounded fontSize="small" />
                  <Typography>
                    Only save content you have permission to download
                  </Typography>
                </Stack>
                <Typography className="supported-text">
                  YouTube links supported
                </Typography>
              </Stack>
            </Paper>

            {error && (
              <Alert
                severity="error"
                onClose={() => setError("")}
                className="feedback-alert"
              >
                {error}
              </Alert>
            )}

            {success && (
              <Alert
                severity="success"
                onClose={() => setSuccess("")}
                className="feedback-alert"
              >
                {success}
              </Alert>
            )}

            {video && (
              <Card elevation={0} className="video-card">
                {busy === "download" && (
                  <LinearProgress className="download-progress" />
                )}

                <CardContent className="video-card-content">
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    mb={2}
                  >
                    <Typography className="section-label">YOUR VIDEO</Typography>
                    <Chip
                      icon={<CheckCircleRounded />}
                      label="Link ready"
                      size="small"
                      className="ready-chip"
                    />
                  </Stack>

                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    className="video-details"
                  >
                    <Box className="thumbnail-wrap">
                      {video.thumbnail && (
                        <img
                          src={video.thumbnail}
                          alt={video.title || "Video thumbnail"}
                        />
                      )}
                      <Chip
                        label={duration(video.duration)}
                        size="small"
                        className="duration-chip"
                      />
                    </Box>

                    <Box flex={1} minWidth={0} className="video-info">
                      <Typography className="video-type">YOUTUBE VIDEO</Typography>
                      <Typography variant="h6" className="video-title">
                        {video.title}
                      </Typography>
                      <Typography color="text.secondary" variant="body2">
                        {video.uploader}
                      </Typography>
                      <Button
                        href={video.webpage_url || url}
                        target="_blank"
                        rel="noreferrer"
                        endIcon={<ArrowOutwardRounded />}
                        className="original-link"
                      >
                        Open original video
                      </Button>
                    </Box>
                  </Stack>

                  <Divider sx={{ my: 2.5 }} />

                  <Typography className="section-label">CHOOSE YOUR FORMAT</Typography>
                  <Typography
                    color="text.secondary"
                    variant="body2"
                    sx={{ mt: 0.7, mb: 2 }}
                  >
                    Pick video quality or download audio. Subtitle downloads are available below the video options.
                  </Typography>

                  <Tabs
                    value={mode}
                    onChange={(_, v) => setMode(v)}
                    variant="fullWidth"
                    className="format-tabs"
                  >
                    <Tab
                      icon={<MovieRounded />}
                      iconPosition="start"
                      label={
                        <Box textAlign="left">
                          <b>Video</b>
                          <small>MP4 format</small>
                        </Box>
                      }
                    />
                    <Tab
                      icon={<MusicNoteRounded />}
                      iconPosition="start"
                      label={
                        <Box textAlign="left">
                          <b>Audio</b>
                          <small>MP3 format</small>
                        </Box>
                      }
                    />
                  </Tabs>

                  {mode === 0 && (
                    <Box className="quality-block">
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        mb={1.2}
                      >
                        <HighQualityRounded color="primary" fontSize="small" />
                        <Typography className="field-label">VIDEO QUALITY</Typography>
                      </Stack>
                      <Stack direction="row" gap={1} flexWrap="wrap">
                        {[360, 480, 720, 1080].map((q) => (
                          <Button
                            key={q}
                            onClick={() => setQuality(q)}
                            variant={quality === q ? "contained" : "outlined"}
                            className={`quality-button ${quality === q ? "chosen" : ""}`}
                          >
                            {q}p
                            {q === 720 && <span className="popular">Popular</span>}
                          </Button>
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {mode === 0 && (
                    <Box className="subtitle-options" sx={{ mt: 2.5 }}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        mb={1.2}
                      >
                        <TranslateRounded color="primary" fontSize="small" />
                        <Typography className="field-label">
                          SUBTITLE LANGUAGE
                        </Typography>
                      </Stack>

                      <FormControl fullWidth size="small">
                        <InputLabel id="subtitle-language-label">
                          Language
                        </InputLabel>
                        <Select
                          labelId="subtitle-language-label"
                          value={subtitleLanguage}
                          label="Language"
                          onChange={(e) => setSubtitleLanguage(e.target.value)}
                        >
                          <MenuItem value="en">English</MenuItem>
                          <MenuItem value="hi">Hindi</MenuItem>
                          <MenuItem value="mr">Marathi</MenuItem>
                          <MenuItem value="es">Spanish</MenuItem>
                          <MenuItem value="fr">French</MenuItem>
                          <MenuItem value="de">German</MenuItem>
                          <MenuItem value="ja">Japanese</MenuItem>
                          <MenuItem value="pt">Portuguese</MenuItem>
                        </Select>
                      </FormControl>

                      <FormControlLabel
                        sx={{ mt: 1, ml: 0, color: "text.secondary" }}
                        control={
                          <Checkbox
                            checked={automaticSubtitles}
                            onChange={(e) => setAutomaticSubtitles(e.target.checked)}
                          />
                        }
                        label="Use auto-generated subtitles"
                      />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        sx={{ mt: 0.5 }}
                      >
                        We’ll try regular captions first, then auto-generated captions for the selected language if needed.
                      </Typography>
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => download("subtitle")}
                        disabled={busy === "download"}
                        startIcon={busy === "download" ? <CircularProgress size={18} /> : <TranslateRounded />}
                        sx={{ mt: 1.5 }}
                      >
                        {busy === "download" ? "Preparing download…" : "Download subtitles (.vtt)"}
                      </Button>
                    </Box>
                  )}

                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => download(mode === 0 ? "video" : "audio")}
                    disabled={busy === "download"}
                    startIcon={
                      busy === "download" ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <DownloadRounded />
                      )
                    }
                    endIcon={
                      busy === "download" ? null : <ArrowOutwardRounded />
                    }
                    className="download-button"
                    sx={{ mt: 2.5 }}
                  >
                    {busy === "download"
                      ? "Preparing your download…"
                      : downloadLabel}
                  </Button>

                  <Typography className="download-footnote">
                    Downloads are processed by your FastAPI server.
                  </Typography>
                </CardContent>
              </Card>
            )}

            <Stack
              direction={{ xs: "column", sm: "row" }}
              className="trust-row"
              spacing={3}
            >
              <Stack direction="row" alignItems="center" spacing={1.2}>
                <Avatar className="trust-icon"><HighQualityRounded /></Avatar>
                <Box><b>Quality options</b><small>Choose your resolution</small></Box>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1.2}>
                <Avatar className="trust-icon coral"><BoltRounded /></Avatar>
                <Box><b>Simple workflow</b><small>Just paste and go</small></Box>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1.2}>
                <Avatar className="trust-icon blue"><SecurityRounded /></Avatar>
                <Box><b>Private by design</b><small>No account required</small></Box>
              </Stack>
            </Stack>
          </Box>

          <Box id="features" className="lower-section">
            <Typography className="section-label">MADE TO BE SIMPLE</Typography>
            <Typography variant="h2" className="lower-title">
              A little less hassle.
              <br />
              <span>A lot more flexibility.</span>
            </Typography>
            <Box className="feature-grid">
              <Paper elevation={0} className="feature-card">
                <Avatar className="feature-avatar purple"><MovieRounded /></Avatar>
                <Typography variant="h6">Your format, your choice</Typography>
                <Typography color="text.secondary">
                  Choose MP4 video, MP3 audio, or subtitles with a couple of clicks.
                </Typography>
              </Paper>
              <Paper elevation={0} className="feature-card">
                <Avatar className="feature-avatar coral"><BoltRounded /></Avatar>
                <Typography variant="h6">A clean workflow</Typography>
                <Typography color="text.secondary">
                  No clutter. Just your link, your options, and your download.
                </Typography>
              </Paper>
              <Paper elevation={0} className="feature-card">
                <Avatar className="feature-avatar blue"><SecurityRounded /></Avatar>
                <Typography variant="h6">Right on your device</Typography>
                <Typography color="text.secondary">
                  Use the interface on desktop or mobile browsers.
                </Typography>
              </Paper>
            </Box>
          </Box>

          <Box id="how" className="lower-section how-section">
            <Typography className="section-label">THREE SIMPLE STEPS</Typography>
            <Typography variant="h2" className="lower-title">
              From link to saved.
            </Typography>
            <Box className="steps-grid">
              {[
                ["01", "Paste a link", "Copy a supported YouTube URL."],
                ["02", "Pick your format", "Choose video, audio, or subtitles."],
                ["03", "Download", "Save the file to your device."],
              ].map(([n, t, d]) => (
                <Box className="step-item" key={n}>
                  <Typography className="step-number">{n}</Typography>
                  <Typography variant="h6">{t}</Typography>
                  <Typography color="text.secondary">{d}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Container>

        <Box component="footer" className="footer">
          <Stack direction="row" alignItems="center" spacing={1}>
            <Avatar variant="rounded" className="brand-logo small-logo">
              <PlayArrowRounded />
            </Avatar>
            <Typography className="brand-name">clipnest<span>.</span></Typography>
          </Stack>
          <Typography>Made for a simpler media workflow.</Typography>
          <Typography className="footer-note">
            Respect creators. Download only content you’re authorized to save.
          </Typography>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

createRoot(document.getElementById("root")).render(<App />);
