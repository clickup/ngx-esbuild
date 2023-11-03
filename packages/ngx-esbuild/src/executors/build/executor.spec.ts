import executor from './executor';
import { BuildExecutorSchema } from './schema';

jest.mock('./esbuild/get-esbuild-options', () => {
  return {
    getEsbuildOptions: jest.fn().mockReturnValue({}),
  };
});

jest.mock('esbuild', () => {
  return {
    build: jest.fn(),
    context: jest.fn().mockResolvedValue({
      watch: jest.fn(),
    }),
  };
});

const options: BuildExecutorSchema = {
  buildTarget: 'build',
  serveTarget: 'serve',
  serve: false,
  esbuildTarget: 'es2022',
};

describe('Build Executor', () => {
  it('can run', async () => {
    const output = await executor(options, {
      root: '',
      cwd: '',
      isVerbose: false,
      projectName: 'client',
    }).next();
    expect(output.value.success).toBe(true);
    expect(jest.requireMock('esbuild').build).toHaveBeenCalledWith(
      expect.anything()
    );
  });
});
