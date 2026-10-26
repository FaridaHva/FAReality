// These packages ship without type declarations.

declare module 'draco3dgltf' {
  const draco3d: {
    createDecoderModule(): Promise<unknown>;
    createEncoderModule(): Promise<unknown>;
  };
  export default draco3d;
}

declare module 'gltf-validator' {
  interface ValidationMessage {
    code: string;
    message: string;
    /** 0 error, 1 warning, 2 info, 3 hint */
    severity: number;
    pointer?: string;
  }
  interface ValidationReport {
    issues: {
      numErrors: number;
      numWarnings: number;
      numInfos: number;
      numHints: number;
      messages: ValidationMessage[];
    };
  }
  const validator: {
    validateBytes(data: Uint8Array, options?: { uri?: string; maxIssues?: number }): Promise<ValidationReport>;
  };
  export default validator;
}
