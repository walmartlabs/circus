# Release Notes

## Development

[Commits](https://github.com/walmartlabs/circus/compare/v2.0.0...master)

## v2.0.0 - February 6th, 2015
- [#31](https://github.com/walmartlabs/circus/issues/31) - Context require statements case the linker to throw an error ([@kpdecker](https://api.github.com/users/kpdecker))
- [#28](https://github.com/walmartlabs/circus/issues/28) - Linker does not work when alias has capitalization ([@kpdecker](https://api.github.com/users/kpdecker))
- [#27](https://github.com/walmartlabs/circus/issues/27) - Bootstrap chunk is include in circus.json file ([@kpdecker](https://api.github.com/users/kpdecker))
- [#26](https://github.com/walmartlabs/circus/issues/26) - It's possible to export duplicate names ([@kpdecker](https://api.github.com/users/kpdecker))
- [#24](https://github.com/walmartlabs/circus/issues/24) - Should allow for config-based external name generation ([@kpdecker](https://api.github.com/users/kpdecker))
- [#22](https://github.com/walmartlabs/circus/issues/22) - Bootstrap loading needs to be documented ([@kpdecker](https://api.github.com/users/kpdecker))
- [#21](https://github.com/walmartlabs/circus/issues/21) - Resolve aliases are not able to point to linked modules ([@kpdecker](https://api.github.com/users/kpdecker))
- [#20](https://github.com/walmartlabs/circus/issues/20) - AMD requires are not properly linked ([@kpdecker](https://api.github.com/users/kpdecker))
- [#18](https://github.com/walmartlabs/circus/pull/18) - Convert infrastructure to utilize bootstrapper ([@kpdecker](https://api.github.com/users/kpdecker))
- [#25](https://github.com/walmartlabs/circus/issues/25) - Allow for non-referenced chunks
- [#19](https://github.com/walmartlabs/circus/issues/19) - Module exporter fails with context requires
- [#17](https://github.com/walmartlabs/circus/issues/17) - Create bootstrap file
- [#15](https://github.com/walmartlabs/circus/issues/15) - Failure due to missing components isn't always obvious
- Allow for bootstrap only projects - 423a294
- Pull AMD integration out into standalone project - bb20916
- Handle array main instances in bower - 9189a84
- Optimize bookkeeping output for inlined bootstrap - 9368cec
- Fix external name resolution for direct main refs - e0f29c7
- Ignore local path spec in package main lookup - ce22c31
- Give bower priority in package resolution - 5a68b08
- Fix resolve alias export naming pattern - ab957b8
- Provide failover for missing bootstrap or vars - 081df68
- Make module exports aware of package configs - 3273e8d
- Properly handle exports with ! paths - 45d25f1
- Minify javascript on publish - b2ce7cc

Compatibility notes:
- This changes the structure of the init logic dramatically. The build now creates bootstrap logic that handles all file references across all components. It also limits a given page to only having one bootstrap loaded at a given time, which avoids a number of potential versioning issues.
- AMD adapters have been moved to the circus-amd project

[Commits](https://github.com/walmartlabs/circus/compare/v1.2.1...v2.0.0)

## v1.2.1 - January 13th, 2015
- Force compression in rework output - 87f1ad1

[Commits](https://github.com/walmartlabs/circus/compare/v1.2.0...v1.2.1)

## v1.2.0 - January 13th, 2015
- Add publish.filter option - cb2f732
- Make module linking case insensitive - e1ec296
- Allow for local vs. CDN linking for builds - 4f755a0

[Commits](https://github.com/walmartlabs/circus/compare/v1.1.0...v1.2.0)

## v1.1.0 - January 12th, 2015
- Handle published assets within mixins - 30ac066
- Switch to rework rather than CSSO - 3aee0bb

[Commits](https://github.com/walmartlabs/circus/compare/v1.0.0...v1.1.0)

## v1.0.0 - January 10th, 2015
- [#6](https://github.com/walmartlabs/circus/issues/6) - Consider moving route-based loading into separate plugin ([@kpdecker](https://api.github.com/users/kpdecker))
- [#5](https://github.com/walmartlabs/circus/issues/5) - Figure out plugin point to publish to CDN ([@kpdecker](https://api.github.com/users/kpdecker))
- [#3](https://github.com/walmartlabs/circus/issues/3) - Document build and release process ([@kpdecker](https://api.github.com/users/kpdecker))
- [#2](https://github.com/walmartlabs/circus/issues/2) - Add checks to prevent duplicate loads for explicitly defined resources ([@kpdecker](https://api.github.com/users/kpdecker))
- Include css assets in files listing - b380572
- Use published key to map files to production urls - 74155c3
- Fix path handling for loader urls in css files - 9390ece

[Commits](https://github.com/walmartlabs/circus/compare/v0.10.1...v1.0.0)

## v0.10.1 - January 8th, 2015
- Fix resolve context for css dependencies - 86b741e
- Fix string handling in css loader - aee2316

[Commits](https://github.com/walmartlabs/circus/compare/v0.10.0...v0.10.1)

## v0.10.0 - January 8th, 2015
- Add support for url bundling from require.css - 5519de7

[Commits](https://github.com/walmartlabs/circus/compare/v0.9.0...v0.10.0)

## v0.9.0 - January 5th, 2015
- [#8](https://github.com/walmartlabs/circus/issues/8) - Optimize single chunk components ([@kpdecker](https://api.github.com/users/kpdecker))
- Add support for loading under Fruit Loops envs - f20656f
- Protect from potentially missing components LUT - 9b9be3a

[Commits](https://github.com/walmartlabs/circus/compare/v0.8.0...v0.9.0)

## v0.8.0 - January 2nd, 2015
- Implement loadConfigs helper - eb3cbff

[Commits](https://github.com/walmartlabs/circus/compare/v0.7.0...v0.8.0)

## v0.7.0 - December 30th, 2014
- Copy bower.json in build - 96214de

[Commits](https://github.com/walmartlabs/circus/compare/v0.6.0...v0.7.0)

## v0.6.0 - December 30th, 2014
- Add checkPermutations resolver option - 6cd5a45
- Include output name for root circus.json - b98d64a

[Commits](https://github.com/walmartlabs/circus/compare/v0.5.1...v0.6.0)

## v0.5.1 - December 24th, 2014
- Add repository link to package.json - 11890c1

[Commits](https://github.com/walmartlabs/circus/compare/v0.5.0...v0.5.1)

## v0.5.0 - December 23rd, 2014
- Allow for custom defined external module names - f6342e4
- Use script to calculate prefix path if missing - 57f2041
- Use path prefix for css urls as well - cd61e16

[Commits](https://github.com/walmartlabs/circus/compare/v0.4.0...v0.5.0)

## v0.4.0 - December 18th, 2014
- Implement Karma Adapter - 5faa7a9

[Commits](https://github.com/walmartlabs/circus/compare/v0.3.1...v0.4.0)

## v0.3.1 - December 18th, 2014
- Apply watchDelay to avoid watcher issues - e1eaad6
- Move module/route json init into loader plugin - 71312d7
- Fix rebuild on external change - 90cae3c
- Ensure proper watch support for css dependencies - 0159fda

[Commits](https://github.com/walmartlabs/circus/compare/v0.3.0...v0.3.1)

## v0.3.0 - December 14th, 2014
- Refactor circus.json generation into plugins - c577c6c
- Include chunk files in circus.json output - fbca19b

[Commits](https://github.com/walmartlabs/circus/compare/v0.2.2...v0.3.0)

## v0.2.2 - December 14th, 2014
- Handle defined loader instances safely - 7160e26
- Allow override of any value in circus config - 1a8d74d

[Commits](https://github.com/walmartlabs/circus/compare/v0.2.1...v0.2.2)

## v0.2.1 - December 9th, 2014
- Properly handle externals loaded by child chunks - 41c0951
- Fix exportAMD flag docs - 671d6f9
- Handle ../ when determining module path name - 28616ee

[Commits](https://github.com/walmartlabs/circus/compare/v0.2.0...v0.2.1)

## v0.2.0 - December 8th, 2014
- [#12](https://github.com/walmartlabs/circus/issues/12) - CSS files should be included in circus json ([@kpdecker](https://api.github.com/users/kpdecker))
- [#11](https://github.com/walmartlabs/circus/pull/11) - Allow circus modules to export to AMD ecosystems ([@kpdecker](https://api.github.com/users/kpdecker))
- [#10](https://github.com/walmartlabs/circus/issues/10) - Provide utility for generating AMD paths structures ([@kpdecker](https://api.github.com/users/kpdecker))
- Force the entry file to always be the first - 6f43c8f
- Avoid multiple exec on router plugin - 21b17ee
- Make stringify loader cachable - 24e3fc5
- Prevent masking errors with css chunk loader - b361873
- Omit moduleChunks if not including the loader - 0e4c8e0

[Commits](https://github.com/walmartlabs/circus/compare/v0.1.0...v0.2.0)

## v0.1.0 - November 24th, 2014
- [#7](https://github.com/walmartlabs/circus/issues/7) - Allow for linking between config permutations ([@kpdecker](https://api.github.com/users/kpdecker))
- Avoid duplicate components in component map - 4db71ea
- Fix invalid export - 33840b9

[Commits](https://github.com/walmartlabs/circus/compare/v0.0.1...v0.1.0)

## v0.0.1 - November 21st, 2014
Initial public release

[Commits](https://github.com/walmartlabs/circus/compare/8a5b7b9...v0.0.1)
