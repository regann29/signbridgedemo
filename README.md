# SignBridge

SignBridge helps people who use sign language and people who don't understand it talk to each other more easily. It runs in a web browser and needs no special equipment, only a webcam.

## The problem

Many people who use sign language have trouble in everyday moments, like talking to a shopkeeper, a bank teller or a new colleague, because most people never learned to sign. This can leave them feeling left out or dependent on someone else to speak for them.

## What SignBridge does

**1. Turns signs into words and speech**
Hold a sign up to your webcam and SignBridge shows it as text on the screen. You can then press a button to hear the words read out loud. This lets someone who signs "speak" to a person who doesn't understand signs.

**2. Lets you teach it your own signs**
SignBridge doesn't come with signs built in. You show it each sign a few times, and it learns to recognize it. This means it can be set up for the signs you actually use, such as the alphabet or common words.

**3. Helps with simple tasks by voice or typing**
You can say or type short requests like "hello", "help" or "read this out loud". It only does a small, safe list of things, and it always asks before opening a website.

**4. Keeps everything in one place**
All the signed words, spoken words and replies appear together in one conversation list, so nothing gets lost.

## Who it helps

- People who use sign language and want to be understood by more people
- Family, friends, teachers and shop staff who don't know sign language
- People who find it easier to speak or type than to use a mouse and keyboard
- Schools and community groups looking for a simple way to learn about accessibility

## What it cannot do yet

SignBridge is an early prototype. It recognizes only the signs you teach it, one hand at a time. It does not understand full sign language, which also uses hand movement, facial expressions and sentence structure. We will keep improving it.

## Your privacy

- Your camera video stays on your own device. It is never saved or sent anywhere.
- The camera and microphone only turn on when you press the Start button.
- Your conversation disappears when you close the page.
- Voice recognition in some browsers may send your speech to the browser company's service to turn it into text.

## How to try it

You need a computer with a webcam and the Chrome or Edge browser.

1. Download this project and open a terminal in its folder.
2. Run: `python -m http.server 8000`
3. Open `http://localhost:8000` in your browser.
4. Go to **Sign to speech**, start the camera, and teach it at least two signs. Record each one twice.
5. Press **Start recognition** and begin signing.

The first time you start the camera, you need an internet connection so the hand-tracking tool can download.

## For developers

Run the automated checks with `npm install` and then `npm test`. These tests cover the app's logic and screens. They do not test the live camera or voice, so please try those by hand.

**Next steps:** support for signs that involve movement, support for two hands, and a tool to train the app on larger sets of signs.
