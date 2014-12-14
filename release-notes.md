# Release Notes

## Development

[Commits](https://github.com/walmartlabs/circus/compare/v0.2.2...master)

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
