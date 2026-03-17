<p align="center">
  <img src="build/Mini Pomodoro.svg" width="128" alt="Mini Pomodoro icon"/>
</p>

<h1 align="center">Mini Pomodoro</h1>

<p align="center">
  A minimal, always-on-top Pomodoro timer that sits quietly on the edge of your screen.
</p>

<table align="center">
  <tr>
    <td align="center">
      <a href="https://github.com/skymen/mini-pomodoro/releases/latest/download/Mini.Pomodoro-1.2.0-universal.dmg">
        <br/>
        <img src="build/badges/apple.svg" height="32" alt="macOS"/>
        <br/>
        <img src="https://placehold.co/230x30/171414/ff2d2d?text=macOS%20download&font=montserrat" width="200" alt="Download for macOS"/>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/skymen/mini-pomodoro/releases/latest/download/Mini.Pomodoro.Setup.1.2.0.exe">
        <br/>
        <img src="build/badges/windows.svg" height="32" alt="Windows"/>
        <br/>
        <img src="https://placehold.co/230x30/171414/ff2d2d?text=Windows%20download&font=montserrat" width="200" alt="Download for Windows"/>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/skymen/mini-pomodoro/releases/latest/download/Mini.Pomodoro-1.2.0.x86_64.AppImage">
        <br/>
        <img src="build/badges/linux.svg" height="32" alt="Linux"/>
        <br/>
        <img src="https://placehold.co/230x30/171414/ff2d2d?text=Linux%20download&font=montserrat" width="200" alt="Download for Linux"/>
      </a>
    </td>
  </tr>
</table>

<p align="center">
  <img src="assets/dark red.png" width="280" alt="Mini Pomodoro — dark red theme"/>
  <img src="assets/light pink.png" width="280" alt="Mini Pomodoro — light pink theme"/>
</p>

---

Mini Pomodoro is a translucent desktop widget that docks to the edge of your screen and tucks itself away when you don't need it. It tracks focus sessions with a Pomodoro timer and keeps a simple drag-and-drop task list — nothing more, nothing less.

- **Always on top** — visible on every workspace and virtual desktop
- **Docks & auto-tucks** — slides into the screen edge after a short delay, peeking out with a small arrow or mini timer
- **Pin to stay** — pin the window so it stays expanded and never tucks away
- **Pomodoro timer** — configurable focus/break durations with session tracking
- **Inline task list** — add, reorder (drag-and-drop), edit, and check off tasks
- **Satisfying feedback** — subtle sounds and smooth animations for every interaction
- **Dark & light themes** — follows your system preference, or pick manually

---

## Customization

Pick any accent color — choose from presets or use the color picker for any shade you like. Toggle the accent-themed arrow and mini timer to make the collapsed indicator match.

<p align="center">
  <img src="assets/dark red.png" width="180"/>
  <img src="assets/light pink.png" width="180"/>
  <img src="assets/dark yellow.png" width="180"/>
  <img src="assets/light blue.png" width="180"/>
</p>

When the app is tucked away, the arrow and mini timer take on your accent color too:

<p align="center">
  <img src="assets/arrow red.png" height="36"/>
  <img src="assets/arrow pink.png" height="36"/>
  <img src="assets/arrow yellow.png" height="36"/>
  <img src="assets/arrow blue.png" height="36"/>
  <img src="assets/arrow red inverted.png" height="36"/>
  <img src="assets/arrow pink inverted.png" height="36"/>
  <img src="assets/arrow yellow inverted.png" height="36"/>
  <img src="assets/arrow blue inverted.png" height="36"/>
</p>

<p align="center">
  <img src="assets/timer red.png" />
  <img src="assets/timer pink.png" />
  <img src="assets/timer yellow.png" />
  <img src="assets/timer blue.png" />
  <img src="assets/timer red inverted.png" />
  <img src="assets/timer pink inverted.png" />
  <img src="assets/timer yellow inverted.png" />
  <img src="assets/timer blue inverted.png" />
</p>

---

## Settings

<p align="center">
  <img src="assets/settings.png" width="280" alt="Settings panel"/>
</p>

### Appearance

| Setting                 | Description                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| **Theme**               | Switch between **Light**, **Dark**, or **Auto** (follows your OS).                              |
| **Accent color**        | Choose from 7 presets (red, orange, amber, green, blue, purple, pink) or pick any custom color. |
| **Accent-themed arrow** | Inverts the colors on the arrow so that the arrow is the one using the accent color.            |
| **Accent-themed clock** | Inverts the colors on the mini-timer so that the mini-timer is the one using the accent color.  |

### Timer

| Setting         | Description                                                     |
| --------------- | --------------------------------------------------------------- |
| **Focus**       | Duration of each focus session (1.2.0 min, default 25).         |
| **Short break** | Break between sessions (1–60 min, default 5).                   |
| **Long break**  | Break after completing all sessions (1–60 min, default 15).     |
| **Sessions**    | Number of focus sessions before a long break (1–12, default 4). |

### Behaviour

| Setting                         | Description                                                                                                                                                     |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Show timer when collapsed**   | Display a mini countdown ring on the screen edge while the timer is running and the app is tucked.                                                              |
| **Auto-hide after timer alert** | Automatically tuck the app back after it pops out to notify you a phase ended.                                                                                  |
| **Undock on**                   | Choose **Hover** (expand on mouse-over) or **Click** (expand only when clicked).                                                                                |
| **Interaction area**            | Controls how much of the tucked strip responds to your mouse: **Full** (entire strip), **Smaller** (arrow + timer + edge), or **Arrow** (arrow and timer only). |

#### Docking

The app docks to whichever screen edge you drag it to and tucks itself away automatically:

<p align="center">
  <img src="assets/show docking.gif" width="260" alt="Docking demo"/>
</p>

#### Interaction area

The interaction area setting lets you control exactly how much of the collapsed strip reacts to your cursor:

<p align="center">
  <img src="assets/show interaction.gif" width="280" alt="Interaction area demo"/>
</p>

---

## Development

```bash
npm install       # install dependencies
npm start         # build + launch the app
npm run dev        # watch mode (rebuild on changes)
npm run dist       # package for your platform
```

## Contributing

Contributions are welcome. Fork the repo, create a branch, and open a PR. Keep changes focused and test on at least one platform before submitting.

## License

ISC
