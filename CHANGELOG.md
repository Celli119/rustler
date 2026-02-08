## [1.0.1](https://github.com/Celli119/rustler/compare/v1.0.0...v1.0.1) (2026-02-08)


### Bug Fixes

* use semantic-release-action to properly publish release bundles ([c0ecd14](https://github.com/Celli119/rustler/commit/c0ecd14924ca67c45e0673bfa326dea3c4f18b02))

# 1.0.0 (2026-02-08)


### Bug Fixes

* add backend settings cache and prevent duplicate hotkey registration ([7323590](https://github.com/Celli119/rustler/commit/7323590e969caae62dcb30c7a6ac926f96665c7c))
* enable window controls and dynamic maximize icon ([2c3eef5](https://github.com/Celli119/rustler/commit/2c3eef54d528132dd40375d9dfe6d8fbbcdca64d))
* fix codecov coverage uploads ([a08d04b](https://github.com/Celli119/rustler/commit/a08d04b5106d205b2004c8bffb4119697203eb64))
* gpu toggle now properly controls transcription acceleration ([aecacfe](https://github.com/Celli119/rustler/commit/aecacfe23b8f4da1915d21491a602059e9884a9a))
* improve test directory creation and ensure models directory exists ([c4e107f](https://github.com/Celli119/rustler/commit/c4e107f64149cadf23c150e5f079435943f39fa5))
* make hotkey registration non-blocking on startup ([ba39f79](https://github.com/Celli119/rustler/commit/ba39f793e8509fdd54ad80711f61b6595e98b792))
* model download progress now updates in UI ([e3abf84](https://github.com/Celli119/rustler/commit/e3abf840893263aea421674724e669a6273ca484))
* move hotkey listener to app level for immediate availability ([4848e9c](https://github.com/Celli119/rustler/commit/4848e9cbd80da610cb03adb74a5dcaddb0a1e4a8))
* regenerate app icons with correct dune gradients ([b21bd99](https://github.com/Celli119/rustler/commit/b21bd990558e80c54b64d971c184df4ac4268bb9))
* register hotkey on app startup instead of tab visit ([16509b3](https://github.com/Celli119/rustler/commit/16509b32f7eee2023b1e75582aee12de3499dfda))
* resolve clippy warnings and add MIT LICENSE ([992acba](https://github.com/Celli119/rustler/commit/992acba10ba3e02b4df8a284071411149964894c))
* set semantic-release branch to master ([464a68e](https://github.com/Celli119/rustler/commit/464a68eede25a7e82c4daecd40c03de36ec4c7cd))
* smooth pixelated edges on circular dune icons ([8d847f1](https://github.com/Celli119/rustler/commit/8d847f1c08d2e2ab5d86b08f288e318b3c771405))
* update clipboard handling and import statements for Windows API ([135ef27](https://github.com/Celli119/rustler/commit/135ef27a069b11585b3b35fb9ac9e70c75a19c35))
* update tests to match current implementations and fix macOS runner ([60dd38c](https://github.com/Celli119/rustler/commit/60dd38c75bcbcb8112b4a21887d6c0d9aae38445))
* wayland portal compatibility and WebKitGTK freeze ([681125e](https://github.com/Celli119/rustler/commit/681125eba268aabe2ace39e8194d4440ba2bff19))


### Features

* add floating overlay button, transcription history, and state sync ([45ee43a](https://github.com/Celli119/rustler/commit/45ee43a527a1e16ae612daf879bcf6e099eb330b))
* add model caching with auto-unload after 5 min idle ([2a7d230](https://github.com/Celli119/rustler/commit/2a7d23005354bbaa5af1df0f9efe8d44d2046e80))
* add option to show overlay only during recording ([0be2875](https://github.com/Celli119/rustler/commit/0be287546ffaf5725b3ac1619bb7fd2534289cc3))
* add rusty theme, frameless window, and XWayland clipboard support ([fcbae1b](https://github.com/Celli119/rustler/commit/fcbae1b864a276cb51475527288a85c6e8772e43))
* add splash screen to prevent white flash on startup ([693fcdd](https://github.com/Celli119/rustler/commit/693fcdd84af1f6fd1be053bfef1293545214a143))
* add wavy rusty background and glassmorphism UI ([8a4cfef](https://github.com/Celli119/rustler/commit/8a4cfefad16a30341756c26d3cde92385710cc4a))
* enable click-through for overlay transparent areas ([92151ed](https://github.com/Celli119/rustler/commit/92151ed264da18c9ffb9ee50e1f721b8c15d2a22))
* improve splash screen styling and add background color ([a255a73](https://github.com/Celli119/rustler/commit/a255a7374011c2597c8641b39d3aa88a05b29800))
* improve UI layout with centered tabs and redesigned model selector ([1667283](https://github.com/Celli119/rustler/commit/16672834b609f805e2aecdc0dc7231a2c1b3da54))
* improve Wayland hotkey support with portal dialog reset ([0d44e63](https://github.com/Celli119/rustler/commit/0d44e639f1b0364cedbb2467ec892247f9f60896))
* minimize to tray on close, fix duplicate launcher entries, add license ([21475b4](https://github.com/Celli119/rustler/commit/21475b47519091007b03b6a09ef20ae276b42b56))
* open GNOME shortcut dialog directly on Wayland ([6164a84](https://github.com/Celli119/rustler/commit/6164a849b9ec5e3c25d2daa6513c871c4165a6c7))
* redesign overlay button with animated rusty dune icon ([89d34ca](https://github.com/Celli119/rustler/commit/89d34cacc98f10f76bf68cd2abc23550da5a5615))
* redesign UI with tabbed layout and dark mode ([d0c8f4f](https://github.com/Celli119/rustler/commit/d0c8f4f8bac725eca50c2db80ed3db5f0fdc8b31))
* replace header mic icon with dune icon ([d894582](https://github.com/Celli119/rustler/commit/d8945826cd7fe90498ca1b41c6c7e54735ae2277))
* replace overlay with tray icon + notifications, fix hotkey and freeze ([02a82a5](https://github.com/Celli119/rustler/commit/02a82a5ce2196868aa4e2ef8ec410d933a8592a1))
* replace window.confirm with shadcn AlertDialog for clear history ([9faf7f1](https://github.com/Celli119/rustler/commit/9faf7f15882627dbd387fd0b80cf17757a081059))
* update app icons with dune design and fix blank audio ([a2c4f28](https://github.com/Celli119/rustler/commit/a2c4f2816b0c23a25374566aa4fd1473e9f0aa28))


### Performance Improvements

* use WebGL shaders for wavy background animation ([3dd6930](https://github.com/Celli119/rustler/commit/3dd69306cd7e89c4e5188d10aa8974a2adc06415))


### Reverts

* Revert "perf: use WebGL shaders for wavy background animation" ([b9866c2](https://github.com/Celli119/rustler/commit/b9866c29d3f2d769cfc14d1d0494f89911454ee9))
