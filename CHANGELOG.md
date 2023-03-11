### [2.22.1](https://github.com/flow-build/engine/compare/v2.22.0...v2.22.1) (2023-03-11)


### Bug Fixes

* adjust subprocess node in case workflow doesnt exist ([5248bb3](https://github.com/flow-build/engine/commit/5248bb3afd1ff2c26ef055bab6b943fa2f8f1405))
* insert input on initial_bag & parentData on actor_data ([e9666a5](https://github.com/flow-build/engine/commit/e9666a5e85e673b3e90470088de0855fe7661c34))

## [2.22.0](https://github.com/flow-build/engine/compare/v2.21.1...v2.22.0) (2023-03-09)


### Features

* **nodes:** add dueDate and duration to timerNode ([f0ab77a](https://github.com/flow-build/engine/commit/f0ab77ac1c4e31196e701dc2820b87ca31b26647))

### [2.21.1](https://github.com/flow-build/engine/compare/v2.21.0...v2.21.1) (2023-03-04)


### Bug Fixes

* :pushpin: Add vm2 as dependency ([34d4d0b](https://github.com/flow-build/engine/commit/34d4d0b863955e4ec79635fc10b4c405948639d9))

## [2.21.0](https://github.com/flow-build/engine/compare/v2.20.1...v2.21.0) (2023-02-28)


### Features

* Improve robustness env var eval ([95a26a1](https://github.com/flow-build/engine/commit/95a26a1e824312e6041dc4b545dff56b12d13130))

### [2.20.1](https://github.com/flow-build/engine/compare/v2.20.0...v2.20.1) (2023-02-17)


### Bug Fixes

* fix node view migration ([329acc0](https://github.com/flow-build/engine/commit/329acc01fed246d9e65d8cbc1918118409f7a2a7))

## [2.20.0](https://github.com/flow-build/engine/compare/v2.19.1...v2.20.0) (2023-02-16)


### Features

* expose timer methods on cockpit ([0649142](https://github.com/flow-build/engine/commit/0649142d6c013f014ac0cb3b14c7222516826da5))


### Bug Fixes

* **process:** change condition to expire process on max_step_number ([7fb2e68](https://github.com/flow-build/engine/commit/7fb2e682fae8955ca999c232ec23583f303decf4))

### [2.19.1](https://github.com/flow-build/engine/compare/v2.19.0...v2.19.1) (2023-02-16)


### Bug Fixes

* adjust payload on preProcessising of http node ([444ef8e](https://github.com/flow-build/engine/commit/444ef8e2634f065c23e5db50bc13be51c8cca4c3))

## [2.19.0](https://github.com/flow-build/engine/compare/v2.18.4...v2.19.0) (2023-02-03)


### Features

* adds warn logs for HTTP node ([c3c0c31](https://github.com/flow-build/engine/commit/c3c0c31e80f0e29e90d7996078c9ca770176c09e))

### [2.18.4](https://github.com/flow-build/engine/compare/v2.18.3...v2.18.4) (2023-01-30)


### Bug Fixes

* adds transaction input on 'getLastStateByProcess' method ([a2a33d0](https://github.com/flow-build/engine/commit/a2a33d0eedcd9c041774ac69672424dadcf4a61c))
* adjust 'step number' transaction injection ([1718b85](https://github.com/flow-build/engine/commit/1718b85253a9bed6746d06cea89c2ab57c01214e))
* adjust transaction handling on state creation ([af16b34](https://github.com/flow-build/engine/commit/af16b34634603cdb7da13fd7682d4e0808d0f9a7))

### [2.18.3](https://github.com/flow-build/engine/compare/v2.18.2...v2.18.3) (2023-01-20)


### Bug Fixes

* adjust transaction handling on n 'interrupt activity manager' method ([4d74b04](https://github.com/flow-build/engine/commit/4d74b04716ceaca96b4f975500edbb79dd61dd91))

### [2.18.2](https://github.com/flow-build/engine/compare/v2.18.1...v2.18.2) (2023-01-18)


### Bug Fixes

* forces version update with fix ([7223320](https://github.com/flow-build/engine/commit/7223320a4c87fef598140eff1f3209460541d373))

### [2.18.1](https://github.com/flow-build/engine/compare/v2.18.0...v2.18.1) (2023-01-16)


### Bug Fixes

* adjust transaction on timer treatment of activity managers ([90cf5f6](https://github.com/flow-build/engine/commit/90cf5f6cd3aff476fd5251ba199f5b0e6576d719))

## [2.18.0](https://github.com/flow-build/engine/compare/v2.17.0...v2.18.0) (2022-12-12)


### Features

* adds 'interval' as required parameter on HTTP node ([9d7df73](https://github.com/flow-build/engine/commit/9d7df7355a9424c7641bb6f1a033fd764ed42fef))
* adds http node retry logic and ECCONABORTED code treatment ([df32952](https://github.com/flow-build/engine/commit/df329526f49e54f5c9823b28fa7912ec1ca8ade2))
* adds timer trigger on HTTP node in case of retriees ([b8549fb](https://github.com/flow-build/engine/commit/b8549fbe53977b9e3ac09dace7381f1df30333b1))
* adjust 'amount' to 'attempts' and changes regex for http status codes ([90ae09b](https://github.com/flow-build/engine/commit/90ae09ba0500720495322f9bed919d35e6585c57))


### Bug Fixes

* adjust HTTP parameters usage ([eca496e](https://github.com/flow-build/engine/commit/eca496eeac800c6dba8339375aea4238280fd682))

## [2.17.0](https://github.com/flow-build/engine/compare/v2.16.4...v2.17.0) (2022-11-29)


### Features

* adds extra logging for HTTP node ([4239fd3](https://github.com/flow-build/engine/commit/4239fd3eaf5a9d4346f33f523f88a6acafa40b9f))
* adjust logs to add PID and change control ENV ([3ad95d2](https://github.com/flow-build/engine/commit/3ad95d271e039545d747bbf637fbb18f0351cc28))


### Bug Fixes

* adjust preProcessing to avoid roverwriting 'prepare' result ([8834a3e](https://github.com/flow-build/engine/commit/8834a3eab951164970d86475a357484092bf554c))
* removes process_id reference from request payload ([00df3ca](https://github.com/flow-build/engine/commit/00df3cab0b8b13a0749061adc58a38d90da2759b))

### [2.16.4](https://github.com/flow-build/engine/compare/v2.16.3...v2.16.4) (2022-11-24)


### Bug Fixes

* removes duplicate code from knex file query ([8268c9c](https://github.com/flow-build/engine/commit/8268c9cf34bfa7362cef1e4ae5a500c35b9d53fd))

### [2.16.3](https://github.com/flow-build/engine/compare/v2.16.2...v2.16.3) (2022-11-16)


### Bug Fixes

* adjust timer behavior for User Tasks ([f540c8d](https://github.com/flow-build/engine/commit/f540c8d2b46e4030bfdaf0ceb16302ae1d5b754e))
* adjust transaction injection on heartbeat ([b4c2568](https://github.com/flow-build/engine/commit/b4c256864afc38e2a3d7f38fbece68364b482f86))
* temporarily skips 'broken' tests ([a24ed56](https://github.com/flow-build/engine/commit/a24ed5645cfaac5c214ae03976251f1edea29c3c))

### [2.16.3-alpha.2](https://github.com/flow-build/engine/compare/v2.16.3-alpha.1...v2.16.3-alpha.2) (2022-11-11)


### Bug Fixes

* adjust timer behavior for User Tasks ([f540c8d](https://github.com/flow-build/engine/commit/f540c8d2b46e4030bfdaf0ceb16302ae1d5b754e))

### [2.16.3-alpha.1](https://github.com/flow-build/engine/compare/v2.16.2...v2.16.3-alpha.1) (2022-11-11)


### Bug Fixes

* adjust transaction injection on heartbeat ([b4c2568](https://github.com/flow-build/engine/commit/b4c256864afc38e2a3d7f38fbece68364b482f86))
* temporarily skips 'broken' tests ([a24ed56](https://github.com/flow-build/engine/commit/a24ed5645cfaac5c214ae03976251f1edea29c3c))

### [2.16.2](https://github.com/flow-build/engine/compare/v2.16.1...v2.16.2) (2022-09-15)


### Bug Fixes

* change condition from workflow to workflow id ([b9a96dd](https://github.com/flow-build/engine/commit/b9a96dd663956b519204d868a5282412cf780b55))

### [2.16.1](https://github.com/flow-build/engine/compare/v2.16.0...v2.16.1) (2022-09-14)


### Bug Fixes

* **activityManager:** fix ajvValidator ([64f47a9](https://github.com/flow-build/engine/commit/64f47a9568f69a7c0b501aa1cb98b6efee88edaf))
* **nodes:** validate workflow name before create ([077f6d3](https://github.com/flow-build/engine/commit/077f6d315343624e6f2e888801f9ca0c6479f65d))


### Performance Improvements

* disable duplicated engines ([f6aa232](https://github.com/flow-build/engine/commit/f6aa232b0629db1b060385b48bb9adfdd2a2076f))

## [2.16.0](https://github.com/flow-build/engine/compare/v2.15.0...v2.16.0) (2022-09-05)


### Features

* **nodes:** change node validation to JSON Schema ([1146bf6](https://github.com/flow-build/engine/commit/1146bf6ccc13fe5c9c341218ea8ce3a59a8282f1))

## [2.15.0](https://github.com/flow-build/engine/compare/v2.14.0...v2.15.0) (2022-09-04)


### Features

* FLOW-14 expose functions on index ([b001141](https://github.com/flow-build/engine/commit/b00114178c32ea280fbb91dcf1ac2d7e9a94c064))
* **nodes:** add getTypes and getCategories to Nodefactory ([c2809cc](https://github.com/flow-build/engine/commit/c2809ccd0e5e26ba627399c45e811df86822037c))

## [2.14.0](https://github.com/flow-build/engine/compare/v2.13.1...v2.14.0) (2022-09-01)


### Features

* **process:** notify parent process on abort ([4deb95b](https://github.com/flow-build/engine/commit/4deb95b389f38d761952e4fb60bf9a137193e21c))

### [2.13.1](https://github.com/flow-build/engine/compare/v2.13.0...v2.13.1) (2022-08-29)


### Bug Fixes

* fix variable name ([fcec895](https://github.com/flow-build/engine/commit/fcec895d23bf1e333a5bde9589d6fee4a7b80fda))
* **nodes:** fix activity_schema validation ([7173fc5](https://github.com/flow-build/engine/commit/7173fc5a34f4b869ac724f271451fca0d6cab629))

## [2.13.0](https://github.com/flow-build/engine/compare/v2.12.0...v2.13.0) (2022-08-21)


### Features

* **knex:** add information whether workflow is latest ([8cd03c3](https://github.com/flow-build/engine/commit/8cd03c3792b5b8522ea979fef2c69b4e83644947))
* updates fetch workflow and process ([d3d6b18](https://github.com/flow-build/engine/commit/d3d6b18b7e6fe3edc4c863634e86caece3ee8437))

## [2.12.0](https://github.com/flow-build/engine/compare/v2.11.1...v2.12.0) (2022-08-16)


### Features

* complete all activity managers when a process is finished ([3bc13c1](https://github.com/flow-build/engine/commit/3bc13c1095a18634946f580ef9af40e21be9eafd))


### Bug Fixes

* fix case with or condition ([e717e1e](https://github.com/flow-build/engine/commit/e717e1ed494c3510eb033357ffec85d8ea18bd7c))
* fix typo on message ([2acb545](https://github.com/flow-build/engine/commit/2acb54501b3cf6844b7c39b01cd084ce89ff9db5))

### [2.11.1](https://github.com/flow-build/engine/compare/v2.11.0...v2.11.1) (2022-06-07)


### Bug Fixes

* **engine:** :bug: uncouple continue return from process execution ([0744c17](https://github.com/flow-build/engine/commit/0744c17717b991f808e428e90e392c5bb1613b0a))

## [2.11.0](https://github.com/flow-build/engine/compare/v2.10.0...v2.11.0) (2022-06-03)


### Features

* expose continueProcess to Engine ([c81c198](https://github.com/flow-build/engine/commit/c81c1984106f52adcddb43bf227774e80c192884))

## [2.10.0](https://github.com/flow-build/engine/compare/v2.9.2...v2.10.0) (2022-04-22)


### Features

* add ref to process_id and step_number on node execution ([678a569](https://github.com/flow-build/engine/commit/678a5698a3f89488572b90363c335b6fcab070fd))

### [2.9.2](https://github.com/flow-build/engine/compare/v2.9.1...v2.9.2) (2022-03-30)


### Bug Fixes

* **nodes:** update schema to allow ref on timeout and contentLength ([e09a8c5](https://github.com/flow-build/engine/commit/e09a8c59d9ccd1e1e787594c562cdec1e0971a70))

### [2.9.1](https://github.com/flow-build/engine/compare/v2.9.0...v2.9.1) (2022-03-30)


### Bug Fixes

* fix blueprint assert on constructor ([9314c81](https://github.com/flow-build/engine/commit/9314c810e6d6a278039e5ad25d21fa6f0cc0a5aa))

## [2.9.0](https://github.com/flow-build/engine/compare/v2.8.0...v2.9.0) (2022-03-30)


### Features

* allow engine to be initialized without the heartbeat ([71820ad](https://github.com/flow-build/engine/commit/71820ad071965e56f146b31db3b3bb28e43673e3))
* expose getNode factory ([cb7b29e](https://github.com/flow-build/engine/commit/cb7b29e28671b76877e309fb7da7c823d0124234))


### Reverts

* full revert pkg changes ([7f775e9](https://github.com/flow-build/engine/commit/7f775e909a440ed6ebe5d48dfbf6707fe5aa36d4))
* **packages:** revert pkg version ([28d4893](https://github.com/flow-build/engine/commit/28d4893b7b01785d02f37c9b37b30345927f6a57))
* rollback package-lock ([6e3f7a0](https://github.com/flow-build/engine/commit/6e3f7a061a992ccc71a4df226fc71a4bf6d49571))

## [2.8.0](https://github.com/flow-build/engine/compare/v2.7.0...v2.8.0) (2022-02-25)


### Features

* add fech process state methods ([5da137b](https://github.com/flow-build/engine/commit/5da137b67b56dd448a915e39997ab31f95c99961))
* add processStatus to index ([0853817](https://github.com/flow-build/engine/commit/0853817d653ff7dcf442afd83f555a13933503e2))
* include state fetch to cockpit ([3ea6592](https://github.com/flow-build/engine/commit/3ea6592c233f4c12d9d3ff790f72ae022e9ab9ea))

## [2.7.0](https://github.com/flow-build/engine/compare/v2.6.0...v2.7.0) (2022-02-23)


### Features

* **engine:** add version to fetchWorkflowByName ([f696997](https://github.com/flow-build/engine/commit/f696997ada32b7df0522f0c60a14961448658945))
* **engine:** add version to fetchWorkflowByName ([a20021b](https://github.com/flow-build/engine/commit/a20021b0ca806d9cf144c817edc5f49c57906e39))

## [2.6.0](https://github.com/flow-build/engine/compare/v2.5.0...v2.6.0) (2022-02-17)


### Features

* change startProcessNode to include parent process_id ([88e67b8](https://github.com/flow-build/engine/commit/88e67b810a1a585cec2994964fa14e41324df1ae))
* move parentProcessData to actor_data ([254ec6d](https://github.com/flow-build/engine/commit/254ec6d6bffe0c26d849d09db9ff9985328aa2f1))
* **nodes:** add formRequestNode ([4e66032](https://github.com/flow-build/engine/commit/4e660328d1f412bc5b2904e218c96ada3789af94))


### Bug Fixes

* add formrequest to node factory ([b919da1](https://github.com/flow-build/engine/commit/b919da19c738f4e00a57780e8709922dca60e4a0))
* false positive on inexistant env ([46fa2f1](https://github.com/flow-build/engine/commit/46fa2f105018c5938b422cc1aa57ba72fd691c92))

## [2.5.0](https://github.com/flow-build/engine/compare/v2.4.0...v2.5.0) (2021-12-08)


### Features

* **package:** fix on release version ([f1f7537](https://github.com/flow-build/engine/commit/f1f7537056934f988a1644bafacac0bce02a63ed))

## [2.4.0](https://github.com/flow-build/engine/compare/v2.3.0...v2.4.0) (2021-12-08)


### Features

* **package:** fix on release version ([022c24b](https://github.com/flow-build/engine/commit/022c24b16bf28c866bc8f8d85cbaa9a1803b4bb1))

## [2.3.0](https://github.com/flow-build/engine/compare/v2.2.0...v2.3.0) (2021-12-08)


### Features

* **package:** fix on release version ([87ff134](https://github.com/flow-build/engine/commit/87ff1346d19c29edad6d07391da478b3a7121a34))

## [2.2.0](https://github.com/flow-build/engine/compare/v2.1.0...v2.2.0) (2021-12-08)


### Features

* **package:** fix on release version ([633c626](https://github.com/flow-build/engine/commit/633c6264edbfc804f209cf752aec1a0e3078b02f))

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
