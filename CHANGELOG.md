## [2.4.1] (2021-11-11)

### Bugfix

- fix a condition checkActorPermission would fail if the activity manager has no parameters.

## [2.4.0] (2021-10-30)

### Feature

- add filtering by process_id, workflow_name, status and limit and offset to method fetchAll processes

## [2.3.3] (2021-10-19)

### Bug Fixes

- fix subProcess to prevent the engine from crashing when the child_process cannot be created
- fix subProcess use actor_data from parameters instead of current state actor_data

## [2.3.2] (2021-10-14)

### Bug Fixes

- fetchPackages returning a new id to the package

## [2.3.1] (2021-10-04)

### Bug Fixes

- add bag and actor_data to js lane rule eval

## [1.2.0](https://github.com/flow-build/engine/compare/v1.1.2...v1.2.0) (2021-03-01)

### Features

- update version ([#37](https://github.com/flow-build/engine/issues/37)) ([a992bdf](https://github.com/flow-build/engine/commit/a992bdf0a72641258c9342d35eb4a71f502a6892))

### [1.1.2](https://github.com/flow-build/engine/compare/v1.1.1...v1.1.2) (2020-05-08)

### Bug Fixes

- change nodes and engine order due to ciclic dependency ([1d65e4d](https://github.com/flow-build/engine/commit/1d65e4d480a124e07e63a25818f1baa5253e9d0d))

### [1.1.1](https://github.com/flow-build/engine/compare/v1.1.0...v1.1.1) (2020-04-06)

### Bug Fixes

- autoupdate ([#25](https://github.com/flow-build/engine/issues/25)) ([9eba566](https://github.com/flow-build/engine/commit/9eba56644c93b045e0f8cf90196d149c59c93552))

## [1.1.0](https://github.com/flow-build/engine/compare/v1.0.0...v1.1.0) (2020-03-30)

### Features

- reset package-lock ([#21](https://github.com/flow-build/engine/issues/21)) ([4c0b8a3](https://github.com/flow-build/engine/commit/4c0b8a30aa3cb9f3e3bf6b972c49a7d66694f65a))

## 1.0.0 (2020-03-30)

### ⚠ BREAKING CHANGES

- please work
- start npm from scratch
- test auto-release
- reset version for flowbuild

### Features

- please work ([44d8c78](https://github.com/flow-build/engine/commit/44d8c787899327eb64c37584f4324f26abfed148))
- please work ([27d5b16](https://github.com/flow-build/engine/commit/27d5b16623dae344f1a4b7dfb650b32048b4528d))
- reset changelog for test ([a038088](https://github.com/flow-build/engine/commit/a038088fbff3ae6192e1a998900ef879668a7953))
- start npm from scratch ([db660f3](https://github.com/flow-build/engine/commit/db660f34db666e2a69fb5acfc365633d8ec0fc94))
- update package for tests ([b2017a7](https://github.com/flow-build/engine/commit/b2017a71c56bb618c20532b9b356f012a02c2d19))

### Bug Fixes

- add github package ([ddea737](https://github.com/flow-build/engine/commit/ddea737e9f56911bc0dc75aa973c0dddbbf52cfc))
- Merge branch 'feature/update' of https://github.com/flow-build/engine into feature/update ([a0c8686](https://github.com/flow-build/engine/commit/a0c868619fde1899189b301d3c693be1022957d7))
- reset version for flowbuild ([8c2efa3](https://github.com/flow-build/engine/commit/8c2efa3ec7a31e55bace49246c6b56c716fe8661))
- semantic npm package isntalled ([056f32b](https://github.com/flow-build/engine/commit/056f32b4dd3fa5d3b33b7dd5d14f3de326ba0f30))
- test auto-release ([4f2d275](https://github.com/flow-build/engine/commit/4f2d275f1ab30e8f33dcedd180684e0381c29be0))
- test git ([ec4f386](https://github.com/flow-build/engine/commit/ec4f3860f5ce68ae2a070363e2fdc1226f80ba7b))
