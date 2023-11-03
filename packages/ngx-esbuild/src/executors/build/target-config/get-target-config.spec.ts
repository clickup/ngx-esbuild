import { ExecutorContext } from '@nx/devkit';

import { getTargetConfig } from './get-target-config';

function getMockContext(options: {
  projectName?: string;
  defaultProject?: string;
  defaultConfiguration?: string;
}): ExecutorContext {
  return {
    projectName: options.projectName,
    workspace: {
      defaultProject: options.defaultProject,
      projects: {
        'my-app': {
          targets: {
            build: {
              defaultConfiguration: options.defaultConfiguration,
              options: {
                outputPath: 'dist/apps/my-app',
              },
              configurations: {
                production: {
                  outputPath: 'dist/apps/my-app-prod',
                },
              },
            },
          },
        },
      },
    } as unknown as ExecutorContext['workspace'],
  } as ExecutorContext;
}

describe('getTargetConfig', () => {
  test('use current project', () => {
    expect(
      getTargetConfig(
        'build',
        undefined,
        getMockContext({
          projectName: 'my-app',
        })
      )
    ).toEqual({
      outputPath: 'dist/apps/my-app',
    });
  });

  test('use default project', () => {
    expect(
      getTargetConfig(
        'build',
        undefined,
        getMockContext({
          defaultProject: 'my-app',
        })
      )
    ).toEqual({
      outputPath: 'dist/apps/my-app',
    });
  });

  test('use default configuration', () => {
    expect(
      getTargetConfig(
        'build',
        undefined,
        getMockContext({
          projectName: 'my-app',
          defaultConfiguration: 'production',
        })
      )
    ).toEqual({
      outputPath: 'dist/apps/my-app-prod',
    });
  });

  test('use build configuration', () => {
    expect(
      getTargetConfig(
        'build',
        'production',
        getMockContext({
          projectName: 'my-app',
        })
      )
    ).toEqual({
      outputPath: 'dist/apps/my-app-prod',
    });
  });
});
