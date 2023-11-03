import { Schema as BuildSchema } from '@angular-devkit/build-angular/src/builders/browser/schema';
import { Schema as ServeSchema } from '@angular-devkit/build-angular/src/builders/dev-server/schema';
import { ExecutorContext } from '@nx/devkit';

export function getBuildTargetConfig(
  target: string,
  configurationName: string | undefined,
  context: ExecutorContext
) {
  return getTargetConfig<BuildSchema>(target, configurationName, context);
}

export function getServeTargetConfig(
  target: string,
  configurationName: string | undefined,
  context: ExecutorContext
) {
  return getTargetConfig<ServeSchema>(target, configurationName, context);
}

export function getTargetConfig<T>(
  target: string,
  configurationName: string | undefined,
  context: ExecutorContext
): T {
  const config =
    context.workspace?.projects?.[
      context.projectName ?? context.workspace.defaultProject ?? ''
    ]?.targets?.[target];

  const configuration = configurationName ?? config?.defaultConfiguration;

  return {
    ...config?.options,
    ...(configuration ? config?.configurations?.[configuration] : {}),
  };
}
