export interface TiLlrtHostPackageManifest {
  readonly packageName: "@effect-experimental/platform-llrt-host";
  readonly jsEntrypoint: "src/install.ts";
  readonly binaryName: "ti-code-llrt-host";
  readonly tiCodeRuntimeId: "llrt-custom";
  readonly requiredNativeSurfaces: ReadonlyArray<string>;
  readonly piEffectIntegrationPoints: ReadonlyArray<string>;
}

export const TI_LLRT_HOST_PACKAGE_MANIFEST: TiLlrtHostPackageManifest = {
  packageName: "@effect-experimental/platform-llrt-host",
  jsEntrypoint: "src/install.ts",
  binaryName: "ti-code-llrt-host",
  tiCodeRuntimeId: "llrt-custom",
  requiredNativeSurfaces: [
    "stdio.stdin.onData/offData/setRawMode/isTTY",
    "stdio.stdout.write/isTTY/columns/rows",
    "stdio.stderr.write/isTTY/columns/rows",
    "signals.on/off",
    "timer handles with ref/unref or JS timer facade",
    "childProcess.spawn",
  ],
  piEffectIntegrationPoints: [
    "packages/platform-llrt/src/terminal.ts",
    "packages/platform-llrt/src/child-process.ts",
    "packages/platform-llrt/src/host.ts",
    "apps/cli/src/runtime/llrt-cli-entry.ts",
    "apps/cli/src/runtime/probe/capabilities.ts",
  ],
};
