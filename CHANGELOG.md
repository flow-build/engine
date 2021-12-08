## [2.1.0](https://github.com/flow-build/engine/compare/v2.0.6...v2.1.0) (2021-12-08)


### Features

* **package:** fix on release version ([1038afb](https://github.com/flow-build/engine/commit/1038afb30313bf942e3ed251d5e11b1b9c629b35))

### [2.0.6](https://github.com/flow-build/engine/compare/v2.0.5...v2.0.6) (2021-12-08)


### Bug Fixes

* **package:** fix on release version ([c84c351](https://github.com/flow-build/engine/commit/c84c35192c2ad74329d690f1e40986782c272557))

### [2.0.5](https://github.com/flow-build/engine/compare/v2.0.4...v2.0.5) (2021-12-02)


### Bug Fixes

* **github-actions:** fix on release version to output the correct version ([decef58](https://github.com/flow-build/engine/commit/decef587116e7adffee13718cdaa737aa431ebdf))

### [2.0.4](https://github.com/flow-build/engine/compare/v2.0.3...v2.0.4) (2021-12-02)


### Bug Fixes

* **github-actions:** fix on release version ([20baba2](https://github.com/flow-build/engine/commit/20baba20c37d1efd4c2253d37082bbe8b6c1a0c9))

### [2.0.3](https://github.com/flow-build/engine/compare/v2.0.2...v2.0.3) (2021-12-02)


### Bug Fixes

* **github-actions:** fix on release. ([733c1df](https://github.com/flow-build/engine/commit/733c1dff22bcde6306c5f4d224b68d9413481769))

### [2.0.2](https://github.com/flow-build/engine/compare/v2.0.1...v2.0.2) (2021-12-02)


### Bug Fixes

* **github-actions:** fix on release. ([c18f26e](https://github.com/flow-build/engine/commit/c18f26e569a0da95c1cd9469259c6caefad07e2c))

### [2.0.1](https://github.com/flow-build/engine/compare/v2.0.0...v2.0.1) (2021-12-02)


### Bug Fixes

* **github-actions:** fix on release. ([c00c745](https://github.com/flow-build/engine/commit/c00c745fc7ab8bd227d18faf9c35b0eb196f4296))

## [2.0.0](https://github.com/flow-build/engine/compare/v1.2.0...v2.0.0) (2021-12-02)


### ⚠ BREAKING CHANGES

* blueprint_hash

### Features

* add blueprint_hash to workflow ([8b24efe](https://github.com/flow-build/engine/commit/8b24efe4e07241d83a750dd1f32607b4ebbf50a8))
* add hash at workflow entity ([32e8b92](https://github.com/flow-build/engine/commit/32e8b92a2f5dd63c47e740e5a4c3faa36ca653aa))
* add parameters on run and preProcessing ([06812cf](https://github.com/flow-build/engine/commit/06812cf1ec87ccf0e7b43029b28813f26687b922))
* add parameters to blueprint_spec ([63d0e7a](https://github.com/flow-build/engine/commit/63d0e7a59e47dcc0d0a4ee265522365a75fec93f))
* add traceparent to requests ([6b2d10c](https://github.com/flow-build/engine/commit/6b2d10cc742931985fae5ccb1dce8f800d2d61d9))
* allow lane rule to be $js ([f3e7557](https://github.com/flow-build/engine/commit/f3e75572458769f5aaf04a054a8b4de9c8e69a1e))
* allow saveWorkflow to receive the id ([f1c9635](https://github.com/flow-build/engine/commit/f1c9635774cbe050ff566dfcccb6e42496feb8b6))
* allow timeout to use $ref ([3cac638](https://github.com/flow-build/engine/commit/3cac638fd151fe8b3884115e16d11124ad5cfb1b))
* blueprint_hash ([e0c7a9b](https://github.com/flow-build/engine/commit/e0c7a9b9c4e4b3c02ab0bf11a33f1e68a499fa87))
* js at lane rule ([77ca383](https://github.com/flow-build/engine/commit/77ca383d3f9ea66088cede1502520711ce736403))
* **process:** add more filter options ([cd039ac](https://github.com/flow-build/engine/commit/cd039ac2728bed4f4af00957aab30ea71a6ef5d9))
* set custom node priority over native ([8157d57](https://github.com/flow-build/engine/commit/8157d576c3b2e7384840ff5efae4b4b197e16da5))
* timer as a fixed date ([3b92b98](https://github.com/flow-build/engine/commit/3b92b98b6cde517d1a869b50c8f65454ff7b14f4))
* traceparent ([0ca0da6](https://github.com/flow-build/engine/commit/0ca0da62674ddf2cec61d53363c16dd2f3e64edb))
* validate envs ([25d2596](https://github.com/flow-build/engine/commit/25d2596ac3436bef3b30e8fcae9d28cea5cf59cd))


### Bug Fixes

* **activityManager:** deal when channels is not provided ([bf1e4e8](https://github.com/flow-build/engine/commit/bf1e4e8abae31a6cf9a3898944da112ee68c2a38))
* add bag and actor_data to js lane rule eval ([b883613](https://github.com/flow-build/engine/commit/b883613e46149495b79d52b276460ce4cccaba16))
* add logger_level at cockpit constructor ([916cb84](https://github.com/flow-build/engine/commit/916cb84b753e8da0f901137e19b8250607460c8f))
* add notification on notify AMs ([a5d6d00](https://github.com/flow-build/engine/commit/a5d6d00ab9b93d801f979ca93da83b63e1926635))
* change default knexenv value ([93ff83e](https://github.com/flow-build/engine/commit/93ff83e6d2df72cfc6cdc98089ca96a8f5c7865f))
* change priority to customNode over nativeNodes ([770541b](https://github.com/flow-build/engine/commit/770541bbcb496d12903e84158c4496e5dd2d7006))
* explicit mode full @ ajv ([681dbaa](https://github.com/flow-build/engine/commit/681dbaad97cf09ba509e7be1d5cf4d51c76d5542))
* **github-actions:** fix on pr validation action. ([3b95b40](https://github.com/flow-build/engine/commit/3b95b405a46cbf059ce1081f1e132d2375af5c26))
* **github-actions:** fix on pr validation and release. ([d8b6796](https://github.com/flow-build/engine/commit/d8b6796ef9b55a12ff39ce779646861444acef38))
* **packages:** fetchPackages returning wrong id ([29c7d4a](https://github.com/flow-build/engine/commit/29c7d4a729fe9e93f365ac09e160a0d82d6a5d62))
* **process:** change when notifyActivityManager is fired ([164c638](https://github.com/flow-build/engine/commit/164c6385472671fdaffb04b8dd7e93bb79f8cdf4))
* set cockpit logger_level ([044d47b](https://github.com/flow-build/engine/commit/044d47b27a70949652051b741e7e780739622de3))
* subprocess actor_data ([b19ac68](https://github.com/flow-build/engine/commit/b19ac68960426ced94649632d38d21a15282a613))
* update deprecated ci ([#42](https://github.com/flow-build/engine/issues/42)) ([98336bf](https://github.com/flow-build/engine/commit/98336bffa9ff30cddc1feb431eda43dae6de146d))


### Performance Improvements

* add indexes to tables ([996a1dc](https://github.com/flow-build/engine/commit/996a1dc6f6ea6e21a5c7d03f03d95a38ebe37e1e))

## [2.4.2] (2021-11-25)

### Bugfix

- change notify activity manager to only fire after commiting transaction at event loop.

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
