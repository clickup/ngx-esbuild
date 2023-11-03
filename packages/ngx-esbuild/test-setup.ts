import { TextDecoder, TextEncoder } from 'util';

global.TextEncoder = TextEncoder;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - types don't match perfectly but it doesn't cause any actual issues
global.TextDecoder = TextDecoder;
