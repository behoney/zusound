# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] - 2024-04-13

### Added

- Switched build system to tsup for improved packaging
- Visualizer has been introduced. Still in development, though.

### Changed

- Example page has been refined. Still need to refactor the code to make it more understandable.

## [0.1.1] - 2024-04-06

### Added

- `logDiffs` feature to store trace data in `window.__zusound_logger__` for debugging
- Better documentation for usage with configuration options

## [0.1.0] - 2024-04-04

### Added

- Initial release with core functionality
- Basic Zustand middleware structure
- Simple state diffing with shallow comparison
- Sound generation using Web Audio API
- Environment detection (development vs. production)
- Basic configuration options
