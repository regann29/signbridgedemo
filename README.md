SignBridge

A browser prototype that turns hand signs from your webcam into text and speech, plus a voice/typed assistant with a short list of safe commands. One HTML file, no build step, no API keys.

What it does (and doesn't)
Sign to speech: MediaPipe finds 21 hand landmarks; a k-nearest-neighbour classifier compares them with signs you teach it. A stabiliser requires a steady sign before adding a letter and won't repeat it until you release.
No pretrained model is included. It recognizes only the signs you record (for example ASL letters). It does not translate full sign language; real signing also uses movement, facial expression and grammar.
Voice assistant: speech recognition (Chrome/Edge) with a typed fallback. Commands: hello, what is your name, how are you, read this text aloud / say ..., open YouTube (asks first), take a screenshot (says it's unsupported), stop listening, help, goodbye.
Conversation panel labels each entry: from signs, typed, heard by voice, assistant reply.
Run it
python -m http.server 8000

Open http://localhost:8000 in Chrome or Edge. The camera needs localhost or https; double-clicking the file won't work. The first camera start downloads the MediaPipe model, so you need internet that time.

Teach it
Sign to speech → Start camera.
Teach gestures → type a sign name → Record sign. Do at least two separate recordings per sign, moving closer and farther.
Check accuracy (tests each sample against recordings other than its own), then Start recognition. Name a sign SPACE or DEL to insert a space or delete a character. Export/import gestures as JSON. "Keep taught gestures on this device" is off by default.
Tests
npm install      # only needed for the UI smoke test (jsdom)
npm test         # 33 logic tests + 26 UI smoke checks

Logic tests cover landmark normalisation, classifier, accuracy check, import validation, stabiliser and command parsing. The UI smoke test runs in jsdom, which has no camera, MediaPipe or speech support, so live hand tracking and voice recognition are not covered by automated tests.

Privacy

Video stays on your device and is never stored or uploaded. Camera/microphone start only on your click and the camera stops when you leave the tab or page. Browser speech recognition may send audio to the browser vendor's service. Conversation text lives in the page only.

Known limits / next steps

Static signs only; one hand; k-NN gets weaker with many similar signs. Next: dynamic signs (sequences of frames), a Python training script, and two-hand support.
