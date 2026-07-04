export const SKIP_THOUGHT_SIGNATURE_VALIDATOR =
  'skip_thought_signature_validator';

type GeminiFunctionCallPart = {
  functionCall?: unknown;
  thoughtSignature?: string;
  thought_signature?: string;
};

type GeminiContent = {
  parts?: GeminiFunctionCallPart[];
};

type FormatDataResult = {
  contents?: GeminiContent[];
};

function injectThoughtSignatureBypass(
  contents: GeminiContent[] | undefined,
): void {
  if (!contents?.length) return;

  for (const content of contents) {
    if (!content.parts?.length) continue;

    for (const part of content.parts) {
      if (!part.functionCall) continue;
      if (part.thoughtSignature || part.thought_signature) continue;
      part.thoughtSignature = SKIP_THOUGHT_SIGNATURE_VALIDATOR;
    }
  }
}

export function patchConnectionFormatData(connection: {
  formatData: (input: unknown, parameters: unknown) => Promise<unknown>;
}): void {
  const originalFormatData = connection.formatData.bind(connection);

  connection.formatData = async (input, parameters) => {
    const data = (await originalFormatData(
      input,
      parameters,
    )) as FormatDataResult;
    injectThoughtSignatureBypass(data.contents);
    return data;
  };
}
