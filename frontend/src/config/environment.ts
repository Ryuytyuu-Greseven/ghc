import { environment as localEnv } from './environment.local';
import { environment as prodEnv } from './environment.prod';

export const environment = (import.meta as any).env?.PROD ? prodEnv : localEnv;
