# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0](https://github.com/nosebit/simian/compare/v0.1.2...v0.2.0) - 2026-06-18

### Added

- *(editor)* floating blocks
- *(editor)* allow free resize of editor blocks
- *(paper)* allow deleting a paper
- *(paper)* add image-block to the editor
- *(paper)* add slash commands and allow multiple languages in code-block
- *(paper)* allow multiple versions of published papers
- *(paper)* use gitraw to allow reviewers preview the paper
- *(paper)* favicon, submit paper as branch, better heading format
- *(ui)* embeed ui to simian binary in build time and add ui checks ci workflow
- *(paper/submit)* allow to dry run the submission for testing
- *(paper)* add a root page that shows all papers
- *(ui/editor)* add latex-block and latex-inline addons
- *(cli)* supports a new version command

### Fixed

- *(editor)* 1-image grid drag, float reposition resize, float hovering
- *(editor/image-block)* fix the grid display of images
- *(editor)* show the plus button on image-blocks
- *(editor)* subtitle position, paragraph empty placeholder and new paper structure
- *(paper)* correctly generate the plots in paper.md
- *(paper)* prevent latex from being edited when editor is read only

### Other

- update the git pre-push hook to run exactly the same rust check command as the ci
- fix lint errors
- improve topbar and editor visibility on mobile
- *(dev)* add git pre-push hook and instructions on how to integrate it
- *(paper)* use deterministic paper PR and better naming
- *(github)* set up funding
- add issue templates for github
- ignore .DS_Store files
- fix formatting issues which broke the CI
- add logo to readme
- *(paper)* use simian-papers repo in submit command

## [0.1.2](https://github.com/nosebit/simian/compare/v0.1.1...v0.1.2) - 2026-06-13

### Added

- add install script

### Other

- add crate badges to readme
- add workflow to publish to github pages

## [0.1.1](https://github.com/nosebit/simian/compare/v0.1.0...v0.1.1) - 2026-06-13

### Fixed

- *(ci)* use GH_TOKEN so release binaries workflow is correctly triggered
