export interface BuildExecutorSchema {
  /**
   * Whether or not to serve the application or just build it.
   *
   * @default false
   */
  serve: boolean;

  /**
   * The build target to read configuration from
   *
   * @default build
   */
  buildTarget: string;

  /**
   * The serve target to read configuration from
   *
   * @default serve
   */
  serveTarget: string;

  /**
   * The name of the configuration to use for either building or serving the application
   */
  configurationName?: string;

  /**
   * Set the JavaScript language version for emitted JavaScript.
   *
   * @default es2022
   */
  esbuildTarget: string;
}
